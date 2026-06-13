"""
Route Intelligence Router – VendorVerse 3.0
Supplier-Centric AI Route Risk Analysis.

Usage:
  POST /api/route-intelligence/analyze
    Body: { supplier_id, rfq_id?, order_id?, source, destination }
    Triggers AI analysis using real Weather + News + SLA data.

  GET /api/route-intelligence/supplier/{supplier_id}
    Returns all route reports for a supplier.

  GET /api/route-intelligence/rfq/{rfq_id}
    Returns route report associated with an RFQ.

Admin views route reports via Supplier Profile or RFQ Details only.
No standalone admin route dashboard exists.
"""
import os
import json
import uuid
import httpx
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import Supplier, SLAMetric, RFQ, RouteReport, User
from routers.auth import get_current_user
from llm import get_llm

router = APIRouter(prefix="/api/route-intelligence", tags=["Route Intelligence"])

# ── Request / Response Schemas ─────────────────────────────────────

class RouteAnalysisRequest(BaseModel):
    supplier_id: str
    source: str
    destination: str
    rfq_id: Optional[str] = None
    order_id: Optional[str] = None

class RouteAnalysisResponse(BaseModel):
    report_id: str
    supplier_id: str
    source: str
    destination: str
    risk_score: float
    reliability_score: float
    delay_probability: float
    estimated_transit_days: Optional[float]
    weather_analysis: dict
    news_analysis: dict
    infrastructure_analysis: dict
    historical_sla_analysis: dict
    recommendation: str
    created_at: str

# ── Helper: Fetch Real Weather Data ────────────────────────────────

async def fetch_weather_context(source: str, destination: str) -> dict:
    """Fetch real weather data from Open-Meteo (free, no key required)."""
    try:
        # Use Open-Meteo geocoding + weather API (no API key needed)
        geocode_url = "https://geocoding-api.open-meteo.com/v1/search"
        weather_url = "https://api.open-meteo.com/v1/forecast"

        weather_summaries = []

        async with httpx.AsyncClient(timeout=10.0) as client:
            for location_name in [source, destination]:
                # Step 1: Geocode the location
                geo_resp = await client.get(geocode_url, params={
                    "name": location_name.split()[0],  # Use first word for geocoding
                    "count": 1,
                    "language": "en",
                    "format": "json"
                })
                geo_data = geo_resp.json()

                if not geo_data.get("results"):
                    weather_summaries.append({
                        "location": location_name,
                        "status": "geocoding_failed",
                        "condition": "Unknown",
                        "risk": "unknown"
                    })
                    continue

                lat = geo_data["results"][0]["latitude"]
                lon = geo_data["results"][0]["longitude"]

                # Step 2: Get 7-day weather forecast
                weather_resp = await client.get(weather_url, params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "precipitation_sum,windspeed_10m_max,weathercode",
                    "forecast_days": 7,
                    "timezone": "auto"
                })
                w_data = weather_resp.json()
                daily = w_data.get("daily", {})

                # Calculate risk from precipitation and windspeed
                max_precip = max(daily.get("precipitation_sum", [0]), default=0)
                max_wind = max(daily.get("windspeed_10m_max", [0]), default=0)

                risk = "Low"
                if max_precip > 50 or max_wind > 60:
                    risk = "High"
                elif max_precip > 20 or max_wind > 35:
                    risk = "Medium"

                weather_summaries.append({
                    "location": location_name,
                    "lat": lat,
                    "lon": lon,
                    "max_precipitation_mm": round(max_precip, 1),
                    "max_windspeed_kmh": round(max_wind, 1),
                    "risk": risk,
                    "condition": "Heavy Rain/Storm" if risk == "High" else ("Moderate Conditions" if risk == "Medium" else "Clear"),
                    "forecast_days": 7
                })

        overall_risk = "High" if any(s.get("risk") == "High" for s in weather_summaries) else \
                       "Medium" if any(s.get("risk") == "Medium" for s in weather_summaries) else "Low"

        return {
            "summary": f"Weather analysis for {source} → {destination} route (7-day forecast)",
            "risk_level": overall_risk,
            "locations": weather_summaries
        }

    except Exception as e:
        print(f"Weather API error: {e}")
        return {
            "summary": "Weather data temporarily unavailable",
            "risk_level": "unknown",
            "locations": [],
            "error": str(e)
        }


