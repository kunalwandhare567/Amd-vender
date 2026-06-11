from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class Supplier(SQLModel, table=True):
    supplier_id: str = Field(primary_key=True)
    name: str

    # ── Kaggle dataset fields (aggregated per supplier) ──────────────
    location: str                              # cities joined, e.g. "Mumbai, Delhi"
    product_types: str                         # JSON list: '["skincare","cosmetics","haircare"]'
    avg_price: float                           # avg product price
    avg_availability: float                    # avg product availability (0-100)
    total_products_sold: int                   # total units sold
    total_revenue: float                       # total revenue generated
    avg_stock_level: float                     # avg stock level
    avg_lead_time: float                       # avg lead time in days
    total_order_quantity: int                  # total order quantity
    avg_shipping_time: float                   # avg shipping time in days
    shipping_carriers: str                     # JSON list: '["Carrier A","Carrier B"]'
    avg_shipping_cost: float                   # avg shipping cost
    total_production_volume: int               # total production volume
    avg_manufacturing_lead_time: float         # avg manufacturing lead time in days
    avg_manufacturing_cost: float              # avg manufacturing cost per unit
    defect_rate: float                         # avg defect rate %
    inspection_pass_rate: float                # % of inspections that passed
    transportation_modes: str                  # JSON list: '["Road","Rail","Air"]'
    routes: str                                # JSON list: '["Route A","Route B"]'
    avg_total_cost: float                      # avg total cost per product
    customer_demographics: str                 # JSON list: '["Male","Female","Non-binary"]'
    num_skus: int                              # count of unique SKUs

    # ── AI-evaluated fields (computed, not from dataset) ─────────────
    overall_score: Optional[float] = None      # AI composite score (0-100)
    risk_level: Optional[str] = None           # AI: Low, Medium, High, Critical
    otd_percentage: Optional[float] = None     # AI: estimated on-time delivery %

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    full_name: Optional[str] = None
    company: Optional[str] = None
    role: str = Field(default="user") # admin, supplier, user
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Alert(SQLModel, table=True):
    alert_id: str = Field(primary_key=True)
    supplier_id: str
    supplier_name: str
    type: str  # Quality, Delivery, Contract, Other
    severity: str  # Low, Medium, High, Critical
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str  # New, Reviewed, Resolved

class SLAMetric(SQLModel, table=True):
    id: str = Field(primary_key=True)
    supplier_id: str = Field(foreign_key="supplier.supplier_id")
    supplier_name: str
    metric: str  # lead_time, shipping_time, quality_score, inspection_rate
    current: float
    threshold: float
    target: float
    unit: str
    status: str  # compliant, warning, breached
    deviation_percent: float
    trend: str  # up, down, stable
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Intervention(SQLModel, table=True):
    id: str = Field(primary_key=True)
    type: str  # automated, manual, ai_suggested
    category: str  # risk_mitigation, performance_boost, cost_optimization, relationship_building
    priority: str  # critical, high, medium, low
    title: str
    description: str
    target_suppliers: str # JSON string of list[str]
    actions: str  # JSON string of list[Action]
    status: str  # pending, in_progress, completed, failed
    impact_risk_reduction: float
    impact_cost_savings: float
    impact_performance_improvement: float
    estimated_duration: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Incident(SQLModel, table=True):
    id: str = Field(primary_key=True)
    type: str  # Weather, Strike, Accident, Natural Disaster
    location: str
    severity: str  # Low, Medium, High, Critical
    start_time: datetime = Field(default_factory=datetime.utcnow)
    description: str
    affected_supplier_id: Optional[str] = Field(default=None, foreign_key="supplier.supplier_id")
    status: str = Field(default="Active")  # Active, Resolved
    reported_by: str = Field(default="Driver")  # Driver, AI
    lat: Optional[float] = None  # Incident GPS latitude
    lng: Optional[float] = None  # Incident GPS longitude
    trip_id: Optional[str] = None  # Associated trip (if reported by driver)

class RFQ(SQLModel, table=True):
    id: str = Field(primary_key=True)
    supplier_id: str = Field(foreign_key="supplier.supplier_id")
    original_supplier_id: str = Field(foreign_key="supplier.supplier_id")
    part_sku: str
    quantity: int
    target_delivery_days: int
    delivery_location: str
    terms_conditions: str
    status: str = Field(default="Draft")  # Draft, Sent, Bid_Submitted, Approved, Rejected
    bid_price: Optional[float] = None
    bid_lead_time: Optional[int] = None
    bid_comments: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Driver(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    phone: str = ""
    truck_no: str = ""
    status: str = Field(default="Available")  # Available, On Trip, Offline
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    supplier_id: Optional[str] = Field(default=None, foreign_key="supplier.supplier_id")

class InvoiceTrip(SQLModel, table=True):
    __tablename__ = "invoicetrip"
    id: str = Field(primary_key=True)
    product_name: str
    quantity: int
    driver_id: str = Field(foreign_key="driver.id")
    supplier_id: Optional[str] = Field(default=None, foreign_key="supplier.supplier_id")
    source_location: str
    source_lat: float
    source_lng: float
    destination_location: str
    destination_lat: float
    destination_lng: float
    status: str = Field(default="Scheduled")  # Scheduled, In Transit, Delayed, Completed
    route_json: Optional[str] = None  # JSON array of {lat, lng, name} waypoints
    current_progress: float = Field(default=0.0)
    est_arrival: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
