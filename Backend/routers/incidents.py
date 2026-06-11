from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Incident
import os
import json
from datetime import datetime
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