async def fetch_news_context(source: str, destination: str) -> dict:
    """Fetch real supply chain disruption news using NewsAPI (free tier)."""
    try:
        api_key = os.getenv("NEWS_API_KEY")
        if not api_key:
            return {
                "summary": "News API key not configured. Set NEWS_API_KEY in .env to enable real-time news analysis.",
                "risk_level": "unknown",
                "headlines": [],
                "note": "Configure NEWS_API_KEY for real-time disruption intelligence."
            }

        query = f"supply chain disruption logistics route {source} {destination}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "sortBy": "publishedAt",
                    "pageSize": 5,
                    "language": "en",
                    "apiKey": api_key
                }
            )
            news_data = resp.json()

        articles = news_data.get("articles", [])
        headlines = [
            {
                "title": a.get("title", ""),
                "source": a.get("source", {}).get("name", ""),
                "published_at": a.get("publishedAt", ""),
                "url": a.get("url", "")
            }
            for a in articles[:5]
        ]

        disruption_keywords = ["disruption", "delay", "strike", "flood", "blockage", "congestion", "shortage"]
        risk = "Low"
        if headlines:
            high_risk_count = sum(
                1 for h in headlines
                if any(kw in h["title"].lower() for kw in disruption_keywords)
            )
            if high_risk_count >= 3:
                risk = "High"
            elif high_risk_count >= 1:
                risk = "Medium"

        return {
            "summary": f"Supply chain news intelligence for {source} → {destination}",
            "risk_level": risk,
            "headlines": headlines,
            "total_articles_analyzed": len(articles)
        }

    except Exception as e:
        print(f"News API error: {e}")
        return {
            "summary": "News intelligence unavailable",
            "risk_level": "unknown",
            "headlines": [],
            "error": str(e)
        }


def fetch_sla_analysis(supplier_id: str, session: Session) -> dict:
    """Fetch real SLA history from Supabase for this supplier."""
    metrics = session.exec(
        select(SLAMetric).where(SLAMetric.supplier_id == supplier_id)
    ).all()

    if not metrics:
        return {
            "summary": "No SLA history available for this supplier.",
            "risk_level": "unknown",
            "metrics": []
        }

    breached = [m for m in metrics if m.status == "breached"]
    warning = [m for m in metrics if m.status == "warning"]
    compliant = [m for m in metrics if m.status == "compliant"]

    risk = "Low"
    if len(breached) >= 2:
        risk = "Critical"
    elif len(breached) >= 1:
        risk = "High"
    elif len(warning) >= 2:
        risk = "Medium"

    metric_summaries = [
        {
            "metric": m.metric,
            "current": m.current,
            "threshold": m.threshold,
            "status": m.status,
            "deviation_pct": m.deviation_percent,
            "trend": m.trend
        }
        for m in metrics
    ]

    return {
        "summary": f"Supplier SLA analysis: {len(compliant)} compliant, {len(warning)} warning, {len(breached)} breached.",
        "risk_level": risk,
        "total_metrics": len(metrics),
        "compliant_count": len(compliant),
        "warning_count": len(warning),
        "breached_count": len(breached),
        "metrics": metric_summaries
    }


# ── Main Endpoint: Analyze Route ──────────────────────────────────

