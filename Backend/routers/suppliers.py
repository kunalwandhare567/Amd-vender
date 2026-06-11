from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel
from database import get_session
from models import Supplier
from datetime import datetime
import json
import os
import uuid


router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


# ── Request models for Add Supplier ──────────────────────────────────
class ProductRow(BaseModel):
    product_type: str = "skincare"
    sku: str = "SKU-001"
    price: float = 50.0
    availability: float = 80.0
    number_sold: int = 500
    revenue: float = 25000.0
    customer_demographics: str = "Female"
    stock_level: float = 60.0
    lead_time: float = 15.0
    order_quantity: int = 500
    shipping_time: float = 5.0
    shipping_cost: float = 6.0
    shipping_carrier: str = "Carrier A"
    production_volume: int = 800
    manufacturing_lead_time: float = 12.0
    manufacturing_cost: float = 30.0
    defect_rate: float = 2.0
    transportation_mode: str = "Road"
    route: str = "Route A"
    inspection_result: str = "Pass"  # Pass | Fail | Pending


class AddSupplierRequest(BaseModel):
    name: str
    location: str
    products: List[ProductRow]

@router.get("/", response_model=dict)
def get_suppliers(
    session: Session = Depends(get_session),
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    sortBy: Optional[str] = None,
    sortOrder: Optional[str] = "asc",
    riskLevel: Optional[str] = None,
    location: Optional[str] = None,
):
    query = select(Supplier)

    if search:
        query = query.where(
            (Supplier.name.contains(search)) |
            (Supplier.location.contains(search)) |
            (Supplier.supplier_id.contains(search))
        )
    
    if riskLevel:
        query = query.where(Supplier.risk_level == riskLevel)
    
    if location:
        query = query.where(Supplier.location.contains(location))

    # Sorting
    if sortBy:
        field = getattr(Supplier, sortBy, None)
        if field:
            if sortOrder == "desc":
                query = query.order_by(field.desc())
            else:
                query = query.order_by(field.asc())

    # Pagination
    offset = (page - 1) * limit
    suppliers = session.exec(query.offset(offset).limit(limit)).all()
    
    # Total count
    total_items = len(session.exec(query).all())
    total_pages = (total_items + limit - 1) // limit

    return {
        "success": True,
        "data": {
            "suppliers": suppliers,
            "pagination": {
                "currentPage": page,
                "totalPages": total_pages,
                "totalItems": total_items,
                "itemsPerPage": limit
            }
        }
    }

@router.get("/{supplier_id}", response_model=dict)
def get_supplier(supplier_id: str, session: Session = Depends(get_session)):
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"success": True, "data": supplier}

