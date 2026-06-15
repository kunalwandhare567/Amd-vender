"""
analytics_engine.py
====================
SQL-First Analytics Engine for VendorVerse 3.2
Core Rule: "SQL Calculates. AI Explains."

This module performs ALL metric calculations using pure Python arithmetic
derived from database fields (no LLM calls).  It then:
  1. Persists a SupplierMetricsSnapshot (time-series history)
  2. Upserts the SupplierAnalytics row (fast latest-score dashboard reads)
  3. Calculates the Delta + change_type vs the previous snapshot
  4. Conditionally writes/updates SupplierAIMemory (only when delta is
     significant — avoiding wasteful LLM calls on micro-changes)

All existing tables and routes are untouched — this engine is called
as an *additive* side-effect from existing mutation endpoints.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional, Tuple

from sqlmodel import Session, select

from models import (
    Supplier,
    SLAMetric,
    SupplierMetricsSnapshot,
    SupplierAnalytics,
    SupplierAIMemory,
)

# ─── Thresholds ──────────────────────────────────────────────────────────────
# Minimum score delta required to trigger an AI memory update.
# Avoids calling the LLM for noise-level changes (< 2 points).
AI_MEMORY_UPDATE_THRESHOLD = 2.0

# change_type classification boundaries
CRITICAL_DECLINE_THRESHOLD = -10.0
DECLINED_THRESHOLD = 0.0


# ─── Score Calculators (SQL Calculates) ──────────────────────────────────────

def _calc_inventory_score(supplier: Supplier) -> float:
    """
    Inventory health (0-100).
    Drivers: avg_stock_level (target ≥ 50), avg_availability (target = 100).
    """
    stock_score = min(100.0, (supplier.avg_stock_level / 100.0) * 100)
    avail_score = min(100.0, supplier.avg_availability)
    return round((stock_score * 0.5) + (avail_score * 0.5), 2)


def _calc_compliance_score(supplier: Supplier) -> float:
    """
    Compliance health (0-100).
    Drivers: inspection_pass_rate (direct 0-100).
    Penalty: +5 per percentage point of defect_rate above 2%.
    """
    base = supplier.inspection_pass_rate
    excess_defect = max(0.0, supplier.defect_rate - 2.0)
    score = base - (excess_defect * 5.0)
    return round(max(0.0, min(100.0, score)), 2)


def _calc_sla_score(supplier: Supplier, session: Session) -> float:
    """
    SLA health (0-100) derived from SLAMetric rows.
    status=compliant → 100pts, warning → 65pts, breached → 20pts.
    Falls back to lead_time/defect_rate arithmetic when no SLA rows exist.
    """
    sla_rows = session.exec(
        select(SLAMetric).where(SLAMetric.supplier_id == supplier.supplier_id)
    ).all()

    if sla_rows:
        STATUS_SCORE = {"compliant": 100.0, "warning": 65.0, "breached": 20.0}
        scores = [STATUS_SCORE.get(m.status, 65.0) for m in sla_rows]
        return round(sum(scores) / len(scores), 2)

    # Fallback arithmetic (no SLA rows yet)
    lead_hours = supplier.avg_lead_time * 24
    if lead_hours <= 36:
        lead_score = 100.0
    elif lead_hours <= 48:
        lead_score = 65.0
    else:
        lead_score = 20.0

    quality_pass = 100.0 - supplier.defect_rate
    if quality_pass >= 98:
        quality_score = 100.0
    elif quality_pass >= 95:
        quality_score = 65.0
    else:
        quality_score = 20.0

    return round((lead_score * 0.5) + (quality_score * 0.5), 2)


def _calc_cost_score(supplier: Supplier) -> float:
    """
    Cost efficiency (0-100).
    Lower avg_manufacturing_cost relative to avg_price = higher score.
    Capped: if cost > price the supplier is loss-making (score → 0).
    """
    if supplier.avg_price <= 0:
        return 50.0  # guard against division by zero
    ratio = supplier.avg_manufacturing_cost / supplier.avg_price
    # ratio 0 → 100pts, ratio 1 → 0pts, linear
    score = max(0.0, (1.0 - ratio) * 100.0)
    # Add shipping cost penalty (target ≤ $5)
    ship_penalty = max(0.0, (supplier.avg_shipping_cost - 5.0) * 2.0)
    return round(max(0.0, min(100.0, score - ship_penalty)), 2)


def _calc_performance_score(supplier: Supplier) -> float:
    """
    Operational performance (0-100).
    Drivers: OTD %, defect_rate (inverse).
    """
    otd = supplier.otd_percentage or 85.0
    defect_penalty = supplier.defect_rate * 8.0          # 1% defect → -8 pts
    mfg_lead_penalty = max(0.0, (supplier.avg_manufacturing_lead_time - 10) * 1.5)
    score = otd - defect_penalty - mfg_lead_penalty
    return round(max(0.0, min(100.0, score)), 2)


def _calc_overall_score(
    inv: float, comp: float, sla: float, cost: float, perf: float
) -> float:
    """
    Weighted composite (0-100).
    Weights: Performance 30%, SLA 25%, Compliance 20%, Inventory 15%, Cost 10%.
    """
    return round(
        (perf * 0.30)
        + (sla * 0.25)
        + (comp * 0.20)
        + (inv * 0.15)
        + (cost * 0.10),
        2,
    )


# ─── Delta Engine ─────────────────────────────────────────────────────────────

def _classify_change(delta: float) -> str:
    """Improvement 3 — Change Classification Engine."""
    if delta > DECLINED_THRESHOLD:
        return "IMPROVED"
    elif delta <= CRITICAL_DECLINE_THRESHOLD:
        return "CRITICAL_DECLINE"
    elif delta < DECLINED_THRESHOLD:
        return "DECLINED"
    else:
        return "UNCHANGED"


def _get_previous_snapshot(
    session: Session, supplier_id: str
) -> Optional[SupplierMetricsSnapshot]:
    """Return the most recent snapshot before the one we're about to insert."""
    rows = session.exec(
        select(SupplierMetricsSnapshot)
        .where(SupplierMetricsSnapshot.supplier_id == supplier_id)
        .order_by(SupplierMetricsSnapshot.snapshot_date.desc())  # type: ignore[attr-defined]
    ).all()
    return rows[0] if rows else None


