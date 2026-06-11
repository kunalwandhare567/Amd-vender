from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Supplier, Alert, Intervention
from llm import get_llm
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import uuid

router = APIRouter(prefix="/api/interventions", tags=["interventions"])

class ActionSchema(BaseModel):
    id: str
    name: str
    type: str
    status: str
    automated: bool

class InterventionImpactSchema(BaseModel):
    risk_reduction: float
    cost_savings: float
    performance_improvement: float

class InterventionSchema(BaseModel):
    id: str
    type: str
    category: str
    priority: str
    title: str
    description: str
    targetSuppliers: List[str]
    actions: List[ActionSchema]
    status: str
    impact: InterventionImpactSchema
    estimatedDuration: str

class InterventionsResponse(BaseModel):
    interventions: List[InterventionSchema]

@router.get("/", response_model=InterventionsResponse)
def get_interventions(session: Session = Depends(get_session)):
    """Get all interventions from the database. Auto-generates from AI if the table is empty."""
    db_interventions = session.exec(select(Intervention)).all()

    # If DB has no interventions, auto-generate from supplier data
    if not db_interventions:
        print("No interventions in DB — auto-generating from supplier data...")
        suppliers = session.exec(select(Supplier)).all()
        alerts = session.exec(select(Alert)).all()

        if suppliers:
            supplier_summaries = []
            for s in suppliers:
                supplier_summaries.append(
                    f"- {s.name}: risk={s.risk_level}, score={s.overall_score}, "
                    f"OTD={s.otd_percentage}%, defect={s.defect_rate}%, "
                    f"inspection_pass={s.inspection_pass_rate}%, lead_time={s.avg_lead_time}d, "
                    f"revenue=${s.total_revenue:,.0f}, location={s.location}"
                )
            alert_summaries = [
                f"- [{a.severity}] {a.supplier_name}: {a.message} (status: {a.status})"
                for a in alerts
            ]
            suppliers_text = "\n".join(supplier_summaries)
            alerts_text = "\n".join(alert_summaries) if alert_summaries else "No active alerts."

            prompt = f"""You are a supply chain strategy advisor. Based on the following supplier data and alerts, generate 5 strategic interventions.

SUPPLIERS:
{suppliers_text}

ACTIVE ALERTS:
{alerts_text}

Generate interventions covering these categories (at least one each):
1. risk_mitigation - for high-risk or Critical suppliers
2. performance_boost - for underperforming suppliers
3. cost_optimization - spending optimization opportunities
4. relationship_building - for top performers

Each intervention must have:
- id: unique string (int-001, int-002, etc.)
- type: "automated", "manual", or "ai_suggested"
- category: one of the 4 categories above
- priority: "critical", "high", "medium", or "low"
- title: clear action title
- description: detailed description referencing specific supplier names and real data points
- targetSuppliers: list of supplier names this applies to
- actions: list of 3-4 specific actions, each with:
  - id (a1, a2, ...), name, type (email/meeting/audit/contract_review/payment_terms/training), status ("pending"), automated (bool)
- status: "pending" or "in_progress"
- impact: object with risk_reduction (0-40), cost_savings (dollar amount 10000-200000), performance_improvement (0-30)
- estimatedDuration: time estimate string (e.g. "2 weeks", "1 month")

Return a JSON object with key "interventions" containing the array.
Output ONLY valid JSON, no markdown."""

            try:
                llm = get_llm(temperature=0.4)
                response = llm.invoke([HumanMessage(content=prompt)])
                content = response.content
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]

                data = json.loads(content.strip())
                interventions_data = data.get("interventions", data) if isinstance(data, dict) else data

                for i_data in interventions_data:
                    intervention = Intervention(
                        id=i_data.get("id") or f"int-{uuid.uuid4().hex[:8]}",
                        type=i_data.get("type", "ai_suggested"),
                        category=i_data.get("category", "risk_mitigation"),
                        priority=i_data.get("priority", "medium"),
                        title=i_data.get("title", ""),
                        description=i_data.get("description", ""),
                        target_suppliers=json.dumps(i_data.get("targetSuppliers", [])),
                        actions=json.dumps(i_data.get("actions", [])),
                        status=i_data.get("status", "pending"),
                        impact_risk_reduction=i_data.get("impact", {}).get("risk_reduction", 0),
                        impact_cost_savings=i_data.get("impact", {}).get("cost_savings", 0),
                        impact_performance_improvement=i_data.get("impact", {}).get("performance_improvement", 0),
                        estimated_duration=i_data.get("estimatedDuration", "2 weeks"),
                    )
                    session.merge(intervention)
                session.commit()
                db_interventions = session.exec(select(Intervention)).all()
                print(f"Auto-generated {len(db_interventions)} interventions from AI.")

            except Exception as e:
                print(f"Auto-generation of interventions failed: {e}")

    # Map DB rows → response schema
    response_interventions = []
    for i in db_interventions:
        try:
            response_interventions.append(
                InterventionSchema(
                    id=i.id,
                    type=i.type,
                    category=i.category,
                    priority=i.priority,
                    title=i.title,
                    description=i.description,
                    targetSuppliers=json.loads(i.target_suppliers),
                    actions=json.loads(i.actions),
                    status=i.status,
                    impact=InterventionImpactSchema(
                        risk_reduction=i.impact_risk_reduction,
                        cost_savings=i.impact_cost_savings,
                        performance_improvement=i.impact_performance_improvement,
                    ),
                    estimatedDuration=i.estimated_duration,
                )
            )
        except Exception as e:
            print(f"Error parsing intervention {i.id}: {e}")

    return {"interventions": response_interventions}



