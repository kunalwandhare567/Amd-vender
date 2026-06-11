"""
Driver & Trip management API
- List/create drivers
- Create invoice trips (with automatic Dijkstra route calculation)
- Start/complete trips
- Report incidents with coordinate capture and live rerouting
"""

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import Driver, InvoiceTrip, Incident
from .routing import dijkstra, find_nearest_node, NODES

router = APIRouter(prefix="/api", tags=["drivers", "trips"])


# ── Schemas ──────────────────────────────────────────────────

class DriverCreate(BaseModel):
    name: str
    phone: str = ""
    truck_no: str = ""
    supplier_id: Optional[str] = None


class TripCreate(BaseModel):
    product_name: str
    quantity: int
    driver_id: str
    supplier_id: Optional[str] = None
    source_location: str       # graph node name
    destination_location: str  # graph node name
    est_arrival: Optional[str] = None


class TripIncidentReport(BaseModel):
    type: str         # Weather, Accident, Strike, etc.
    lat: float
    lng: float
    severity: str     # Low, Medium, High, Critical
    description: str


# ── Driver Endpoints ─────────────────────────────────────────

@router.get("/drivers", response_model=List[Driver])
def list_drivers(session: Session = Depends(get_session)):
    return session.exec(select(Driver)).all()


@router.post("/drivers", response_model=Driver)
def create_driver(data: DriverCreate, session: Session = Depends(get_session)):
    count = len(session.exec(select(Driver)).all())
    driver = Driver(
        id=f"DRV-{count + 1:03d}",
        name=data.name,
        phone=data.phone,
        truck_no=data.truck_no,
        status="Available",
        supplier_id=data.supplier_id,
    )
    session.add(driver)
    session.commit()
    session.refresh(driver)
    return driver


# ── Trip / Invoice Endpoints ─────────────────────────────────

@router.get("/trips", response_model=List[InvoiceTrip])
def list_trips(
    driver_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(InvoiceTrip)
    if driver_id:
        stmt = stmt.where(InvoiceTrip.driver_id == driver_id)
    if supplier_id:
        stmt = stmt.where(InvoiceTrip.supplier_id == supplier_id)
    return session.exec(stmt.order_by(InvoiceTrip.created_at.desc())).all()


@router.post("/trips", response_model=InvoiceTrip)
def create_trip(data: TripCreate, session: Session = Depends(get_session)):
    """
    Supplier creates an invoice trip:
    1. Validate source/destination as graph nodes
    2. Calculate Dijkstra route
    3. Auto-populate coordinates
    4. Mark driver as On Trip
    """
    if data.source_location not in NODES:
        raise HTTPException(400, f"Unknown source: {data.source_location}")
    if data.destination_location not in NODES:
        raise HTTPException(400, f"Unknown destination: {data.destination_location}")

    driver = session.get(Driver, data.driver_id)
    if not driver:
        raise HTTPException(404, f"Driver {data.driver_id} not found")

    # Calculate route
    route = dijkstra(data.source_location, data.destination_location)
    if route is None:
        raise HTTPException(400, "No route found between source and destination")

    src = NODES[data.source_location]
    dst = NODES[data.destination_location]

    count = len(session.exec(select(InvoiceTrip)).all())
    trip = InvoiceTrip(
        id=f"TRIP-{count + 1:04d}",
        product_name=data.product_name,
        quantity=data.quantity,
        driver_id=data.driver_id,
        supplier_id=data.supplier_id,
        source_location=data.source_location,
        source_lat=src["lat"],
        source_lng=src["lng"],
        destination_location=data.destination_location,
        destination_lat=dst["lat"],
        destination_lng=dst["lng"],
        status="Scheduled",
        route_json=json.dumps(route["coordinates"]),
        current_progress=0.0,
        est_arrival=data.est_arrival,
    )

    session.add(trip)

    # Mark driver as busy
    driver.status = "On Trip"
    driver.current_lat = src["lat"]
    driver.current_lng = src["lng"]
    session.add(driver)

    session.commit()
    session.refresh(trip)
    return trip


@router.post("/trips/{trip_id}/start")
def start_trip(trip_id: str, session: Session = Depends(get_session)):
    trip = session.get(InvoiceTrip, trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")
    trip.status = "In Transit"
    trip.current_progress = 5.0
    session.add(trip)
    session.commit()
    return {"message": "Trip started", "trip_id": trip_id, "status": "In Transit"}


@router.post("/trips/{trip_id}/complete")
def complete_trip(trip_id: str, session: Session = Depends(get_session)):
    trip = session.get(InvoiceTrip, trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")
    trip.status = "Completed"
    trip.current_progress = 100.0
    session.add(trip)

    # Free the driver
    driver = session.get(Driver, trip.driver_id)
    if driver:
        driver.status = "Available"
        driver.current_lat = trip.destination_lat
        driver.current_lng = trip.destination_lng
        session.add(driver)

    session.commit()
    return {"message": "Trip completed", "trip_id": trip_id}


@router.post("/trips/{trip_id}/incident")
def report_trip_incident(
    trip_id: str,
    data: TripIncidentReport,
    session: Session = Depends(get_session),
):
    """
    Driver reports an incident during a trip:
    1. Save incident with GPS coordinates
    2. Mark trip as Delayed
    3. Recalculate alternative route from incident location to destination
    4. Return new route + delay info for frontend to update map
    """
    trip = session.get(InvoiceTrip, trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")

    # Save the incident
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    incident = Incident(
        id=f"INC-{timestamp}",
        type=data.type,
        location=find_nearest_node(data.lat, data.lng),
        severity=data.severity,
        start_time=datetime.utcnow(),
        description=data.description,
        affected_supplier_id=trip.supplier_id,
        status="Active",
        reported_by="Driver",
        lat=data.lat,
        lng=data.lng,
        trip_id=trip_id,
    )
    session.add(incident)

    # Mark trip as delayed
    trip.status = "Delayed"
    session.add(trip)

    # Calculate alternative route from incident location to destination
    incident_node = find_nearest_node(data.lat, data.lng)

    # Block all edges around the incident node
    blocked = []
    from .routing import EDGES as road_edges
    for a, b, _ in road_edges:
        if a == incident_node or b == incident_node:
            blocked.append((a, b))

    # Original route from incident to destination
    original = dijkstra(incident_node, trip.destination_location)
    # Alternative route avoiding blocked area
    alternative = dijkstra(incident_node, trip.destination_location, blocked_edges=blocked)

    # Update trip route to alternative if found
    if alternative:
        trip.route_json = json.dumps(alternative["coordinates"])
        session.add(trip)

    # Update driver position
    driver = session.get(Driver, trip.driver_id)
    if driver:
        driver.current_lat = data.lat
        driver.current_lng = data.lng
        session.add(driver)

    session.commit()
    session.refresh(incident)

    delay_km = 0
    if alternative and original:
        delay_km = round(alternative["distance_km"] - original["distance_km"], 2)

    return {
        "incident": incident,
        "trip_status": "Delayed",
        "incident_node": incident_node,
        "original_route": original,
        "alternative_route": alternative,
        "additional_distance_km": max(0, delay_km),
        "alert_message": f"⚠️ {data.type} reported at {incident_node}. Route recalculated. Estimated +{max(0, delay_km)}km delay.",
    }
