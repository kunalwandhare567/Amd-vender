from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from database import get_session
from models import RFQ, Supplier, Alert

router = APIRouter(prefix="/api/rfqs", tags=["rfqs"])

class RFQCreate(BaseModel):
    supplier_id: str
    original_supplier_id: str
    part_sku: str
    quantity: int
    target_delivery_days: int
    delivery_location: str
    terms_conditions: str
    status: Optional[str] = "Sent"

class RFQBidSubmit(BaseModel):
    bid_price: float
    bid_lead_time: int
    bid_comments: Optional[str] = None

class RFQResponse(BaseModel):
    id: str
    supplier_id: str
    supplier_name: str
    original_supplier_id: str
    original_supplier_name: str
    part_sku: str
    quantity: int
    target_delivery_days: int
    delivery_location: str
    terms_conditions: str
    status: str
    bid_price: Optional[float] = None
    bid_lead_time: Optional[int] = None
    bid_comments: Optional[str] = None
    created_at: datetime

@router.get("", response_model=List[RFQResponse])
def get_rfqs(supplier_id: Optional[str] = None, session: Session = Depends(get_session)):
    query = select(RFQ)
    if supplier_id:
        query = query.where(RFQ.supplier_id == supplier_id)
    rfqs = session.exec(query).all()
    
    response = []
    for rfq in rfqs:
        supp = session.get(Supplier, rfq.supplier_id)
        orig_supp = session.get(Supplier, rfq.original_supplier_id)
        
        response.append(RFQResponse(
            id=rfq.id,
            supplier_id=rfq.supplier_id,
            supplier_name=supp.name if supp else "Unknown",
            original_supplier_id=rfq.original_supplier_id,
            original_supplier_name=orig_supp.name if orig_supp else "Unknown",
            part_sku=rfq.part_sku,
            quantity=rfq.quantity,
            target_delivery_days=rfq.target_delivery_days,
            delivery_location=rfq.delivery_location,
            terms_conditions=rfq.terms_conditions,
            status=rfq.status,
            bid_price=rfq.bid_price,
            bid_lead_time=rfq.bid_lead_time,
            bid_comments=rfq.bid_comments,
            created_at=rfq.created_at
        ))
    return response

@router.post("", response_model=RFQResponse)
def create_rfq(rfq_data: RFQCreate, session: Session = Depends(get_session)):
    # Verify suppliers exist
    supp = session.get(Supplier, rfq_data.supplier_id)
    orig_supp = session.get(Supplier, rfq_data.original_supplier_id)
    if not supp or not orig_supp:
        raise HTTPException(status_code=404, detail="One or both suppliers not found")
        
    # Generate unique ID
    timestamp = datetime.utcnow().strftime("%Y-%m-%d-%H%M%S")
    rfq_id = f"RFQ-{timestamp}-{rfq_data.supplier_id}"
    
    new_rfq = RFQ(
        id=rfq_id,
        supplier_id=rfq_data.supplier_id,
        original_supplier_id=rfq_data.original_supplier_id,
        part_sku=rfq_data.part_sku,
        quantity=rfq_data.quantity,
        target_delivery_days=rfq_data.target_delivery_days,
        delivery_location=rfq_data.delivery_location,
        terms_conditions=rfq_data.terms_conditions,
        status=rfq_data.status or "Sent",  # Set to status provided (Draft or Sent)
        created_at=datetime.utcnow()
    )
    
    session.add(new_rfq)
    session.commit()
    session.refresh(new_rfq)
    
    return RFQResponse(
        id=new_rfq.id,
        supplier_id=new_rfq.supplier_id,
        supplier_name=supp.name,
        original_supplier_id=new_rfq.original_supplier_id,
        original_supplier_name=orig_supp.name,
        part_sku=new_rfq.part_sku,
        quantity=new_rfq.quantity,
        target_delivery_days=new_rfq.target_delivery_days,
        delivery_location=new_rfq.delivery_location,
        terms_conditions=new_rfq.terms_conditions,
        status=new_rfq.status,
        bid_price=new_rfq.bid_price,
        bid_lead_time=new_rfq.bid_lead_time,
        bid_comments=new_rfq.bid_comments,
        created_at=new_rfq.created_at
    )


