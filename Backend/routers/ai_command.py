"""AI Command Center — generates a full supply chain intelligence briefing."""
import os
import json
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from llm import get_llm as get_central_llm
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

from database import get_session
from models import Supplier, Alert

load_dotenv(override=True)

router = APIRouter(prefix="/api/ai-command", tags=["ai-command"])

# Randomized analysis perspectives to ensure fresh responses each time
BRIEFING_ANGLES = [
    "Focus on identifying emerging risks and hidden patterns in the data.",
    "Emphasize operational efficiency gaps and cost optimization opportunities.",
    "Prioritize supplier relationship health and long-term partnership viability.",
    "Analyze from a supply chain resilience and business continuity perspective.",
    "Focus on quality trends and compliance adherence across the supplier base.",
    "Evaluate from a financial risk and spend optimization standpoint.",
    "Assess geographic concentration risks and diversification needs.",
    "Look at delivery reliability trends and their downstream impact.",
]

FORECAST_ANGLES = [
    "Consider seasonal demand fluctuations and market volatility.",
    "Factor in industry-wide supply chain disruption trends.",
    "Weight quality degradation signals more heavily in predictions.",
    "Focus on leading indicators of supplier financial distress.",
    "Consider competitive pressure on supplier pricing and capacity.",
    "Analyze correlation between delivery delays and future quality issues.",
    "Factor in geopolitical risk exposure for each supplier's region.",
    "Consider technology adoption and supplier modernization efforts.",
]

ACTION_ANGLES = [
    "Prioritize quick wins with minimal investment needed.",
    "Focus on strategic long-term improvements over tactical fixes.",
    "Emphasize collaborative actions that strengthen supplier partnerships.",
    "Prioritize risk mitigation and contingency planning.",
    "Focus on data-driven process improvements and automation.",
    "Emphasize cost reduction while maintaining quality standards.",
    "Prioritize building supply chain redundancy and flexibility.",
    "Focus on compliance and regulatory preparedness actions.",
]


def get_llm(temperature=0.8):
    return get_central_llm(temperature=temperature)


def build_supplier_context(suppliers, alerts):
    """Build rich context from live database data."""
    supplier_lines = []
    for s in suppliers:
        supplier_lines.append(
            f"- {s.name} (ID: {s.supplier_id}): score={s.overall_score or 'N/A'}, "
            f"risk={s.risk_level or 'N/A'}, OTD={s.otd_percentage or 'N/A'}%, "
            f"defect_rate={s.defect_rate}%, inspection_pass={s.inspection_pass_rate}%, "
            f"lead_time={s.avg_lead_time}d, ship_time={s.avg_shipping_time}d, "
            f"mfg_lead_time={s.avg_manufacturing_lead_time}d, "
            f"revenue=${s.total_revenue:,.0f}, location={s.location}, "
            f"transport={s.transportation_modes}, carriers={s.shipping_carriers}"
        )

    alert_lines = []
    for a in alerts:
        alert_lines.append(
            f"- [{a.severity}] {a.supplier_name}: {a.message} (status: {a.status})"
        )

    return "\n".join(supplier_lines), "\n".join(alert_lines) if alert_lines else "No active alerts."


def clean_json(content: str) -> dict:
    """Extract JSON from LLM response."""
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]
    return json.loads(content.strip())


@router.post("/briefing")
def generate_briefing(session: Session = Depends(get_session)):
    """Generate AI daily executive briefing."""
    suppliers = session.exec(select(Supplier)).all()
    alerts = session.exec(select(Alert)).all()
    suppliers_text, alerts_text = build_supplier_context(suppliers, alerts)

    angle = random.choice(BRIEFING_ANGLES)
    seed = random.randint(1000, 9999)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    prompt = f"""You are a supply chain intelligence analyst. Generate a UNIQUE daily executive briefing.

ANALYSIS TIMESTAMP: {now} (Session #{seed})
ANALYSIS PERSPECTIVE: {angle}

SUPPLIERS:
{suppliers_text}

ALERTS:
{alerts_text}

Generate a fresh, unique analysis each time. Vary your language, insights, and focus areas.

Return a JSON object with:
- "headline": one-line summary of today's supply chain status (max 15 words, make it unique and insightful)
- "health_score": overall supply chain health score 0-100 (vary based on your analysis perspective)
- "health_trend": "improving", "stable", or "declining"
- "summary": 2-3 sentence executive summary with SPECIFIC data-driven insights (not generic)
- "critical_items": array of 2-3 most urgent items, each with "title" and "description" (vary focus each time)
- "top_performers": array of top 2 suppliers, each with "name" and "reason" (cite specific metrics)
- "at_risk": array of at-risk suppliers, each with "name" and "reason" (cite specific metrics)

Be creative and analytical. Every response should feel like a fresh expert analysis. Output ONLY valid JSON."""

    try:
        llm = get_llm(temperature=0.85)
        response = llm.invoke([HumanMessage(content=prompt)])
        data = clean_json(response.content)
        return data
    except Exception as e:
        print(f"Error generating briefing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk-forecast")