# ─── AI Memory Writer ─────────────────────────────────────────────────────────

def _update_ai_memory(
    session: Session,
    supplier: Supplier,
    new_score: float,
    prev_score: Optional[float],
    delta: float,
    change_type: str,
    scores: dict,
) -> None:
    """
    Writes / updates SupplierAIMemory.
    The LLM is only called here if the delta exceeds AI_MEMORY_UPDATE_THRESHOLD.
    If the LLM is unavailable, a high-quality rule-based fallback is used.
    This ensures the summary is ALWAYS grounded in SQL-calculated numbers.
    """
    # Retrieve previous memory (if exists)
    prev_memory = session.exec(
        select(SupplierAIMemory)
        .where(SupplierAIMemory.supplier_id == supplier.supplier_id)
        .where(SupplierAIMemory.report_type == "Performance")
        .order_by(SupplierAIMemory.created_at.desc())  # type: ignore[attr-defined]
    ).first()

    # Skip LLM call if delta is below threshold
    if abs(delta) < AI_MEMORY_UPDATE_THRESHOLD and prev_memory:
        return

    # Build the prompt context (small — this IS the SQL-First advantage)
    delta_summary = (
        f"Score changed by {delta:+.1f} pts ({change_type}). "
        f"Inventory={scores['inventory']:.1f}, Compliance={scores['compliance']:.1f}, "
        f"SLA={scores['sla']:.1f}, Cost={scores['cost']:.1f}, Performance={scores['performance']:.1f}. "
        f"Overall={new_score:.1f}/100."
    )

    prev_context = ""
    if prev_memory:
        prev_context = f"\nPrevious rolling summary: {prev_memory.summary[:400]}"

    new_summary = None
    try:
        from llm import get_llm
        from langchain_core.messages import HumanMessage

        prompt = f"""You are a concise supply chain performance analyst.
Update the rolling performance summary for supplier '{supplier.name}' ({supplier.supplier_id}).

Current metrics snapshot (SQL-calculated, authoritative):
{delta_summary}{prev_context}

Write a 2-sentence rolling executive summary covering current performance state and key trend.
Then list 2 specific, actionable recommendations.

Return ONLY valid JSON:
{{
  "summary": "...",
  "recommendations": ["...", "..."]
}}
Output ONLY valid JSON, no markdown."""

        llm = get_llm(temperature=0.2)
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        parsed = json.loads(content.strip())
        new_summary = parsed.get("summary", "")
        recommendations = json.dumps(parsed.get("recommendations", []))

    except Exception as e:
        print(f"[AnalyticsEngine] LLM unavailable ({e}) — using rule-based memory.")

    if not new_summary:
        # Rule-based fallback — still grounded in SQL numbers
        trend_word = {
            "IMPROVED": "improved",
            "UNCHANGED": "remained stable",
            "DECLINED": "declined",
            "CRITICAL_DECLINE": "critically declined",
        }.get(change_type, "changed")
        new_summary = (
            f"{supplier.name} overall performance has {trend_word} to {new_score:.1f}/100 "
            f"(delta {delta:+.1f}). "
            f"SLA compliance is at {scores['sla']:.1f}/100 "
            f"with inspection pass rate of {supplier.inspection_pass_rate:.1f}%."
        )
        recs = []
        if scores["sla"] < 65:
            recs.append("Escalate SLA breach — schedule supplier review meeting within 48 hours.")
        if supplier.defect_rate > 3.0:
            recs.append(f"Defect rate ({supplier.defect_rate}%) exceeds threshold — trigger root-cause audit.")
        if scores["performance"] < 60:
            recs.append("Performance below baseline — review lead times and OTD with supplier.")
        if not recs:
            recs.append("Monitor current performance trajectory — no immediate action required.")
        recommendations = json.dumps(recs)

    # Upsert memory record
    new_version = (prev_memory.version + 1) if prev_memory else 1
    memory = SupplierAIMemory(
        supplier_id=supplier.supplier_id,
        report_type="Performance",
        summary=new_summary,
        recommendations=recommendations,
        risk_level=supplier.risk_level or "Medium",
        overall_delta=round(delta, 2),
        change_type=change_type,
        version=new_version,
        context_version="v1",
        created_at=datetime.utcnow(),
    )
    session.add(memory)


