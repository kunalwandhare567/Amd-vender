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
        return {"metrics": saved_metrics}

    except Exception as e:
        print(f"Error in SLA analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))
