from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Supplier, SLAMetric
from llm import get_llm
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from analytics_engine import create_snapshot  # SQL-First: snapshot on SLA sync

router = APIRouter(prefix="/api/sla", tags=["sla"])


class SLAAnalysisResponse(BaseModel):
    metrics: List[SLAMetric]


@router.get("/", response_model=SLAAnalysisResponse)
def get_sla_metrics(session: Session = Depends(get_session)):
    """Get all SLA metrics from the database."""
    metrics = session.exec(select(SLAMetric)).all()
    return {"metrics": metrics}


@router.post("/analyze", response_model=SLAAnalysisResponse)
def analyze_sla(session: Session = Depends(get_session)):
    """Use AI to generate realistic SLA metrics for all suppliers and save to DB."""
    suppliers = session.exec(select(Supplier)).all()

    if not suppliers:
        return {"metrics": []}

    # Build supplier summary for the LLM
    supplier_summaries = []
    for s in suppliers:
        supplier_summaries.append(
            f"- {s.supplier_id} ({s.name}): risk={s.risk_level}, "
            f"OTD={s.otd_percentage}%, defect_rate={s.defect_rate}%, "
            f"inspect_pass={s.inspection_pass_rate}%, "
            f"score={s.overall_score}, location={s.location}"
        )

    suppliers_text = "\n".join(supplier_summaries)

    prompt = f"""You are an SLA compliance analyst. Given the following suppliers, generate SLA metrics for each supplier across 4 metric types: delivery_time, response_time, quality_score, uptime.

Suppliers:
{suppliers_text}

For each supplier, generate 4 SLA metrics. Use these thresholds and targets:
- delivery_time: threshold=48 hours, target=36 hours (lower is better)
- response_time: threshold=4 hours, target=2 hours (lower is better)  
- quality_score: threshold=95%, target=98% (higher is better)
- uptime: threshold=99%, target=99.9% (higher is better)

Base the current values on the supplier's actual performance data (risk level, OTD%, defect rate, score).
- High risk suppliers should have breached or warning metrics
- Medium risk should have mostly warning with some compliant
- Low risk should be mostly compliant

For each metric determine:
- status: "compliant", "warning", or "breached"
- trend: "up", "down", or "stable"
- deviationPercent: percentage deviation from target

Return a JSON object with key "metrics" containing an array of objects with these fields:
id (format: SUPXXX-metric_type), supplier_id (use the accurate ID from list), supplier_name, metric, current (number), threshold (number), target (number), unit, status, deviation_percent (number), trend

Output ONLY valid JSON, no markdown formatting."""

    try:
        llm = get_llm(temperature=0.3)

        message = HumanMessage(content=prompt)
        response = llm.invoke([message])
        content = response.content

        # Clean up markdown formatting if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        data = json.loads(content.strip())
        metrics_data = data.get("metrics", data) if isinstance(data, dict) else data

        # Clear old metrics? Or update? For simplicity, we can clear old ones for these suppliers or valid upsert.
        # Let's clear old to keep it clean.
        for s in suppliers:
             session.exec(select(SLAMetric).where(SLAMetric.supplier_id == s.supplier_id))
             # Actually, delete statement
             # session.exec(delete(SLAMetric).where(SLAMetric.supplier_id == s.supplier_id))
             # SQLModel delete is a bit different, let's just add new ones and maybe they overwrite if ID matches?
             # If IDs match, session.merge() is better.
        
        saved_metrics = []
        for m_data in metrics_data:
            # Map fields if needed (JSON might have camelCase)
            metric = SLAMetric(
                id=m_data.get("id"),
                supplier_id=m_data.get("supplier_id") or m_data.get("supplierId"),
                supplier_name=m_data.get("supplier_name") or m_data.get("supplierName"),
                metric=m_data.get("metric"),
                current=m_data.get("current"),
                threshold=m_data.get("threshold"),
                target=m_data.get("target"),
                unit=m_data.get("unit"),
                status=m_data.get("status"),
                deviation_percent=m_data.get("deviation_percent") or m_data.get("deviationPercent"),
                trend=m_data.get("trend")
            )
            session.merge(metric)
            saved_metrics.append(metric)
            
        session.commit()
        # SQL-First: snapshot every supplier whose SLA metrics were just recalculated
        try:
            for s in suppliers:
                create_snapshot(session, s, trigger_event="sla_sync")
            session.commit()
        except Exception as snap_err:
            print(f"[AnalyticsEngine] SLA snapshot failed (non-fatal): {snap_err}")
        return {"metrics": saved_metrics}

    except Exception as e:
        print(f"Error in SLA analysis: {e}")
        # Run a rule-based fallback calculation to avoid breaking the UI on rate limit
        try:
            saved_metrics = []
            for s in suppliers:
                # 1. delivery_time (OTD dependent, target=36h)
                otd = s.otd_percentage or 90.0
                curr_delivery = round(36.0 * (100.0 / otd), 1)
                metric_del = SLAMetric(
                    id=f"{s.supplier_id}-delivery_time",
                    supplier_id=s.supplier_id,
                    supplier_name=s.name,
                    metric="delivery_time",
                    current=curr_delivery,
                    threshold=48.0,
                    target=36.0,
                    unit="hours",
                    status="compliant" if curr_delivery <= 36.0 else ("warning" if curr_delivery <= 48.0 else "breached"),
                    deviation_percent=round((curr_delivery - 36.0) / 36.0 * 100, 1),
                    trend="stable"
                )
                session.merge(metric_del)
                saved_metrics.append(metric_del)

                # 2. response_time (overall score dependent, target=2h)
                score = s.overall_score or 80.0
                curr_response = round(2.0 * (100.0 / score), 1)
                metric_res = SLAMetric(
                    id=f"{s.supplier_id}-response_time",
                    supplier_id=s.supplier_id,
                    supplier_name=s.name,
                    metric="response_time",
                    current=curr_response,
                    threshold=4.0,
                    target=2.0,
                    unit="hours",
                    status="compliant" if curr_response <= 2.0 else ("warning" if curr_response <= 4.0 else "breached"),
                    deviation_percent=round((curr_response - 2.0) / 2.0 * 100, 1),
                    trend="stable"
                )
                session.merge(metric_res)
                saved_metrics.append(metric_res)

                # 3. quality_score (defect_rate dependent, target=98%)
                quality = round(100.0 - s.defect_rate, 1)
                metric_qty = SLAMetric(
                    id=f"{s.supplier_id}-quality_score",
                    supplier_id=s.supplier_id,
                    supplier_name=s.name,
                    metric="quality_score",
                    current=quality,
                    threshold=95.0,
                    target=98.0,
                    unit="%",
                    status="compliant" if quality >= 98.0 else ("warning" if quality >= 95.0 else "breached"),
                    deviation_percent=round((quality - 98.0) / 98.0 * 100, 1),
                    trend="stable"
                )
                session.merge(metric_qty)
                saved_metrics.append(metric_qty)

                # 4. uptime (default compliant/warning, target=99.9%)
                uptime = 99.9 if s.overall_score and s.overall_score >= 75 else (99.0 if s.overall_score and s.overall_score >= 55 else 98.5)
                metric_up = SLAMetric(
                    id=f"{s.supplier_id}-uptime",
                    supplier_id=s.supplier_id,
                    supplier_name=s.name,
                    metric="uptime",
                    current=uptime,
                    threshold=99.0,
                    target=99.9,
                    unit="%",
                    status="compliant" if uptime >= 99.9 else ("warning" if uptime >= 99.0 else "breached"),
                    deviation_percent=round((uptime - 99.9) / 99.9 * 100, 1),
                    trend="stable"
                )
                session.merge(metric_up)
                saved_metrics.append(metric_up)
            
            session.commit()
            # SQL-First: snapshot after rule-based SLA fallback calculation
            try:
                for s in suppliers:
                    create_snapshot(session, s, trigger_event="sla_sync_fallback")
                session.commit()
            except Exception as snap_err:
                print(f"[AnalyticsEngine] SLA fallback snapshot failed (non-fatal): {snap_err}")
            return {"metrics": saved_metrics}
        except Exception as fallback_err:
            print(f"Fallback SLA calculation failed: {fallback_err}")
            raise HTTPException(status_code=500, detail=str(e))
