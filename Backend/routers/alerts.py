from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Optional
from database import get_session
from models import Alert

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("/", response_model=dict)
def get_alerts(
    session: Session = Depends(get_session),
    status: Optional[str] = None,
    severity: Optional[str] = None
):
    query = select(Alert)
    
    if status:
        query = query.where(Alert.status == status)
    
    if severity:
        query = query.where(Alert.severity == severity)
        
    # Sort by timestamp desc
    query = query.order_by(Alert.timestamp.desc())
    
    alerts = session.exec(query).all()
    
    return {
        "success": True,
        "data": alerts
    }