@router.get("/{supplier_id}/summary", response_model=dict)
def get_supplier_summary(supplier_id: str, session: Session = Depends(get_session)):
    """Generate an AI performance summary for a supplier."""
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    prompt = f"""You are a supply chain performance analyst. Generate a concise performance summary for this supplier:
    Name: {supplier.name}
    Location: {supplier.location}
    Product Types: {supplier.product_types}
    Overall Score: {supplier.overall_score or 'Not evaluated'}
    Risk Level: {supplier.risk_level or 'Not evaluated'}
    On-Time Delivery: {supplier.otd_percentage or 'Not evaluated'}%
    Defect Rate: {supplier.defect_rate}%
    Inspection Pass Rate: {supplier.inspection_pass_rate}%
    Avg Lead Time: {supplier.avg_lead_time} days
    Avg Shipping Time: {supplier.avg_shipping_time} days
    Avg Shipping Cost: ${supplier.avg_shipping_cost}
    Avg Manufacturing Cost: ${supplier.avg_manufacturing_cost}
    Avg Manufacturing Lead Time: {supplier.avg_manufacturing_lead_time} days
    Total Revenue: ${supplier.total_revenue}
    Total Products Sold: {supplier.total_products_sold}
    Production Volume: {supplier.total_production_volume}
    Avg Availability: {supplier.avg_availability}
    Transportation Modes: {supplier.transportation_modes}
    Shipping Carriers: {supplier.shipping_carriers}
    Routes: {supplier.routes}
    Avg Total Cost: ${supplier.avg_total_cost}
    Number of SKUs: {supplier.num_skus}

    Return a JSON object with:
    - summary_text: 2-3 sentence executive summary
    - key_insights: array of 4 specific data-driven insights
    - risk_flags: array of 2-3 risk flags or concerns
    - data_sources_used: array of data source names used

    Output ONLY valid JSON, no markdown formatting."""

    try:
        from llm import get_llm
        from langchain_core.messages import HumanMessage
        import os
        import json

        llm = get_llm(temperature=0.3)

        message = HumanMessage(content=prompt)
        response = llm.invoke([message])
        content = response.content

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        data = json.loads(content.strip())

        return {
            "success": True,
            "data": {
                "supplier_id": supplier.supplier_id,
                "summary_text": data.get("summary_text", ""),
                "key_insights": data.get("key_insights", []),
                "risk_flags": data.get("risk_flags", []),
                "data_sources_used": data.get("data_sources_used", ["Database"]),
                "generated_date": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        print(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{supplier_id}/report", response_model=dict)
def generate_report(supplier_id: str, session: Session = Depends(get_session)):
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    prompt = f"""
    Generate a concise risk assessment report for the following supplier:
    Name: {supplier.name}
    Location: {supplier.location}
    Product Types: {supplier.product_types}
    Overall Score: {supplier.overall_score}
    Risk Level: {supplier.risk_level}
    OTD Percentage: {supplier.otd_percentage}%
    Defect Rate: {supplier.defect_rate}%
    Inspection Pass Rate: {supplier.inspection_pass_rate}%
    Avg Lead Time: {supplier.avg_lead_time} days
    Avg Shipping Time: {supplier.avg_shipping_time} days
    Avg Manufacturing Cost: ${supplier.avg_manufacturing_cost}
    Total Revenue: ${supplier.total_revenue}
    
    The report should include:
    1. Executive Summary
    2. Key Risks
    3. Recommendations
    
    Format the output as a JSON object with keys: summary_text, key_insights (list), risk_flags (list), data_sources_used (list).
    Do NOT return markdown code blocks, just the JSON string.
    """

    try:
        from llm import get_llm
        from langchain_core.messages import HumanMessage
        import os
        import json
        
        llm = get_llm()
        
        message = HumanMessage(content=prompt)
        response = llm.invoke([message])
        
        content = response.content
        
        try:
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            data = json.loads(content.strip())
            
            report_content = data.get("summary_text", "Summary not generated.")
            key_insights = data.get("key_insights", [])
            risk_flags = data.get("risk_flags", [])
            data_sources_used = data.get("data_sources_used", ["Database"])
            
        except json.JSONDecodeError:
            report_content = content
            key_insights = ["Could not parse structured insights."]
            risk_flags = ["Could not parse structured risks."]
            data_sources_used = ["Database"]

    except Exception as e:
        report_content = f"Error generating report: {str(e)}"
        key_insights = []
        risk_flags = []
        data_sources_used = []

    return {
        "success": True,
        "data": {
            "supplier_id": supplier.supplier_id,
            "summary_text": report_content,
            "key_insights": key_insights,
            "risk_flags": risk_flags,
            "data_sources_used": data_sources_used,
            "generated_date": datetime.utcnow().isoformat()
        }
    }


# ── POST: Add a new supplier from product rows ──────────────────────
@router.post("/", response_model=dict)
def add_supplier(body: AddSupplierRequest, session: Session = Depends(get_session)):
    """Accept raw product rows, aggregate into supplier metrics, AI-evaluate, and save."""
    products = body.products
    if not products:
        raise HTTPException(status_code=400, detail="At least one product row is required")

    # ── 1. Aggregate product rows into supplier-level metrics ────────
    n = len(products)
    unique_skus = set()
    product_types = set()
    shipping_carriers = set()
    transportation_modes = set()
    routes = set()
    customer_demographics = set()
    inspections_pass = 0
    inspections_total = 0

    sum_price = sum_availability = sum_stock = sum_lead = 0.0
    sum_ship_time = sum_ship_cost = sum_mfg_lead = sum_mfg_cost = sum_defect = 0.0
    total_sold = total_revenue = total_order_qty = total_prod_vol = 0

    for p in products:
        unique_skus.add(p.sku)
        product_types.add(p.product_type)
        shipping_carriers.add(p.shipping_carrier)
        transportation_modes.add(p.transportation_mode)
        routes.add(p.route)
        customer_demographics.add(p.customer_demographics)

        sum_price += p.price
        sum_availability += p.availability
        sum_stock += p.stock_level
        sum_lead += p.lead_time
        sum_ship_time += p.shipping_time
        sum_ship_cost += p.shipping_cost
        sum_mfg_lead += p.manufacturing_lead_time
        sum_mfg_cost += p.manufacturing_cost
        sum_defect += p.defect_rate

        total_sold += p.number_sold
        total_revenue += p.revenue
        total_order_qty += p.order_quantity
        total_prod_vol += p.production_volume

        if p.inspection_result in ("Pass", "Fail"):
            inspections_total += 1
            if p.inspection_result == "Pass":
                inspections_pass += 1

    # Generate unique supplier id
    existing_count = len(session.exec(select(Supplier)).all())
    supplier_id = f"SUP-{existing_count + 1:03d}"

    avg_total_cost = round((sum_mfg_cost / n) + (sum_ship_cost / n), 2)
    inspection_pass_rate = round((inspections_pass / inspections_total * 100) if inspections_total > 0 else 50.0, 1)

    supplier = Supplier(
        supplier_id=supplier_id,
        name=body.name,
        location=body.location,
        product_types=json.dumps(sorted(product_types)),
        avg_price=round(sum_price / n, 2),
        avg_availability=round(sum_availability / n, 1),
        total_products_sold=total_sold,
        total_revenue=round(total_revenue, 2),
        avg_stock_level=round(sum_stock / n, 1),
        avg_lead_time=round(sum_lead / n, 1),
        total_order_quantity=total_order_qty,
        avg_shipping_time=round(sum_ship_time / n, 1),
        shipping_carriers=json.dumps(sorted(shipping_carriers)),
        avg_shipping_cost=round(sum_ship_cost / n, 2),
        total_production_volume=total_prod_vol,
        avg_manufacturing_lead_time=round(sum_mfg_lead / n, 1),
        avg_manufacturing_cost=round(sum_mfg_cost / n, 2),
        defect_rate=round(sum_defect / n, 2),
        inspection_pass_rate=inspection_pass_rate,
        transportation_modes=json.dumps(sorted(transportation_modes)),
        routes=json.dumps(sorted(routes)),
        avg_total_cost=avg_total_cost,
        customer_demographics=json.dumps(sorted(customer_demographics)),
        num_skus=len(unique_skus),
    )

    # ── 2. AI-evaluate: overall_score, risk_level, otd_percentage ────
    try:
        from llm import get_llm
        from langchain_core.messages import HumanMessage

        llm = get_llm(temperature=0.3)

        supplier_data = {
            "name": supplier.name,
            "defect_rate": supplier.defect_rate,
            "inspection_pass_rate": supplier.inspection_pass_rate,
            "avg_lead_time": supplier.avg_lead_time,
            "avg_shipping_time": supplier.avg_shipping_time,
            "avg_manufacturing_lead_time": supplier.avg_manufacturing_lead_time,
            "avg_shipping_cost": supplier.avg_shipping_cost,
            "avg_manufacturing_cost": supplier.avg_manufacturing_cost,
            "avg_total_cost": supplier.avg_total_cost,
            "total_revenue": supplier.total_revenue,
            "total_products_sold": supplier.total_products_sold,
            "avg_stock_level": supplier.avg_stock_level,
            "avg_availability": supplier.avg_availability,
        }

        prompt = f"""You are a supply chain analyst. Evaluate this supplier and compute three metrics:

SUPPLIER DATA:
{json.dumps(supplier_data, indent=2)}

Compute:
1. overall_score (0-100): Composite score weighing defect rate (lower=better), inspection pass rate (higher=better), lead times (lower=better), costs (lower=better relative to revenue), availability.
2. risk_level: "Low", "Medium", "High", or "Critical"
3. otd_percentage: Estimated on-time delivery % (0-100) based on lead/shipping/manufacturing times vs industry standards.

Return a JSON object with: "overall_score" (number), "risk_level" (string), "otd_percentage" (number).
Output ONLY valid JSON, no markdown."""

        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        ev = json.loads(content.strip())
        supplier.overall_score = ev.get("overall_score")
        supplier.risk_level = ev.get("risk_level")
        supplier.otd_percentage = ev.get("otd_percentage")
        print(f"  AI evaluated {supplier.name}: score={supplier.overall_score}, risk={supplier.risk_level}, otd={supplier.otd_percentage}%")

    except Exception as e:
        print(f"AI evaluation failed for new supplier: {e}")
        # Rule-based fallback (same logic as seed.py)
        score = 100.0
        score -= supplier.defect_rate * 10
        score -= max(0, supplier.avg_lead_time - 15) * 2
        score += supplier.inspection_pass_rate * 0.2
        score = max(0, min(100, score))
        supplier.overall_score = round(score, 1)

        if score >= 75:
            supplier.risk_level = "Low"
        elif score >= 55:
            supplier.risk_level = "Medium"
        elif score >= 35:
            supplier.risk_level = "High"
        else:
            supplier.risk_level = "Critical"

        otd = 100 - (max(0, supplier.avg_lead_time - 12) * 1.5) - (max(0, supplier.avg_shipping_time - 4) * 2)
        supplier.otd_percentage = round(max(50, min(99, otd)), 1)
        print(f"  Rule-based fallback {supplier.name}: score={supplier.overall_score}, risk={supplier.risk_level}, otd={supplier.otd_percentage}%")

    # ── 3. Save to database ──────────────────────────────────────────
    session.add(supplier)
    session.commit()
    session.refresh(supplier)

    return {"success": True, "data": supplier}