@router.post("/{rfq_id}/send", response_model=RFQResponse)
def send_rfq(rfq_id: str, session: Session = Depends(get_session)):
    rfq = session.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.status != "Draft":
        raise HTTPException(status_code=400, detail="Only Draft RFQs can be broadcasted")
    
    rfq.status = "Sent"
    session.add(rfq)
    session.commit()
    session.refresh(rfq)
    
    supp = session.get(Supplier, rfq.supplier_id)
    orig_supp = session.get(Supplier, rfq.original_supplier_id)
    
    return RFQResponse(
        id=rfq.id,
        supplier_id=rfq.supplier_id,
        supplier_name=supp.name if supp else "Unknown",
        original_supplier_id=rfq.original_supplier_id,
        original_supplier_name=orig_supp.name if orig_supp else "Unknown",
        part_sku=rfq.part_sku,
        quantity=rfq.quantity,
        target_delivery_days=rfq.target_delivery_days,
        delivery_location=rfq.delivery_location,
        terms_conditions=rfq.terms_conditions,
        status=rfq.status,
        bid_price=rfq.bid_price,
        bid_lead_time=rfq.bid_lead_time,
        bid_comments=rfq.bid_comments,
        created_at=rfq.created_at
    )

@router.post("/{rfq_id}/bid", response_model=RFQResponse)
def submit_bid(rfq_id: str, bid_data: RFQBidSubmit, session: Session = Depends(get_session)):
    rfq = session.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    rfq.status = "Bid_Submitted"
    rfq.bid_price = bid_data.bid_price
    rfq.bid_lead_time = bid_data.bid_lead_time
    rfq.bid_comments = bid_data.bid_comments
    
    session.add(rfq)
    session.commit()
    session.refresh(rfq)
    
    supp = session.get(Supplier, rfq.supplier_id)
    orig_supp = session.get(Supplier, rfq.original_supplier_id)
    
    return RFQResponse(
        id=rfq.id,
        supplier_id=rfq.supplier_id,
        supplier_name=supp.name if supp else "Unknown",
        original_supplier_id=rfq.original_supplier_id,
        original_supplier_name=orig_supp.name if orig_supp else "Unknown",
        part_sku=rfq.part_sku,
        quantity=rfq.quantity,
        target_delivery_days=rfq.target_delivery_days,
        delivery_location=rfq.delivery_location,
        terms_conditions=rfq.terms_conditions,
        status=rfq.status,
        bid_price=rfq.bid_price,
        bid_lead_time=rfq.bid_lead_time,
        bid_comments=rfq.bid_comments,
        created_at=rfq.created_at
    )

@router.post("/{rfq_id}/approve", response_model=RFQResponse)
def approve_rfq(rfq_id: str, session: Session = Depends(get_session)):
    rfq = session.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    rfq.status = "Approved"
    session.add(rfq)
    
    # Reject other RFQs for this same disruption
    other_rfqs_stmt = select(RFQ).where(
        RFQ.original_supplier_id == rfq.original_supplier_id,
        RFQ.id != rfq.id,
        RFQ.status.in_(["Sent", "Bid_Submitted"])
    )
    other_rfqs = session.exec(other_rfqs_stmt).all()
    for other in other_rfqs:
        other.status = "Rejected"
        session.add(other)
        
    # Mark any alerts as resolved or create a new alert notifying swap success
    alert_stmt = select(Alert).where(Alert.supplier_id == rfq.original_supplier_id, Alert.status == "New")
    alerts = session.exec(alert_stmt).all()
    for alert in alerts:
        alert.status = "Resolved"
        alert.message += f" (Swapped with {rfq.supplier_id})"
        session.add(alert)
        
    # Update active details of new supplier if required
    # (e.g. increase safety buffer, update status)
    
    session.commit()
    session.refresh(rfq)
    
    supp = session.get(Supplier, rfq.supplier_id)
    orig_supp = session.get(Supplier, rfq.original_supplier_id)
    
    return RFQResponse(
        id=rfq.id,
        supplier_id=rfq.supplier_id,
        supplier_name=supp.name if supp else "Unknown",
        original_supplier_id=rfq.original_supplier_id,
        original_supplier_name=orig_supp.name if orig_supp else "Unknown",
        part_sku=rfq.part_sku,
        quantity=rfq.quantity,
        target_delivery_days=rfq.target_delivery_days,
        delivery_location=rfq.delivery_location,
        terms_conditions=rfq.terms_conditions,
        status=rfq.status,
        bid_price=rfq.bid_price,
        bid_lead_time=rfq.bid_lead_time,
        bid_comments=rfq.bid_comments,
        created_at=rfq.created_at
    )
