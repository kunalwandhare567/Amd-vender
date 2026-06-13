"""
VendorVerse 3.0 – Shared Agent Tools
Reusable database query functions shared across all agents.
"""
import json
from typing import Optional
from sqlmodel import Session, select

from database import engine
from models import Supplier, Alert, SLAMetric, RFQ


def get_all_suppliers() -> list:
    """Fetch all suppliers from Supabase."""
    with Session(engine) as session:
        return session.exec(select(Supplier)).all()


def get_supplier_by_id(supplier_id: str) -> Optional[Supplier]:
    """Fetch a single supplier by ID."""
    with Session(engine) as session:
        return session.get(Supplier, supplier_id)


def get_active_alerts(supplier_id: Optional[str] = None) -> list:
    """Fetch active alerts, optionally filtered by supplier."""
    with Session(engine) as session:
        stmt = select(Alert).where(Alert.status != "Resolved")
        if supplier_id:
            stmt = stmt.where(Alert.supplier_id == supplier_id)
        return session.exec(stmt).all()


def get_sla_metrics(supplier_id: Optional[str] = None) -> list:
    """Fetch SLA metrics, optionally filtered by supplier."""
    with Session(engine) as session:
        stmt = select(SLAMetric)
        if supplier_id:
            stmt = stmt.where(SLAMetric.supplier_id == supplier_id)
        return session.exec(stmt).all()


def get_open_rfqs() -> list:
    """Fetch all open RFQs (Draft, Sent)."""
    with Session(engine) as session:
        return session.exec(
            select(RFQ).where(RFQ.status.in_(["Draft", "Sent"]))
        ).all()


def format_supplier_brief(s: Supplier) -> str:
    """Format a supplier object into a compact text representation for LLM prompts."""
    return (
        f"[{s.supplier_id}] {s.name} | "
        f"Score: {s.overall_score or 'N/A'} | Risk: {s.risk_level or 'N/A'} | "
        f"OTD: {s.otd_percentage or 'N/A'}% | Defect: {s.defect_rate}% | "
        f"Lead: {s.avg_lead_time}d | Ship: {s.avg_shipping_time}d | "
        f"Revenue: ${s.total_revenue:,.0f} | Location: {s.location} | "
        f"Products: {s.product_types}"
    )


def format_suppliers_context(suppliers: list) -> str:
    """Format multiple suppliers into context string."""
    return "\n".join(format_supplier_brief(s) for s in suppliers)


def format_alerts_context(alerts: list) -> str:
    """Format alerts into context string."""
    if not alerts:
        return "No active alerts."
    return "\n".join(
        f"[{a.severity}] {a.supplier_name} ({a.supplier_id}): {a.message} | Status: {a.status}"
        for a in alerts
    )


def format_sla_context(metrics: list) -> str:
    """Format SLA metrics into context string."""
    if not metrics:
        return "No SLA metrics available."
    return "\n".join(
        f"{m.supplier_name} ({m.metric}): current={m.current}{m.unit}, threshold={m.threshold}{m.unit}, "
        f"status={m.status}, deviation={m.deviation_percent:.1f}%, trend={m.trend}"
        for m in metrics
    )


def find_alternative_suppliers(
    product_types: str,
    exclude_supplier_id: str,
    max_count: int = 5
) -> list:
    """
    Find alternative suppliers offering similar product types, excluding a specific supplier.
    Sorts by overall_score descending.
    """
    suppliers = get_all_suppliers()
    target_products = set(json.loads(product_types)) if product_types.startswith("[") else {product_types}

    alternatives = []
    for s in suppliers:
        if s.supplier_id == exclude_supplier_id:
            continue
        try:
            s_products = set(json.loads(s.product_types))
        except Exception:
            s_products = {s.product_types}

        if target_products & s_products:  # intersection — overlapping product types
            alternatives.append(s)

    # Sort by score descending, then by lowest risk
    risk_order = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
    alternatives.sort(
        key=lambda s: (
            -(s.overall_score or 0),
            risk_order.get(s.risk_level or "High", 2)
        )
    )
    return alternatives[:max_count]