# ─── PUBLIC API ───────────────────────────────────────────────────────────────

def create_snapshot(
    session: Session,
    supplier: Supplier,
    trigger_event: str = "manual",
) -> SupplierMetricsSnapshot:
    """
    Main entry point.
    Call this from any mutation endpoint that changes supplier performance data.
    It:
      1. Calculates all sub-domain scores (SQL-first, pure arithmetic)
      2. Saves SupplierMetricsSnapshot
      3. Upserts SupplierAnalytics (fast dashboard reads)
      4. Calculates delta vs previous snapshot
      5. Conditionally updates SupplierAIMemory

    Returns the new snapshot object.

    IMPORTANT: This function calls session.flush() but NOT session.commit().
    The caller is responsible for committing the transaction so that snapshot
    creation is atomic with the business mutation that triggered it.
    """
    # ── 1. Calculate all scores (SQL Calculates) ──────────────────────
    inventory_score = _calc_inventory_score(supplier)
    compliance_score = _calc_compliance_score(supplier)
    sla_score = _calc_sla_score(supplier, session)
    cost_score = _calc_cost_score(supplier)
    performance_score = _calc_performance_score(supplier)
    overall_score = _calc_overall_score(
        inventory_score, compliance_score, sla_score, cost_score, performance_score
    )

    scores = {
        "inventory": inventory_score,
        "compliance": compliance_score,
        "sla": sla_score,
        "cost": cost_score,
        "performance": performance_score,
    }

    # ── 2. Get previous snapshot for delta calculation ─────────────────
    prev_snapshot = _get_previous_snapshot(session, supplier.supplier_id)
    prev_score = prev_snapshot.overall_score if prev_snapshot else None

    delta = (overall_score - prev_score) if prev_score is not None else 0.0
    change_type = _classify_change(delta)

    # ── 3. Create time-series snapshot ────────────────────────────────
    snapshot = SupplierMetricsSnapshot(
        supplier_id=supplier.supplier_id,
        inventory_score=inventory_score,
        compliance_score=compliance_score,
        sla_score=sla_score,
        cost_score=cost_score,
        performance_score=performance_score,
        overall_score=overall_score,
        trigger_event=trigger_event,
        snapshot_date=datetime.utcnow(),
    )
    session.add(snapshot)

    # ── 4. Upsert SupplierAnalytics (fast dashboard reads) ────────────
    analytics = session.get(SupplierAnalytics, supplier.supplier_id)
    if analytics:
        analytics.latest_inventory_score = inventory_score
        analytics.latest_compliance_score = compliance_score
        analytics.latest_sla_score = sla_score
        analytics.latest_cost_score = cost_score
        analytics.latest_performance_score = performance_score
        analytics.latest_overall_score = overall_score
        analytics.last_updated = datetime.utcnow()
        session.add(analytics)
    else:
        session.add(
            SupplierAnalytics(
                supplier_id=supplier.supplier_id,
                latest_inventory_score=inventory_score,
                latest_compliance_score=compliance_score,
                latest_sla_score=sla_score,
                latest_cost_score=cost_score,
                latest_performance_score=performance_score,
                latest_overall_score=overall_score,
                last_updated=datetime.utcnow(),
            )
        )

    session.flush()  # assign snapshot_id before memory update

    # ── 5. Conditionally update AI Memory (AI Explains) ───────────────
    _update_ai_memory(
        session=session,
        supplier=supplier,
        new_score=overall_score,
        prev_score=prev_score,
        delta=delta,
        change_type=change_type,
        scores=scores,
    )

    print(
        f"[AnalyticsEngine] snapshot created for {supplier.supplier_id} | "
        f"overall={overall_score:.1f} | delta={delta:+.1f} | {change_type} | trigger={trigger_event}"
    )

    return snapshot


