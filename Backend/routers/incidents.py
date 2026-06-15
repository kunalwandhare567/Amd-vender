from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Incident, Supplier, SupplierShipment
import os
import json
from datetime import datetime, timedelta
from llm import get_llm
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

class IncidentCreate(BaseModel):
    type: str
    location: str
    severity: str
    description: str
    affected_supplier_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    trip_id: Optional[str] = None

@router.get("", response_model=List[Incident])
def get_all_incidents(session: Session = Depends(get_session)):
    stmt = select(Incident).order_by(Incident.start_time.desc())
    return session.exec(stmt).all()

@router.post("", response_model=Incident)
def create_incident(data: IncidentCreate, session: Session = Depends(get_session)):
    # Generate unique ID
    timestamp = datetime.utcnow().strftime("%Y-%m-%d-%H%M%S")
    incident_id = f"INC-{timestamp}"
    
    new_inc = Incident(
        id=incident_id,
        type=data.type,
        location=data.location,
        severity=data.severity,
        start_time=datetime.utcnow(),
        description=data.description,
        affected_supplier_id=data.affected_supplier_id,
        status="Active",
        reported_by="Driver"
    )
    
    session.add(new_inc)
    session.commit()
    session.refresh(new_inc)
    return new_inc

@router.post("/generate", response_model=List[Incident])
def generate_incidents(session: Session = Depends(get_session)):
    try:
        # Check if we already have incidents to avoid flooding
        existing = session.exec(select(Incident)).all()
        if len(existing) >= 5:
            return existing[:10]

        llm = get_llm()
        
        prompt = (
            "Act as a Supply Chain Risk Analyst and generate a JSON array of 5 realistic logistics/transportation "
            "disruptions (e.g., Pune Flooding, Chennai Driver Strike, Mumbai Port Congestion, Delhi Highway Accident). "
            "Return strictly a valid JSON array of objects with the following keys:\n"
            "- type: string (e.g. Weather, Strike, Accident, Natural Disaster)\n"
            "- location: string\n"
            "- severity: string (Low, Medium, High, Critical)\n"
            "- description: string\n"
            "- affected_supplier_id: string (use 'SUP004' for one, 'SUP003' for one, or null for others)\n"
            "Output ONLY valid JSON, do not include markdown or explanations."
        )
        
        message = HumanMessage(content=prompt)
        response = llm.invoke([message])
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        data = json.loads(content.strip())
        
        generated = []
        for idx, item in enumerate(data):
            inc_id = f"INC-GEN-{idx + 1}-{int(datetime.utcnow().timestamp())}"
            new_inc = Incident(
                id=inc_id,
                type=item.get("type", "Other"),
                location=item.get("location", "Unknown"),
                severity=item.get("severity", "Medium"),
                start_time=datetime.utcnow(),
                description=item.get("description", ""),
                affected_supplier_id=item.get("affected_supplier_id"),
                status="Active",
                reported_by="AI"
            )
            session.add(new_inc)
            generated.append(new_inc)
            
        session.commit()
        for g in generated:
            session.refresh(g)
            
        return generated

    except Exception as e:
        print(f"Error generating incidents: {e}")
        # Fallback to local database entries if any, otherwise return static mocks
        stmt = select(Incident)
        results = session.exec(stmt).all()
        if results:
            return results
        
        # Absolute fallback if DB is empty and LLM fails
        mock_data = [
            Incident(id="INC-MOCK-1", type="Weather", location="Pune", severity="Critical", description="Heavy Flooding in Pune electronics hub", affected_supplier_id="SUP004", status="Active", reported_by="AI"),
            Incident(id="INC-MOCK-2", type="Strike", location="Chennai", severity="High", description="Regional logistics driver strike delaying outbound shipments", affected_supplier_id="SUP003", status="Active", reported_by="AI")
        ]
        for item in mock_data:
            session.add(item)
        session.commit()
        return mock_data


class SimulateImpactRequest(BaseModel):
    incident_id: str
    duration_days: int


class SimulationMetrics(BaseModel):
    production: str
    inventory: str
    orders: str
    revenue: str
    opCost: str
    confidence: int


class SimulateImpactResponse(BaseModel):
    success: bool
    metrics: SimulationMetrics