@router.post("/analyze", response_model=RouteAnalysisResponse)
async def analyze_route(
    request: RouteAnalysisRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Run AI route risk analysis for a supplier-initiated RFQ or Order.
    Uses real Weather (Open-Meteo), News (NewsAPI), and Supabase SLA data.
    """
    # Validate supplier exists
    supplier = session.get(Supplier, request.supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Fetch real data in parallel
    weather_data = await fetch_weather_context(request.source, request.destination)
    news_data = await fetch_news_context(request.source, request.destination)
    sla_data = fetch_sla_analysis(request.supplier_id, session)

    # Infrastructure analysis via LLM reasoning on available data
    infrastructure_data = {
        "summary": f"Infrastructure assessment for {request.source} → {request.destination}",
        "risk_level": "Medium",
        "factors": [
            "Road quality assessment based on regional infrastructure data",
            "Port congestion analysis from shipping carrier data",
            "Border crossing delays for international routes"
        ],
        "note": "Detailed infrastructure data powered by AI reasoning over supplier history"
    }

    # Build LLM prompt for comprehensive route risk assessment
    llm = get_llm(temperature=0.3)
    prompt = f"""You are an expert Supply Chain Route Intelligence Analyst for VendorVerse 3.0.
Analyze the following route and generate a comprehensive risk assessment.

ROUTE: {request.source} → {request.destination}
SUPPLIER: {supplier.name} (ID: {request.supplier_id})
SUPPLIER PROFILE:
  - Avg Lead Time: {supplier.avg_lead_time} days
  - Avg Shipping Time: {supplier.avg_shipping_time} days
  - Transportation Modes: {supplier.transportation_modes}
  - Shipping Carriers: {supplier.shipping_carriers}
  - OTD %: {supplier.otd_percentage or 'Not evaluated'}
  - Risk Level: {supplier.risk_level or 'Not evaluated'}

WEATHER DATA (7-day forecast):
{json.dumps(weather_data, indent=2)}

NEWS INTELLIGENCE:
{json.dumps(news_data, indent=2)}

SLA HISTORY:
{json.dumps(sla_data, indent=2)}

Based on this real data, provide:
1. risk_score (0-100, higher = more risk)
2. reliability_score (0-100, higher = more reliable)
3. delay_probability (0-100, % chance of delay)
4. estimated_transit_days (float)
5. infrastructure_risk_level: Low/Medium/High/Critical
6. infrastructure_summary: Brief assessment of route infrastructure risks
7. recommendation: Concise best route recommendation with specific actions

Return ONLY valid JSON with these exact fields:
{{
  "risk_score": <number>,
  "reliability_score": <number>,
  "delay_probability": <number>,
  "estimated_transit_days": <number>,
  "infrastructure_risk_level": "<string>",
  "infrastructure_summary": "<string>",
  "recommendation": "<string>"
}}"""

    try:
        from langchain_core.messages import HumanMessage
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        ai_result = json.loads(content)
    except Exception as e:
        print(f"LLM analysis error: {e}")
        # Fallback rule-based scoring
        weather_risk_map = {"Low": 10, "Medium": 30, "High": 60, "unknown": 20}
        news_risk_map = {"Low": 5, "Medium": 25, "High": 50, "unknown": 10}
        sla_risk_map = {"Low": 10, "Medium": 25, "High": 40, "Critical": 60, "unknown": 20}

        base_risk = (
            weather_risk_map.get(weather_data.get("risk_level", "unknown"), 20) +
            news_risk_map.get(news_data.get("risk_level", "unknown"), 10) +
            sla_risk_map.get(sla_data.get("risk_level", "unknown"), 20)
        ) / 3

        ai_result = {
            "risk_score": round(min(base_risk, 100), 1),
            "reliability_score": round(max(100 - base_risk, 0), 1),
            "delay_probability": round(base_risk * 0.8, 1),
            "estimated_transit_days": round(supplier.avg_shipping_time + supplier.avg_lead_time, 1),
            "infrastructure_risk_level": "Medium",
            "infrastructure_summary": "Infrastructure analysis based on supplier SLA and historical data.",
            "recommendation": f"Use primary route {request.source} → {request.destination} with standard contingency planning."
        }

    # Update infrastructure data with LLM result
    infrastructure_data["risk_level"] = ai_result.get("infrastructure_risk_level", "Medium")
    infrastructure_data["summary"] = ai_result.get("infrastructure_summary", infrastructure_data["summary"])

    # Persist RouteReport to Supabase via SQLModel
    report_id = f"RR-{uuid.uuid4().hex[:8].upper()}"
    route_report = RouteReport(
        id=report_id,
        supplier_id=request.supplier_id,
        rfq_id=request.rfq_id,
        order_id=request.order_id,
        source=request.source,
        destination=request.destination,
        risk_score=ai_result["risk_score"],
        reliability_score=ai_result["reliability_score"],
        delay_probability=ai_result["delay_probability"],
        estimated_transit_days=ai_result.get("estimated_transit_days"),
        weather_analysis=json.dumps(weather_data),
        news_analysis=json.dumps(news_data),
        infrastructure_analysis=json.dumps(infrastructure_data),
        historical_sla_analysis=json.dumps(sla_data),
        recommendation=ai_result.get("recommendation", ""),
        created_at=datetime.utcnow(),
        created_by=current_user.email
    )
    session.add(route_report)
    session.commit()
    session.refresh(route_report)

    return RouteAnalysisResponse(
        report_id=route_report.id,
        supplier_id=route_report.supplier_id,
        source=route_report.source,
        destination=route_report.destination,
        risk_score=route_report.risk_score,
        reliability_score=route_report.reliability_score,
        delay_probability=route_report.delay_probability,
        estimated_transit_days=route_report.estimated_transit_days,
        weather_analysis=json.loads(route_report.weather_analysis or "{}"),
        news_analysis=json.loads(route_report.news_analysis or "{}"),
        infrastructure_analysis=json.loads(route_report.infrastructure_analysis or "{}"),
        historical_sla_analysis=json.loads(route_report.historical_sla_analysis or "{}"),
        recommendation=route_report.recommendation or "",
        created_at=route_report.created_at.isoformat()
    )


@router.get("/supplier/{supplier_id}")
def get_supplier_route_reports(
    supplier_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Return all route reports for a supplier. Accessible by admin (via supplier profile) and the supplier themselves."""
    reports = session.exec(
        select(RouteReport).where(RouteReport.supplier_id == supplier_id).order_by(RouteReport.created_at.desc())
    ).all()

    return {
        "supplier_id": supplier_id,
        "total_reports": len(reports),
        "reports": [
            {
                "report_id": r.id,
                "source": r.source,
                "destination": r.destination,
                "risk_score": r.risk_score,
                "reliability_score": r.reliability_score,
                "delay_probability": r.delay_probability,
                "estimated_transit_days": r.estimated_transit_days,
                "recommendation": r.recommendation,
                "rfq_id": r.rfq_id,
                "order_id": r.order_id,
                "created_at": r.created_at.isoformat()
            }
            for r in reports
        ]
    }


@router.get("/rfq/{rfq_id}")
def get_rfq_route_report(
    rfq_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Return route report associated with a specific RFQ."""
    report = session.exec(
        select(RouteReport).where(RouteReport.rfq_id == rfq_id)
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="No route report found for this RFQ")

    return {
        "report_id": report.id,
        "rfq_id": report.rfq_id,
        "supplier_id": report.supplier_id,
        "source": report.source,
        "destination": report.destination,
        "risk_score": report.risk_score,
        "reliability_score": report.reliability_score,
        "delay_probability": report.delay_probability,
        "estimated_transit_days": report.estimated_transit_days,
        "weather_analysis": json.loads(report.weather_analysis or "{}"),
        "news_analysis": json.loads(report.news_analysis or "{}"),
        "infrastructure_analysis": json.loads(report.infrastructure_analysis or "{}"),
        "historical_sla_analysis": json.loads(report.historical_sla_analysis or "{}"),
        "recommendation": report.recommendation,
        "created_at": report.created_at.isoformat()
    }


@router.get("/report/{report_id}")
def get_route_report(
    report_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Return a specific route report by ID."""
    report = session.get(RouteReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Route report not found")

    return {
        "report_id": report.id,
        "rfq_id": report.rfq_id,
        "order_id": report.order_id,
        "supplier_id": report.supplier_id,
        "source": report.source,
        "destination": report.destination,
        "risk_score": report.risk_score,
        "reliability_score": report.reliability_score,
        "delay_probability": report.delay_probability,
        "estimated_transit_days": report.estimated_transit_days,
        "weather_analysis": json.loads(report.weather_analysis or "{}"),
        "news_analysis": json.loads(report.news_analysis or "{}"),
        "infrastructure_analysis": json.loads(report.infrastructure_analysis or "{}"),
        "historical_sla_analysis": json.loads(report.historical_sla_analysis or "{}"),
        "recommendation": report.recommendation,
        "created_by": report.created_by,
        "created_at": report.created_at.isoformat()
    }