def get_supplier_analytics(
    session: Session, supplier_id: str
) -> Optional[SupplierAnalytics]:
    """Retrieve the fast-read analytics row for a supplier (O(1) lookup)."""
    return session.get(SupplierAnalytics, supplier_id)


def get_latest_memory(
    session: Session, supplier_id: str, report_type: str = "Performance"
) -> Optional[SupplierAIMemory]:
    """Retrieve the most recent AI memory summary for a supplier."""
    return session.exec(
        select(SupplierAIMemory)
        .where(SupplierAIMemory.supplier_id == supplier_id)
        .where(SupplierAIMemory.report_type == report_type)
        .order_by(SupplierAIMemory.created_at.desc())  # type: ignore[attr-defined]
    ).first()


def get_delta(
    session: Session, supplier_id: str
) -> dict:
    """
    Return latest vs previous snapshot comparison with change_type.
    Used by the /analytics/{supplier_id}/delta endpoint.
    """
    rows = session.exec(
        select(SupplierMetricsSnapshot)
        .where(SupplierMetricsSnapshot.supplier_id == supplier_id)
        .order_by(SupplierMetricsSnapshot.snapshot_date.desc())  # type: ignore[attr-defined]
    ).all()

    if not rows:
        return {"error": "No snapshots available for this supplier."}

    curr = rows[0]
    prev = rows[1] if len(rows) > 1 else None

    delta = (curr.overall_score - prev.overall_score) if prev else 0.0
    change_type = _classify_change(delta)

    return {
        "supplier_id": supplier_id,
        "current_snapshot": curr.snapshot_id,
        "current_score": curr.overall_score,
        "previous_score": prev.overall_score if prev else None,
        "delta": round(delta, 2),
        "change_type": change_type,
        "sub_scores": {
            "inventory": {"current": curr.inventory_score, "previous": prev.inventory_score if prev else None},
            "compliance": {"current": curr.compliance_score, "previous": prev.compliance_score if prev else None},
            "sla": {"current": curr.sla_score, "previous": prev.sla_score if prev else None},
            "cost": {"current": curr.cost_score, "previous": prev.cost_score if prev else None},
            "performance": {"current": curr.performance_score, "previous": prev.performance_score if prev else None},
        },
        "trigger_event": curr.trigger_event,
        "snapshot_date": curr.snapshot_date.isoformat(),
    }