@router.post("/simulate-impact", response_model=SimulateImpactResponse)
def simulate_impact(data: SimulateImpactRequest, session: Session = Depends(get_session)):
    incident = session.get(Incident, data.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {data.incident_id} not found")
    
    # Identify affected supplier
    supplier = None
    if incident.affected_supplier_id:
        supplier = session.get(Supplier, incident.affected_supplier_id)
    
    # Fallback to first supplier if none affected or not found
    if not supplier:
        supplier = session.exec(select(Supplier)).first()
    
    if not supplier:
        return SimulateImpactResponse(
            success=True,
            metrics=SimulationMetrics(
                production="-0 Units",
                inventory="-0 Units",
                orders="-0 Delayed",
                revenue="₹0 Lakhs",
                opCost="₹0 Lakhs",
                confidence=85
            )
        )

    # 1. Query shipments for this supplier
    stmt = select(SupplierShipment).where(SupplierShipment.supplier_id == supplier.supplier_id)
    all_shipments = session.exec(stmt).all()
    
    duration = data.duration_days
    start_window = incident.start_time - timedelta(days=duration)
    end_window = incident.start_time + timedelta(days=duration)
    
    filtered_shipments = [
        s for s in all_shipments 
        if start_window <= s.shipment_date <= end_window
    ]
    
    # 2. Perform Dynamic Computations
    prod_impact_val = 0
    inv_shortage_val = 0
    orders_delayed_val = 0
    revenue_impact_val = 0.0
    op_cost_val = 0.0
    
    shipments_count = len(filtered_shipments)
    
    if shipments_count > 0:
        for s in filtered_shipments:
            # A. Production Impact
            if s.status == "Audited" and s.company_inspection_result == "Fail":
                prod_impact_val += s.supplier_quantity
            elif s.status == "Pending Audit" or s.company_inspection_result is None:
                prod_impact_val += int(s.supplier_quantity * 0.5)
            elif s.company_inspection_result == "Pass" and s.company_lead_time and s.expected_lead_time:
                if s.company_lead_time > s.expected_lead_time:
                    factor = min(1.0, (s.company_lead_time - s.expected_lead_time) / s.expected_lead_time)
                    prod_impact_val += int(s.supplier_quantity * factor)
            
            # B. Inventory Shortage
            discrepancy = s.supplier_quantity - (s.company_quantity if s.company_quantity is not None else s.supplier_quantity)
            defects = 0
            if s.company_defect_rate is not None:
                defects = int((s.company_quantity or s.supplier_quantity) * (s.company_defect_rate / 100.0))
            else:
                defects = int((s.company_quantity or s.supplier_quantity) * (supplier.defect_rate / 100.0))
            inv_shortage_val += max(0, discrepancy) + defects
            
            # C. Orders Delayed
            if s.status == "Pending Audit":
                orders_delayed_val += 1
            elif s.company_lead_time and s.expected_lead_time and s.company_lead_time > s.expected_lead_time:
                orders_delayed_val += 1
            
            # D. Revenue Impact
            cost = s.supplier_cost if s.supplier_cost is not None else (s.supplier_quantity * supplier.avg_price)
            if s.status == "Pending Audit" or (s.company_inspection_result == "Fail") or (s.company_lead_time and s.expected_lead_time and s.company_lead_time > s.expected_lead_time):
                revenue_impact_val += cost * 5.0
            
            # E. Operating Cost
            extra_cost = 0.0
            if s.company_cost is not None and s.supplier_cost is not None:
                extra_cost = max(0.0, s.company_cost - s.supplier_cost)
            reroute_premium = cost * 0.15
            op_cost_val += extra_cost + reroute_premium

        # Scale shipment metrics by duration factor to project cumulative impact over the disruption period
        duration_factor = duration / 14.0
        prod_impact_val = int(prod_impact_val * duration_factor)
        inv_shortage_val = int(inv_shortage_val * duration_factor)
        orders_delayed_val = max(1, int(orders_delayed_val * duration_factor))
        revenue_impact_val = revenue_impact_val * duration_factor
        op_cost_val = op_cost_val * duration_factor

    # Apply severity multiplier
    severity_mult = 1.0
    if incident.severity == "Critical":
        severity_mult = 2.0
    elif incident.severity == "High":
        severity_mult = 1.5
    elif incident.severity == "Low":
        severity_mult = 0.7
    
    # Fallback to Supplier aggregated metrics if shipment aggregations are zero
    if prod_impact_val == 0:
        daily_prod = (supplier.total_production_volume or 10000) / 365.0
        prod_impact_val = int(daily_prod * duration * severity_mult * 1.2)
        
    if inv_shortage_val == 0:
        daily_order = (supplier.total_order_quantity or 5000) / 365.0
        inv_shortage_val = int(daily_order * duration * (supplier.defect_rate or 1.5) / 100.0 * severity_mult * 1.5)
        
    if orders_delayed_val == 0:
        daily_orders = (supplier.total_order_quantity or 5000) / 365.0 / 10.0
        inv_otd_factor = (100.0 - (supplier.otd_percentage or 85.0)) / 100.0
        orders_delayed_val = max(1, int(daily_orders * duration * inv_otd_factor * severity_mult * 2.0))
        
    if revenue_impact_val == 0.0:
        daily_rev = (supplier.total_revenue or 20000000.0) / 365.0
        inv_otd_factor = (100.0 - (supplier.otd_percentage or 85.0)) / 100.0
        revenue_impact_val = daily_rev * duration * inv_otd_factor * severity_mult * 4.0
        
    if op_cost_val == 0.0:
        daily_ship_cost = (supplier.avg_shipping_cost or 5000.0)
        op_cost_val = daily_ship_cost * (duration / 7.0) * severity_mult * 1.5

    # Format outputs nicely
    prod_str = f"-{prod_impact_val:,} Units"
    inv_str = f"-{inv_shortage_val:,} Units"
    orders_str = f"-{orders_delayed_val:,} Delayed"
    
    if revenue_impact_val >= 10000000:
        crores = revenue_impact_val / 10000000
        rev_str = f"₹{crores:.1f} Crore"
    else:
        lakhs = revenue_impact_val / 100000
        rev_str = f"₹{lakhs:.1f} Lakhs"
        
    if op_cost_val >= 10000000:
        crores = op_cost_val / 10000000
        op_str = f"₹{crores:.1f} Crore"
    else:
        lakhs = op_cost_val / 100000
        op_str = f"₹{lakhs:.1f} Lakhs"
        
    pass_rate = supplier.inspection_pass_rate if supplier.inspection_pass_rate is not None else 90.0
    otd_rate = supplier.otd_percentage if supplier.otd_percentage is not None else 85.0
    
    confidence = int((pass_rate * 0.6) + (otd_rate * 0.4))
    confidence = int(confidence - (duration - 14) * 0.4)
    if incident.severity == "Critical":
        confidence -= 5
    elif incident.severity == "Low":
        confidence += 3
        
    confidence = max(45, min(98, confidence))
    
    return SimulateImpactResponse(
        success=True,
        metrics=SimulationMetrics(
            production=prod_str,
            inventory=inv_str,
            orders=orders_str,
            revenue=rev_str,
            opCost=op_str,
            confidence=confidence
        )
    )
