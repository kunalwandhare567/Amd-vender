from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class Supplier(SQLModel, table=True):
    supplier_id: str = Field(primary_key=True)
    name: str

    # ── Kaggle dataset fields (aggregated per supplier) ──────────────
    location: str                              # cities joined, e.g. "Mumbai, Delhi"
    region: Optional[str] = None              # e.g. "Maharashtra", "Gujarat"
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
    phone: Optional[str] = Field(default=None)

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
    type: str  # Quality, Delivery, Contract, Compliance, Risk
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
    proof_document_id: Optional[str] = Field(default=None)
    proof_filename: Optional[str] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Intervention(SQLModel, table=True):
    id: str = Field(primary_key=True)
    type: str  # automated, manual, ai_suggested
    category: str  # risk_mitigation, performance_boost, cost_optimization, relationship_building
    priority: str  # critical, high, medium, low
    title: str
    description: str
    target_suppliers: str  # JSON string of list[str]
    actions: str           # JSON string of list[Action]
    status: str            # pending, in_progress, completed, failed
    impact_risk_reduction: float
    impact_cost_savings: float
    impact_performance_improvement: float
    estimated_duration: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

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

class RouteReport(SQLModel, table=True):
    """
    Supplier-Centric Route Intelligence Report.
    Created when a supplier analyzes a route for an RFQ or Order.
    Visible only inside Supplier Profile, RFQ Details, and Order Details.
    """
    __tablename__ = "route_report"
    id: str = Field(primary_key=True)
    supplier_id: str = Field(foreign_key="supplier.supplier_id", index=True)
    rfq_id: Optional[str] = Field(default=None, foreign_key="rfq.id", index=True)
    order_id: Optional[str] = Field(default=None)  # Future: link to Order table
    source: str
    destination: str

    # AI-generated risk & reliability scores
    risk_score: float              # 0-100 (higher = more risk)
    reliability_score: float       # 0-100 (higher = more reliable)
    delay_probability: float       # 0-100% chance of delay
    estimated_transit_days: Optional[float] = None

    # AI analysis summaries (stored as JSON strings)
    weather_analysis: Optional[str] = None      # JSON: {summary, risk_level, details}
    news_analysis: Optional[str] = None         # JSON: {summary, risk_level, headlines}
    infrastructure_analysis: Optional[str] = None
    historical_sla_analysis: Optional[str] = None
    recommendation: Optional[str] = None        # Best route recommendation text

    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None            # supplier email or user id


class SupplierDocument(SQLModel, table=True):
    """
    Tracks uploaded supplier documents (PDFs, CSVs, contracts, compliance records).
    Document content is chunked and stored in pgvector supplier_embeddings for RAG.
    """
    __tablename__ = "supplier_document"
    id: str = Field(primary_key=True)
    supplier_id: str = Field(foreign_key="supplier.supplier_id", index=True)
    filename: str
    file_type: str                    # application/pdf, text/csv
    category: Optional[str] = None   # contract, compliance, audit, invoice, other
    chunks_ingested: int = Field(default=0)
    file_path: Optional[str] = None  # server-side path
    uploaded_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Driver(SQLModel, table=True):
    __tablename__ = "drivers"
    id: str = Field(primary_key=True)
    name: str
    phone: str = Field(default="")
    truck_no: str = Field(default="")
    status: str = Field(default="Available")  # Available, On Trip
    supplier_id: Optional[str] = Field(default=None, foreign_key="supplier.supplier_id")
    current_lat: Optional[float] = Field(default=None)
    current_lng: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InvoiceTrip(SQLModel, table=True):
    __tablename__ = "invoice_trips"
    id: str = Field(primary_key=True)
    product_name: str
    quantity: int
    driver_id: str = Field(foreign_key="drivers.id")
    supplier_id: Optional[str] = Field(default=None, foreign_key="supplier.supplier_id")
    source_location: str
    source_lat: float
    source_lng: float
    destination_location: str
    destination_lat: float
    destination_lng: float
    status: str = Field(default="Scheduled")  # Scheduled, In Transit, Delayed, Completed
    route_json: str
    current_progress: float = Field(default=0.0)
    est_arrival: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Incident(SQLModel, table=True):
    __tablename__ = "incidents"
    id: str = Field(primary_key=True)
    type: str
    location: str
    severity: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    description: str
    affected_supplier_id: Optional[str] = Field(default=None, foreign_key="supplier.supplier_id")
    status: str = Field(default="Active")  # Active, Resolved
    reported_by: str = Field(default="Driver")  # Driver, AI, Admin
    lat: Optional[float] = Field(default=None)
    lng: Optional[float] = Field(default=None)
    trip_id: Optional[str] = Field(default=None)


class SupplierMessage(SQLModel, table=True):
    __tablename__ = "supplier_messages"
    id: Optional[int] = Field(default=None, primary_key=True)
    supplier_id: str = Field(foreign_key="supplier.supplier_id", index=True)
    sender: str  # "Admin" or "Supplier"
    sender_email: str
    recipient_email: str
    subject: str
    message: str
    sent_via: str  # "Portal", "Email", or "Both"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SupplierShipment(SQLModel, table=True):
    __tablename__ = "supplier_shipment"
    id: str = Field(primary_key=True)
    supplier_id: str = Field(foreign_key="supplier.supplier_id", index=True)
    
    # Source Information
    source_name: str
    source_email: str
    source_contact: str
    source_address: str
    
    # Destination Information
    destination_name: str
    destination_email: str
    destination_contact: str
    destination_address: str
    
    # Dispatch Details
    shipment_date: datetime # date and time of dispatch
    expected_lead_time: float # in days
    status: str = Field(default="Pending Audit") # "Pending Audit", "Audited"
    
    # Material Details (Supplier Claims)
    product_name: str
    sku: str
    supplier_quantity: int
    supplier_cost: float
    supplier_receipt_doc_id: Optional[str] = None # links to SupplierDocument
    
    # Company Quality Feedback (Admin Inputs)
    company_quantity: Optional[int] = None
    company_cost: Optional[float] = None
    company_defect_rate: Optional[float] = None # defect rate percentage
    company_lead_time: Optional[float] = None # actual lead time in days
    company_shipping_time: Optional[float] = None # actual shipping time in days
    company_inspection_result: Optional[str] = None # "Pass", "Fail"
    company_feedback_doc_id: Optional[str] = None # links to SupplierDocument
    audited_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)



