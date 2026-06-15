"""
routers/analytics.py
=====================
SQL-First Analytics Endpoints for VendorVerse 3.2

Provides read-only endpoints that expose the calculated metrics from:
  - supplier_analytics  (fast latest-score dashboard reads)
  - supplier_metrics_snapshot  (time-series history)
  - supplier_ai_memory  (compressed rolling AI summaries)

No existing routes are modified. These are purely additive.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import (
    Supplier,
    SupplierAnalytics,
    SupplierMetricsSnapshot,
    SupplierAIMemory,
)
from analytics_engine import (
    create_snapshot,
    get_supplier_analytics,
    get_latest_memory,
    get_delta,
)
import json

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ─── Dashboard: All Suppliers (O(1) per supplier) ────────────────────────────

@router.get("/suppliers", response_model=dict)
def get_all_analytics(session: Session = Depends(get_session)):
    """
    Returns the latest SQL-calculated scores for ALL suppliers.
    Reads from supplier_analytics (single row per supplier, fast lookup).
    """
    rows = session.exec(select(SupplierAnalytics)).all()
    return {
        "success": True,
        "count": len(rows),
        "data": [r.model_dump() for r in rows],
    }


# ─── Single Supplier Analytics ────────────────────────────────────────────────

@router.get("/{supplier_id}", response_model=dict)
def get_supplier_analytic(supplier_id: str, session: Session = Depends(get_session)):
    """
    Returns the latest SQL-calculated scores for one supplier.
    Includes the AI memory summary if available.
    """
    analytics = get_supplier_analytics(session, supplier_id)
    if not analytics:
        raise HTTPException(
            status_code=404,
            detail="No analytics found for this supplier. Trigger a QC upload or SLA sync first.",
        )

    memory = get_latest_memory(session, supplier_id)
    memory_payload = None
    if memory:
        memory_payload = {
            "summary": memory.summary,
            "recommendations": json.loads(memory.recommendations or "[]"),
            "risk_level": memory.risk_level,
            "change_type": memory.change_type,
            "overall_delta": memory.overall_delta,
            "version": memory.version,
            "context_version": memory.context_version,
            "created_at": memory.created_at.isoformat(),
        }

    return {
        "success": True,
        "data": {
            "analytics": analytics.model_dump(),
            "ai_memory": memory_payload,
        },
    }


# ─── Delta Engine ─────────────────────────────────────────────────────────────

@router.get("/{supplier_id}/delta", response_model=dict)
def get_supplier_delta(supplier_id: str, session: Session = Depends(get_session)):
    """
    Returns the delta between the latest and previous snapshot.
    Includes change_type classification: IMPROVED | UNCHANGED | DECLINED | CRITICAL_DECLINE
    """
    result = get_delta(session, supplier_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return {"success": True, "data": result}


# ─── Snapshot History ─────────────────────────────────────────────────────────

@router.get("/{supplier_id}/snapshots", response_model=dict)
def get_snapshots(
    supplier_id: str,
    limit: int = 30,
    session: Session = Depends(get_session),
):
    """
    Returns up to `limit` most-recent snapshots for a supplier (time-series).
    Useful for trend charts.
    """
    rows = session.exec(
        select(SupplierMetricsSnapshot)
        .where(SupplierMetricsSnapshot.supplier_id == supplier_id)
        .order_by(SupplierMetricsSnapshot.snapshot_date.desc())  # type: ignore[attr-defined]
    ).all()[:limit]

    return {
        "success": True,
        "supplier_id": supplier_id,
        "count": len(rows),
        "data": [r.model_dump() for r in rows],
    }


# ─── AI Memory History ─────────────────────────────────────────────────────────

@router.get("/{supplier_id}/memory", response_model=dict)
def get_ai_memory_history(
    supplier_id: str,
    limit: int = 10,
    session: Session = Depends(get_session),
):
    """
    Returns the rolling AI memory log for a supplier.
    Each entry is a compressed executive summary generated after a significant delta.
    """
    rows = session.exec(
        select(SupplierAIMemory)
        .where(SupplierAIMemory.supplier_id == supplier_id)
        .order_by(SupplierAIMemory.created_at.desc())  # type: ignore[attr-defined]
    ).all()[:limit]

    return {
        "success": True,
        "supplier_id": supplier_id,
        "count": len(rows),
        "data": [
            {
                "memory_id": r.memory_id,
                "report_type": r.report_type,
                "summary": r.summary,
                "recommendations": json.loads(r.recommendations or "[]"),
                "risk_level": r.risk_level,
                "change_type": r.change_type,
                "overall_delta": r.overall_delta,
                "version": r.version,
                "context_version": r.context_version,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


# ─── Manual Snapshot Trigger (Admin / Debug Use) ─────────────────────────────

@router.post("/{supplier_id}/snapshot", response_model=dict)
def force_snapshot(supplier_id: str, session: Session = Depends(get_session)):
    """
    Manually triggers a snapshot for a supplier.
    Use for initial data seeding or backfill after migration.
    Normal operation: snapshots are auto-created by mutation triggers.
    """
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    snapshot = create_snapshot(session, supplier, trigger_event="manual")
    session.commit()
    session.refresh(snapshot)

    return {
        "success": True,
        "message": f"Snapshot created for {supplier.name}",
        "snapshot_id": snapshot.snapshot_id,
        "overall_score": snapshot.overall_score,
        "trigger_event": snapshot.trigger_event,
    }


# ─── Bulk Snapshot (Seed All Suppliers) ──────────────────────────────────────

@router.post("/snapshot/all", response_model=dict)
def snapshot_all_suppliers(session: Session = Depends(get_session)):
    """
    Creates an initial snapshot for every supplier that has no analytics row yet.
    Run once after deploying the SQL-First architecture to backfill history.
    """
    suppliers = session.exec(select(Supplier)).all()
    created = []
    skipped = []

    for supplier in suppliers:
        existing = get_supplier_analytics(session, supplier.supplier_id)
        snapshot = create_snapshot(session, supplier, trigger_event="bulk_seed")
        if existing:
            skipped.append(supplier.supplier_id)
        else:
            created.append(supplier.supplier_id)

    session.commit()

    return {
        "success": True,
        "message": f"Processed {len(suppliers)} suppliers.",
        "snapshots_created": len(suppliers),
        "first_time_seeds": created,
        "refreshed": skipped,
    }