@router.post("/generate", response_model=InterventionsResponse)
def generate_interventions(session: Session = Depends(get_session)):
    """Use AI to generate strategic interventions based on supplier data and alerts."""
    suppliers = session.exec(select(Supplier)).all()
    alerts = session.exec(select(Alert)).all()

    if not suppliers:
        return {"interventions": []}

    # Build context for the LLM
    supplier_summaries = []
    for s in suppliers:
        supplier_summaries.append(
            f"- {s.name}: risk={s.risk_level}, score={s.overall_score}, "
            f"OTD={s.otd_percentage}%, defect={s.defect_rate}%, "
            f"inspection_pass={s.inspection_pass_rate}%, lead_time={s.avg_lead_time}d, "
            f"revenue=${s.total_revenue:,.0f}, location={s.location}"
        )

    alert_summaries = []
    for a in alerts:
        alert_summaries.append(
            f"- [{a.severity}] {a.supplier_name}: {a.message} (status: {a.status})"
        )

    suppliers_text = "\n".join(supplier_summaries)
    alerts_text = "\n".join(alert_summaries) if alert_summaries else "No active alerts."

    prompt = f"""You are a supply chain strategy advisor. Based on the following supplier data and alerts, generate 4-5 strategic interventions.

SUPPLIERS:
{suppliers_text}

ACTIVE ALERTS:
{alerts_text}

Generate interventions covering these categories:
1. risk_mitigation - for high-risk suppliers
2. performance_boost - for underperforming suppliers
3. cost_optimization - spending optimization opportunities
4. relationship_building - for top performers

Each intervention should have:
- id: unique string (int-001, int-002, etc.)
- type: "automated", "manual", or "ai_suggested"
- category: one of the categories above
- priority: "critical", "high", "medium", or "low"
- title: clear action title
- description: detailed description referencing specific suppliers and data
- targetSuppliers: list of supplier names this applies to
- actions: list of 3-4 specific actions, each with:
  - id (a1, a2, etc.), name, type (email/meeting/audit/contract_review/payment_terms/training), status (pending/executing/completed), automated (bool)
- status: "pending" or "in_progress"
- impact: object with risk_reduction (0-100), cost_savings (dollar amount), performance_improvement (0-100)
- estimatedDuration: time estimate string

Return a JSON object with key "interventions" containing the array.
Output ONLY valid JSON, no markdown."""

    try:
        llm = get_llm(temperature=0.4)

        message = HumanMessage(content=prompt)
        response = llm.invoke([message])
        content = response.content

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        data = json.loads(content.strip())
        interventions_data = data.get("interventions", data) if isinstance(data, dict) else data

        # Save to DB
        saved_interventions = []
        for i_data in interventions_data:
            intervention = Intervention(
                id=i_data.get("id") or f"int-{uuid.uuid4().hex[:8]}",
                type=i_data.get("type"),
                category=i_data.get("category"),
                priority=i_data.get("priority"),
                title=i_data.get("title"),
                description=i_data.get("description"),
                target_suppliers=json.dumps(i_data.get("targetSuppliers")),
                actions=json.dumps(i_data.get("actions")),
                status=i_data.get("status"),
                impact_risk_reduction=i_data.get("impact", {}).get("risk_reduction", 0),
                impact_cost_savings=i_data.get("impact", {}).get("cost_savings", 0),
                impact_performance_improvement=i_data.get("impact", {}).get("performance_improvement", 0),
                estimated_duration=i_data.get("estimatedDuration")
            )
            session.merge(intervention)
            
            # Add to response list
            saved_interventions.append(
                InterventionSchema(
                    id=intervention.id,
                    type=intervention.type,
                    category=intervention.category,
                    priority=intervention.priority,
                    title=intervention.title,
                    description=intervention.description,
                    targetSuppliers=i_data.get("targetSuppliers"),
                    actions=i_data.get("actions"),
                    status=intervention.status,
                    impact=InterventionImpactSchema(
                         risk_reduction=intervention.impact_risk_reduction,
                         cost_savings=intervention.impact_cost_savings,
                         performance_improvement=intervention.impact_performance_improvement
                    ),
                    estimatedDuration=intervention.estimated_duration
                )
            )
            
        session.commit()
        return {"interventions": saved_interventions}

    except Exception as e:
        print(f"Error generating interventions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