def generate_risk_forecast(session: Session = Depends(get_session)):
    """Generate AI risk predictions for each supplier."""
    suppliers = session.exec(select(Supplier)).all()
    alerts = session.exec(select(Alert)).all()
    suppliers_text, alerts_text = build_supplier_context(suppliers, alerts)

    angle = random.choice(FORECAST_ANGLES)
    seed = random.randint(1000, 9999)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    prompt = f"""You are a supply chain risk prediction specialist. Analyze each supplier and predict their risk trajectory.

FORECAST TIMESTAMP: {now} (Model Run #{seed})
FORECASTING LENS: {angle}

SUPPLIERS:
{suppliers_text}

ALERTS:
{alerts_text}

For EACH supplier, generate a UNIQUE risk forecast. Vary your predictions, confidence levels, and reasoning each time.

Return a JSON object with key "forecasts" containing an array. Each forecast:
- "supplier_id": supplier ID
- "supplier_name": supplier name
- "current_risk": "Low", "Medium", or "High"
- "predicted_risk": predicted risk level in 30 days (can differ from current based on your analysis)
- "confidence": prediction confidence percentage (vary between 55-95 based on data quality)
- "trajectory": "improving", "stable", or "worsening"
- "risk_score": numerical risk score 0-100 (higher = riskier, vary meaningfully)
- "key_factors": array of 2-3 SHORT factors driving the prediction (be specific, cite data)
- "recommendation": one-line recommended action (unique and actionable)

Produce genuinely DIFFERENT analysis each time. Output ONLY valid JSON."""

    try:
        llm = get_llm(temperature=0.85)
        response = llm.invoke([HumanMessage(content=prompt)])
        data = clean_json(response.content)
        return data
    except Exception as e:
        print(f"Error generating risk forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ScenarioRequest(BaseModel):
    scenario: str
    target_supplier: Optional[str] = None


@router.post("/what-if")
def what_if_analysis(request: ScenarioRequest, session: Session = Depends(get_session)):
    """Run a what-if scenario analysis using AI."""
    suppliers = session.exec(select(Supplier)).all()
    alerts = session.exec(select(Alert)).all()
    suppliers_text, alerts_text = build_supplier_context(suppliers, alerts)

    scenario_descriptions = {
        "lose_supplier": f"What if we lose supplier '{request.target_supplier or 'the highest-risk supplier'}' completely?",
        "demand_surge": "What if demand increases by 40% in the next quarter?",
        "quality_crisis": f"What if '{request.target_supplier or 'Gamma Manufacturing'}' has a major quality failure (defect rate triples)?",
        "cost_increase": "What if raw material costs increase by 25% across all suppliers?",
        "geopolitical": "What if trade restrictions impact our Asia Pacific suppliers?",
    }

    scenario_text = scenario_descriptions.get(
        request.scenario, f"What if: {request.scenario}"
    )

    seed = random.randint(1000, 9999)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    prompt = f"""You are a supply chain scenario planning expert. Analyze this what-if scenario with FRESH creative thinking.

SIMULATION ID: {seed} | TIMESTAMP: {now}

SCENARIO: {scenario_text}

CURRENT SUPPLIERS:
{suppliers_text}

ACTIVE ALERTS:
{alerts_text}

Think creatively and produce UNIQUE analysis. Vary severity assessments, financial estimates, and mitigation strategies each time.

Generate a JSON object with:
- "scenario_title": short title for this scenario (unique phrasing each time)
- "severity": "low", "medium", "high", or "critical"
- "probability": estimated probability percentage (10-90, vary based on creative analysis)
- "impact_summary": 2-3 sentence summary of the impact (unique perspective each time)
- "affected_suppliers": array of supplier names that would be affected
- "financial_impact": estimated financial impact string (e.g., "$500K-$1M annual risk", vary the range)
- "supply_chain_disruption": percentage of supply chain affected (0-100)
- "timeline": expected timeframe of impact (be specific)
- "mitigation_steps": array of 4-5 specific mitigation actions, each with "action" (creative and specific), "priority" ("immediate"/"short_term"/"long_term"), and "cost" ("low"/"medium"/"high")
- "alternative_suppliers": array of 2-3 suggested alternative supplier types

Every simulation should feel DIFFERENT. Output ONLY valid JSON."""

    try:
        llm = get_llm(temperature=0.9)
        response = llm.invoke([HumanMessage(content=prompt)])
        data = clean_json(response.content)
        return data
    except Exception as e:
        print(f"Error in what-if analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/smart-actions")
def generate_smart_actions(session: Session = Depends(get_session)):
    """Generate AI-prioritized action recommendations."""
    suppliers = session.exec(select(Supplier)).all()
    alerts = session.exec(select(Alert)).all()
    suppliers_text, alerts_text = build_supplier_context(suppliers, alerts)

    angle = random.choice(ACTION_ANGLES)
    seed = random.randint(1000, 9999)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    prompt = f"""You are a supply chain optimization advisor. Generate FRESH prioritized smart actions.

ACTION PLAN TIMESTAMP: {now} (Plan #{seed})
STRATEGIC FOCUS: {angle}

SUPPLIERS:
{suppliers_text}

ALERTS:
{alerts_text}

Generate exactly 6 UNIQUE actionable recommendations. Each time, vary the actions, priorities, and ROI estimates.

Return JSON with key "actions" containing an array. Each action:
- "id": sequential number 1-6
- "title": action title (max 8 words, creative and specific)
- "description": detailed description (2-3 sentences, unique analysis each time)
- "category": "risk", "cost", "quality", "delivery", "relationship", or "compliance"
- "priority": "critical", "high", "medium"
- "effort": "low", "medium", "high"
- "expected_roi": expected return description (specific, e.g., "15% cost reduction", vary values)
- "target_suppliers": array of supplier names this applies to
- "deadline": suggested deadline (e.g., "Within 2 weeks", vary timeframes)

Rank from most to least urgent. Be CREATIVE and produce DIFFERENT actions each time. Output ONLY valid JSON."""

    try:
        llm = get_llm(temperature=0.85)
        response = llm.invoke([HumanMessage(content=prompt)])
        data = clean_json(response.content)
        return data
    except Exception as e:
        print(f"Error generating smart actions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
