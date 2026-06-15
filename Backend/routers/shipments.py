import os
import uuid
import shutil
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import FileResponse
from sqlmodel import Session, select, and_
from pydantic import BaseModel
from fpdf import FPDF

from database import get_session
from models import Supplier, SupplierShipment, SupplierDocument, SLAMetric
from llm import get_llm
from langchain_core.messages import HumanMessage

router = APIRouter(prefix="/api/shipments", tags=["shipments"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper to parse authorization token and get email without throwing exception
async def get_current_user_email(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        return "system@vendorverse.com"
    token = authorization.split(" ")[1]
    try:
        from jose import jwt
        from auth.security import SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email:
            return email
    except Exception:
        pass
    return "system@vendorverse.com"


def clean_pdf_text(text: str) -> str:
    if not text:
        return ""
    # Filter out emoji characters or other unicode outside latin-1 block
    return text.encode("latin-1", "ignore").decode("latin-1")


class MonthlyReportRequest(BaseModel):
    month: int
    year: int


class MonthlyAuditPDF(FPDF):
    def header(self):
        # Teal Header Accent Bar
        self.set_fill_color(13, 148, 136) # Teal #0D9488
        self.rect(10, 10, 190, 4, 'F')
        self.set_y(18)
        self.set_font('helvetica', 'B', 15)
        self.set_text_color(15, 23, 42) # Slate 900
        self.cell(0, 8, 'MONTHLY PERFORMANCE COMPARATIVE AUDIT REPORT', align='L')
        self.ln(6)
        self.set_font('helvetica', 'I', 9)
        self.set_text_color(100, 116, 139) # Slate 500
        self.cell(0, 6, 'Supplier Invoice Receipt Claims vs. Company Audited Inspections (SLA Core)', align='L')
        self.ln(8)
        self.set_draw_color(226, 232, 240) # Slate 200
        self.line(10, 36, 200, 36)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_draw_color(226, 232, 240)
        self.line(10, 280, 200, 280)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(148, 163, 184) # Slate 400
        self.cell(0, 10, f'Page {self.page_no()} | Confidential SLA Ledger | VendorVerse Audit Engine', align='C')


def recalculate_monthly_sla_metrics(session: Session, supplier_id: str, year: int, month: int):
    """
    Query all audited shipments for the supplier in the selected month,
    recalculate averages, and write directly to the SLAMetric and Supplier tables.
    """
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    query = select(SupplierShipment).where(
        SupplierShipment.supplier_id == supplier_id,
        SupplierShipment.status == "Audited",
        SupplierShipment.shipment_date >= start_date,
        SupplierShipment.shipment_date < end_date
    )
    audited = session.exec(query).all()
    if not audited:
        return

    n = len(audited)
    avg_lead_time = round(sum(s.company_lead_time for s in audited) / n, 1)
    avg_shipping_time = round(sum(s.company_shipping_time for s in audited) / n, 1)
    avg_defect_rate = round(sum(s.company_defect_rate for s in audited) / n, 2)
    inspection_pass_rate = round(sum(100.0 if s.company_inspection_result == "Pass" else 0.0 for s in audited) / n, 1)
    quality_score = round(100.0 - avg_defect_rate, 1)

    # 1. Update SLAMetric table
    metrics = session.exec(select(SLAMetric).where(SLAMetric.supplier_id == supplier_id)).all()
    for m in metrics:
        if m.metric == "lead_time":
            m.current = avg_lead_time
            m.deviation_percent = round((m.current - m.target) / m.target * 100, 1) if m.target > 0 else 0.0
            m.status = "compliant" if m.current <= m.target else ("warning" if m.current <= m.threshold else "breached")
        elif m.metric == "shipping_time":
            m.current = avg_shipping_time
            m.deviation_percent = round((m.current - m.target) / m.target * 100, 1) if m.target > 0 else 0.0
            m.status = "compliant" if m.current <= m.target else ("warning" if m.current <= m.threshold else "breached")
        elif m.metric == "quality_score":
            m.current = quality_score
            m.deviation_percent = round((m.current - m.target) / m.target * 100, 1) if m.target > 0 else 0.0
            m.status = "compliant" if m.current >= m.target else ("warning" if m.current >= m.threshold else "breached")
        elif m.metric == "inspection_rate":
            m.current = inspection_pass_rate
            m.deviation_percent = round((m.current - m.target) / m.target * 100, 1) if m.target > 0 else 0.0
            m.status = "compliant" if m.current >= m.target else ("warning" if m.current >= m.threshold else "breached")
        session.add(m)

    # 2. Update Supplier table overall scores
    supplier = session.get(Supplier, supplier_id)
    if supplier:
        supplier.avg_lead_time = avg_lead_time
        supplier.avg_shipping_time = avg_shipping_time
        supplier.defect_rate = avg_defect_rate
        supplier.inspection_pass_rate = inspection_pass_rate

        # Calculate overall score formula
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
        session.add(supplier)


@router.post("/upload-receipt")
async def upload_receipt(
    supplier_id: str = Form(...),
    source_name: str = Form(...),
    source_email: str = Form(...),
    source_contact: str = Form(...),
    source_address: str = Form(...),
    destination_name: str = Form(...),
    destination_email: str = Form(...),
    destination_contact: str = Form(...),
    destination_address: str = Form(...),
    shipment_date: str = Form(...),
    expected_lead_time: float = Form(...),
    product_name: str = Form(...),
    sku: str = Form(...),
    supplier_quantity: int = Form(...),
    supplier_cost: float = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    uploaded_by: str = Depends(get_current_user_email)
):
    """
    Allows supplier to register a dispatch with full source, destination, expected times,
    and material quantity/costs. Uploads the receipt/invoice to disk.
    """
    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = {".pdf", ".csv", ".xlsx", ".xls", ".png", ".jpg", ".jpeg"}
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, CSV, Excel, Images."
        )

    safe_filename = f"{doc_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save receipt file: {str(e)}")

    # Add to SupplierDocument table
    supplier_doc = SupplierDocument(
        id=doc_id,
        supplier_id=supplier_id,
        filename=file.filename,
        file_type=file.content_type or "application/pdf",
        category="invoice",
        chunks_ingested=0,
        file_path=file_path,
        uploaded_by=uploaded_by
    )
    session.add(supplier_doc)
    session.flush()

    # Parse shipment_date string
    try:
        if 'T' in shipment_date:
            ship_dt = datetime.fromisoformat(shipment_date.replace('Z', ''))
        else:
            ship_dt = datetime.strptime(shipment_date, "%Y-%m-%d")
    except Exception:
        ship_dt = datetime.utcnow()

    # Get supplier details
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Save SupplierShipment
    shipment_id = f"SHIP-{uuid.uuid4().hex[:8].upper()}"
    shipment = SupplierShipment(
        id=shipment_id,
        supplier_id=supplier_id,
        supplier_name=supplier.name,
        source_name=source_name,
        source_email=source_email,
        source_contact=source_contact,
        source_address=source_address,
        destination_name=destination_name,
        destination_email=destination_email,
        destination_contact=destination_contact,
        destination_address=destination_address,
        shipment_date=ship_dt,
        expected_lead_time=expected_lead_time,
        status="Pending Audit",
        product_name=product_name,
        sku=sku,
        supplier_quantity=supplier_quantity,
        supplier_cost=supplier_cost,
        supplier_receipt_doc_id=doc_id
    )

    session.add(shipment)
    session.commit()
    session.refresh(shipment)

    return {
        "success": True,
        "message": "Shipment registered successfully.",
        "shipment": shipment
    }


@router.get("/supplier/{supplier_id}")
def get_supplier_shipments(
    supplier_id: str,
    session: Session = Depends(get_session)
):
    """
    Get shipment ledger list for a supplier.
    """
    query = select(SupplierShipment).where(SupplierShipment.supplier_id == supplier_id).order_by(SupplierShipment.shipment_date.desc())
    shipments = session.exec(query).all()
    return {
        "success": True,
        "shipments": shipments
    }


@router.post("/{shipment_id}/generate-feedback")
async def generate_feedback(
    shipment_id: str,
    company_quantity: int = Form(...),
    company_cost: float = Form(...),
    company_defect_rate: float = Form(...),
    company_lead_time: float = Form(...),
    company_shipping_time: float = Form(...),
    company_inspection_result: str = Form(...),
    file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    uploaded_by: str = Depends(get_current_user_email)
):
    """
    Called when the company receives material. Admin registers QC inspection feedback.
    Links actual feedback metrics and recalculates SLA scores.
    """
    shipment = session.get(SupplierShipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    feedback_doc_id = None
    if file:
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        safe_filename = f"{doc_id}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save QC report file: {str(e)}")

        supplier_doc = SupplierDocument(
            id=doc_id,
            supplier_id=shipment.supplier_id,
            filename=file.filename,
            file_type=file.content_type or "application/pdf",
            category="audit",
            chunks_ingested=0,
            file_path=file_path,
            uploaded_by=uploaded_by
        )
        session.add(supplier_doc)
        session.flush()
        feedback_doc_id = doc_id

    # Save company feedback metrics
    shipment.company_quantity = company_quantity
    shipment.company_cost = company_cost
    shipment.company_defect_rate = company_defect_rate
    shipment.company_lead_time = company_lead_time
    shipment.company_shipping_time = company_shipping_time
    shipment.company_inspection_result = company_inspection_result
    shipment.company_feedback_doc_id = feedback_doc_id
    shipment.status = "Audited"
    shipment.audited_at = datetime.utcnow()

    session.add(shipment)
    session.commit()
    
    # Recalculate metrics for immediate feedback (reactive updates)
    recalculate_monthly_sla_metrics(session, shipment.supplier_id, shipment.shipment_date.year, shipment.shipment_date.month)
    session.commit()
    session.refresh(shipment)

    return {
        "success": True,
        "message": "Quality feedback successfully logged and SLA parameters recalculated.",
        "shipment": shipment
    }


@router.post("/supplier/{supplier_id}/sync-sla")
def sync_sla(
    supplier_id: str,
    request: MonthlyReportRequest,
    session: Session = Depends(get_session)
):
    """
    Recalculates monthly averages (Lead Time, Shipping Time, Quality, Inspection)
    and updates SLAMetric entries and Supplier ratings in the database without PDF generation.
    """
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    start_date = datetime(request.year, request.month, 1)
    if request.month == 12:
        end_date = datetime(request.year + 1, 1, 1)
    else:
        end_date = datetime(request.year, request.month + 1, 1)

    query = select(SupplierShipment).where(
        SupplierShipment.supplier_id == supplier_id,
        SupplierShipment.shipment_date >= start_date,
        SupplierShipment.shipment_date < end_date
    )
    shipments = session.exec(query).all()

    if not shipments:
        raise HTTPException(
            status_code=400,
            detail=f"No shipments found for this supplier in the selected month ({request.month}/{request.year})."
        )

    audited = [s for s in shipments if s.status == "Audited"]
    if not audited:
        raise HTTPException(
            status_code=400,
            detail="No audited shipments found. Please submit company inspection feedback first."
        )

    recalculate_monthly_sla_metrics(session, supplier_id, request.year, request.month)
    session.commit()
    
    return {
        "success": True,
        "message": f"SLA metrics for {request.month:02d}/{request.year} recalculated and updated successfully in SLA Monitor."
    }


@router.post("/supplier/{supplier_id}/generate-monthly-report")
async def generate_monthly_report(
    supplier_id: str,
    request: MonthlyReportRequest,
    session: Session = Depends(get_session),
    uploaded_by: str = Depends(get_current_user_email)
):
    """
    Compiles monthly comparative data (promised invoice vs company audit),
    updates database SLA metrics, prompts AI for insights, builds a premium PDF report,
    and returns it.
    """
    supplier = session.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Calculate month dates
    start_date = datetime(request.year, request.month, 1)
    if request.month == 12:
        end_date = datetime(request.year + 1, 1, 1)
    else:
        end_date = datetime(request.year, request.month + 1, 1)

    # Fetch shipments
    query = select(SupplierShipment).where(
        SupplierShipment.supplier_id == supplier_id,
        SupplierShipment.shipment_date >= start_date,
        SupplierShipment.shipment_date < end_date
    )
    shipments = session.exec(query).all()

    if not shipments:
        raise HTTPException(
            status_code=400,
            detail=f"No shipments found for this supplier in the selected month ({request.month}/{request.year})."
        )

    audited = [s for s in shipments if s.status == "Audited"]
    if not audited:
        raise HTTPException(
            status_code=400,
            detail="No audited shipments found. Please submit company inspection feedback before generating reports."
        )

    # ── 1. Recalculate Averages & Write Directly to database ──
    recalculate_monthly_sla_metrics(session, supplier_id, request.year, request.month)
    session.commit()
    session.refresh(supplier)

    # Refresh metric averages for report output
    n = len(audited)
    avg_lead_time = round(sum(s.company_lead_time for s in audited) / n, 1)
    avg_shipping_time = round(sum(s.company_shipping_time for s in audited) / n, 1)
    avg_defect_rate = round(sum(s.company_defect_rate for s in audited) / n, 2)
    inspection_pass_rate = round(sum(100.0 if s.company_inspection_result == "Pass" else 0.0 for s in audited) / n, 1)
    quality_score = round(100.0 - avg_defect_rate, 1)

    # ── 2. Run LLM Comparative Performance Audit ──
    shipments_text = ""
    for s in audited:
        shipments_text += (
            f"- SKU {s.sku} ({s.product_name}): Dispatched={s.shipment_date.strftime('%Y-%m-%d %H:%M')}, "
            f"Expected Lead={s.expected_lead_time}d. Promised Qty={s.supplier_quantity}, Promised Cost=${s.supplier_cost:.2f}. "
            f"Actual Received Qty={s.company_quantity}, Actual Cost=${s.company_cost:.2f}, Actual Lead={s.company_lead_time}d, "
            f"Shipping={s.company_shipping_time}d, Defect Rate={s.company_defect_rate}%, Result={s.company_inspection_result}.\n"
        )

    prompt = f"""
    You are an expert procurement auditor and supply chain risk analyst. Evaluate the supplier '{supplier.name}' for the month {request.month}/{request.year} comparing their self-reported invoice claims with the company's inspection logs.
    
    Monthly Averages & SLA Summary:
    - Average Lead Time: {avg_lead_time} days
    - Average Shipping Time: {avg_shipping_time} days
    - Quality Score: {quality_score}% (Inspection Pass Rate: {inspection_pass_rate}%)
    - Average Defect Rate: {avg_defect_rate}%
    - Overall Supplier Score: {supplier.overall_score}/100
    - Supplier Risk Level: {supplier.risk_level}
    
    Delivered Material History Entries:
    {shipments_text}
    
    Write a concise, data-driven audit report. Format the output as a valid JSON object with keys:
    - "executive_summary": 2-3 sentences summarizing the month's findings, quality alerts, and SLA deviations.
    - "key_insights": array of 3 specific bullet points with icons (e.g. "📦 Quantities", "⏱️ Delays", "💰 Cost overruns") highlighting differences between claimed vs received metrics.
    - "recommendations": array of 2 actionable recommendations for the supplier relationship or compliance checks.
    
    Do NOT output markdown tags, code blocks, or triple backticks. Return ONLY the JSON string.
    """

    ai_report = {
        "executive_summary": "SLA targets were evaluated. Standard performance deviations are flagged.",
        "key_insights": [
            "📦 Quantity check: Slight differences in logged items.",
            "⏱️ Logistics: Transit times are within warning limits.",
            "💰 Expense audit: Billing rates aligned with initial claims."
        ],
        "recommendations": [
            "Maintain close inspection schedules.",
            "Initiate supplier reviews if quality drops below target thresholds."
        ]
    }

    try:
        llm = get_llm(temperature=0.3)
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        
        # Clean JSON structure
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        ai_report = json.loads(content.strip())
    except Exception as e:
        print(f"RAG LLM audit failed: {e}")

    # ── 3. Generate PDF Report ──
    pdf = MonthlyAuditPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    # A. Metadata block
    pdf.set_font('helvetica', 'B', 10)
    pdf.set_text_color(30, 41, 59) # Slate 800
    pdf.cell(100, 6, 'AUDIT METADATA')
    pdf.cell(0, 6, 'SUPPLIER DETAILS', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(71, 85, 105) # Slate 600
    
    # Left column: Report details
    pdf.cell(30, 5, 'Audit Month:')
    pdf.set_font('helvetica', 'B', 9)
    pdf.cell(70, 5, f"{request.month:02d} / {request.year}")
    pdf.set_font('helvetica', '', 9)
    pdf.cell(30, 5, 'Supplier Name:')
    pdf.set_font('helvetica', 'B', 9)
    pdf.cell(0, 5, clean_pdf_text(supplier.name), new_x="LMARGIN", new_y="NEXT")

    pdf.set_font('helvetica', '', 9)
    pdf.cell(30, 5, 'Generated On:')
    pdf.cell(70, 5, datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC'))
    pdf.cell(30, 5, 'Supplier Email:')
    pdf.cell(0, 5, clean_pdf_text(audited[0].source_email), new_x="LMARGIN", new_y="NEXT")

    pdf.cell(30, 5, 'Total Deliveries:')
    pdf.cell(70, 5, f"{len(shipments)} ({n} Audited)")
    pdf.cell(30, 5, 'Region:')
    pdf.cell(0, 5, supplier.region or 'N/A', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # B. SLA Scorecard Section
    pdf.set_font('helvetica', 'B', 10)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, 'AGGREGATED SLA MONITOR SCORECARD', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    sla_headers = ["SLA Metric Type", "Promised/Target", "Audited Actual", "Deviation", "SLA Status"]
    sla_widths = [50, 45, 45, 25, 25]

    pdf.set_font('helvetica', 'B', 9)
    pdf.set_fill_color(248, 250, 252) # Slate 50
    pdf.set_text_color(71, 85, 105)
    for i, h in enumerate(sla_headers):
        pdf.cell(sla_widths[i], 8, h, border=1, align='C', fill=True)
    pdf.ln()

    # Query target definitions from SLAMetric table if present, else fallbacks
    sla_map = {m.metric: m for m in session.exec(select(SLAMetric).where(SLAMetric.supplier_id == supplier_id)).all()}
    
    def get_target_str(metric_name, default_tgt, unit):
        m = sla_map.get(metric_name)
        return f"{m.target if m else default_tgt} {unit}"

    sla_rows = [
        ("Lead Time", get_target_str("lead_time", 15.0, "days"), f"{avg_lead_time} days", sla_map.get("lead_time")),
        ("Shipping Time", get_target_str("shipping_time", 5.0, "days"), f"{avg_shipping_time} days", sla_map.get("shipping_time")),
        ("Quality Score", get_target_str("quality_score", 95.0, "%"), f"{quality_score}%", sla_map.get("quality_score")),
        ("Inspection Pass Rate", get_target_str("inspection_rate", 98.0, "%"), f"{inspection_pass_rate}%", sla_map.get("inspection_rate"))
    ]

    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(51, 65, 85)
    for name, target, actual, m_obj in sla_rows:
        dev_val = f"{m_obj.deviation_percent}%" if m_obj else "0.0%"
        status = m_obj.status.upper() if m_obj else "COMPLIANT"
        
        # Color based on compliance
        if status == "BREACHED":
            pdf.set_fill_color(254, 226, 226) # light red
            text_color = (153, 27, 27)
        elif status == "WARNING":
            pdf.set_fill_color(254, 243, 199) # light amber
            text_color = (146, 64, 14)
        else:
            pdf.set_fill_color(240, 253, 250) # light teal
            text_color = (13, 148, 136)

        pdf.set_text_color(51, 65, 85)
        pdf.cell(sla_widths[0], 7, name, border=1, align='L')
        pdf.cell(sla_widths[1], 7, target, border=1, align='C')
        pdf.cell(sla_widths[2], 7, actual, border=1, align='C')
        pdf.cell(sla_widths[3], 7, dev_val, border=1, align='C')
        
        pdf.set_text_color(*text_color)
        pdf.cell(sla_widths[4], 7, status, border=1, align='C', fill=True)
        pdf.ln()
    pdf.ln(6)

    # C. Shipment Comparison table
    pdf.set_font('helvetica', 'B', 10)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, 'DETAILED DELIVERY AUDIT LEDGER', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    led_headers = ["SKU / Product", "Date", "Quantity (Invoiced/Recv)", "Unit Cost (Invoiced/Actual)", "Defect Rate", "QC Result"]
    led_widths = [45, 25, 45, 45, 20, 15]

    pdf.set_font('helvetica', 'B', 8)
    pdf.set_fill_color(248, 250, 252)
    pdf.set_text_color(71, 85, 105)
    for i, h in enumerate(led_headers):
        pdf.cell(led_widths[i], 8, h, border=1, align='C', fill=True)
    pdf.ln()

    pdf.set_font('helvetica', '', 8)
    pdf.set_text_color(51, 65, 85)
    for s in audited:
        qty_str = f"{s.supplier_quantity} / {s.company_quantity}"
        cost_str = f"${s.supplier_cost:.2f} / ${s.company_cost:.2f}"
        defect_str = f"{s.company_defect_rate}%"
        res = s.company_inspection_result
        
        # Color row based on pass/fail
        if res == "Fail":
            pdf.set_fill_color(254, 242, 242) # extra light red
            text_color = (185, 28, 28)
        else:
            pdf.set_fill_color(255, 255, 255)
            text_color = (51, 65, 85)

        pdf.set_text_color(51, 65, 85)
        pdf.cell(led_widths[0], 6, clean_pdf_text(f"{s.sku} ({s.product_name})"), border=1, fill=True)
        pdf.cell(led_widths[1], 6, s.shipment_date.strftime('%Y-%m-%d'), border=1, align='C', fill=True)
        pdf.cell(led_widths[2], 6, qty_str, border=1, align='C', fill=True)
        pdf.cell(led_widths[3], 6, cost_str, border=1, align='C', fill=True)
        pdf.cell(led_widths[4], 6, defect_str, border=1, align='C', fill=True)
        
        pdf.set_text_color(*text_color)
        pdf.cell(led_widths[5], 6, res, border=1, align='C', fill=True)
        pdf.ln()
    pdf.ln(6)

    # D. AI Auditor Insights
    pdf.set_font('helvetica', 'B', 10)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 6, 'EXECUTIVE PERFORMANCE AUDIT & RECOMMENDATIONS', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    pdf.set_font('helvetica', 'B', 9)
    pdf.set_text_color(13, 148, 136) # Teal
    pdf.cell(0, 5, 'Executive Operational Summary:', new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(0, 4.5, clean_pdf_text(ai_report.get("executive_summary", "")))
    pdf.ln(3)

    pdf.set_font('helvetica', 'B', 9)
    pdf.set_text_color(13, 148, 136)
    pdf.cell(0, 5, 'Key Discrepancy Insights:', new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(71, 85, 105)
    for insight in ai_report.get("key_insights", []):
        pdf.cell(5, 5, '-')
        pdf.cell(0, 5, clean_pdf_text(insight), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font('helvetica', 'B', 9)
    pdf.set_text_color(13, 148, 136)
    pdf.cell(0, 5, 'Corrective SLA Recommendations:', new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 9)
    pdf.set_text_color(71, 85, 105)
    for rec in ai_report.get("recommendations", []):
        pdf.cell(5, 5, '*')
        pdf.cell(0, 5, clean_pdf_text(rec), new_x="LMARGIN", new_y="NEXT")

    # Output PDF to file
    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    filename = f"Supplier_{supplier_id}_Audit_Report_{request.year}_{request.month:02d}.pdf"
    safe_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        pdf.output(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report PDF: {str(e)}")

    # Add to SupplierDocument table
    supplier_doc = SupplierDocument(
        id=doc_id,
        supplier_id=supplier_id,
        filename=filename,
        file_type="application/pdf",
        category="audit",
        chunks_ingested=0,
        file_path=file_path,
        uploaded_by=uploaded_by
    )
    session.add(supplier_doc)
    session.commit()

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf"
    )
