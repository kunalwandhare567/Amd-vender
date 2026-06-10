"""
Seed script:
1. Read Kaggle CSV → insert raw supplier data
2. Call AI to evaluate overall_score, risk_level, otd_percentage per supplier
3. Seed alerts, SLA metrics, interventions

Database: Supabase PostgreSQL (configured via DATABASE_URL in Backend/.env)
"""
import os
import json
from dotenv import load_dotenv
from sqlmodel import Session, select, SQLModel
from database import engine, create_db_and_tables
from models import Supplier, Alert, User, SLAMetric, Intervention
from auth.security import get_password_hash
from seed_data.suppliers import get_kaggle_suppliers
from seed_data.alerts import get_realistic_alerts
from seed_data.sla import generate_sla_metrics
from seed_data.interventions import generate_interventions

# Load env for LLM API keys (same directory as this script)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)


def ai_evaluate_suppliers(suppliers: list[Supplier]) -> None:
    """Use AI to compute overall_score, risk_level, otd_percentage for each supplier."""
    print("AI-evaluating suppliers (overall_score, risk_level, otd_percentage)...")

    try:
        from llm import get_llm
        from langchain_core.messages import HumanMessage

        llm = get_llm(temperature=0.3)

        supplier_data = []
        for s in suppliers:
            supplier_data.append({
                "id": s.supplier_id,
                "name": s.name,
                "defect_rate": s.defect_rate,
                "inspection_pass_rate": s.inspection_pass_rate,
                "avg_lead_time": s.avg_lead_time,
                "avg_shipping_time": s.avg_shipping_time,
                "avg_manufacturing_lead_time": s.avg_manufacturing_lead_time,
                "avg_shipping_cost": s.avg_shipping_cost,
                "avg_manufacturing_cost": s.avg_manufacturing_cost,
                "avg_total_cost": s.avg_total_cost,
                "total_revenue": s.total_revenue,
                "total_products_sold": s.total_products_sold,
                "avg_stock_level": s.avg_stock_level,
                "avg_availability": s.avg_availability,
            })

        prompt = f"""You are a supply chain analyst. Evaluate each supplier and compute three metrics:

SUPPLIER DATA:
{json.dumps(supplier_data, indent=2)}

For each supplier compute:
1. overall_score (0-100): A composite performance score weighing defect rate (lower=better), inspection pass rate (higher=better), lead times (lower=better), costs (lower=better relative to revenue), and availability.
2. risk_level: "Low", "Medium", "High", or "Critical" based on the overall health of the supplier.
3. otd_percentage: Estimated on-time delivery percentage (0-100) based on lead times, shipping times, and manufacturing lead times compared to industry standards.

Return a JSON array where each object has: "id" (supplier_id), "overall_score" (number), "risk_level" (string), "otd_percentage" (number).

Output ONLY valid JSON, no markdown."""

        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        evaluations = json.loads(content.strip())

        # Apply evaluations to supplier objects
        eval_map = {e["id"]: e for e in evaluations}
        for s in suppliers:
            if s.supplier_id in eval_map:
                ev = eval_map[s.supplier_id]
                s.overall_score = ev.get("overall_score")
                s.risk_level = ev.get("risk_level")
                s.otd_percentage = ev.get("otd_percentage")
                print(f"  {s.name}: score={s.overall_score}, risk={s.risk_level}, otd={s.otd_percentage}%")

    except Exception as e:
        print(f"AI evaluation failed: {e}")
        print("Falling back to rule-based evaluation...")
        for s in suppliers:
            # Simple rule-based fallback
            score = 100.0
            score -= s.defect_rate * 10        # penalise defects
            score -= max(0, s.avg_lead_time - 15) * 2  # penalise long lead times
            score += s.inspection_pass_rate * 0.2  # reward high inspection pass
            score = max(0, min(100, score))
            s.overall_score = round(score, 1)
            
            if score >= 75:
                s.risk_level = "Low"
            elif score >= 55:
                s.risk_level = "Medium"
            elif score >= 35:
                s.risk_level = "High"
            else:
                s.risk_level = "Critical"
            
            # Estimate OTD from lead/shipping times
            otd = 100 - (max(0, s.avg_lead_time - 12) * 1.5) - (max(0, s.avg_shipping_time - 4) * 2)
            s.otd_percentage = round(max(50, min(99, otd)), 1)
            print(f"  {s.name}: score={s.overall_score}, risk={s.risk_level}, otd={s.otd_percentage}% (rule-based)")


def seed_data():
    # Drop and recreate tables (schema changed)
    SQLModel.metadata.drop_all(engine)
    create_db_and_tables()
    
    with Session(engine) as session:
        
        print("Reading suppliers from Kaggle CSV...")
        suppliers = get_kaggle_suppliers()
        
        # AI evaluation for computed fields
        ai_evaluate_suppliers(suppliers)
        
        print(f"Seeding {len(suppliers)} suppliers...")
        for supplier in suppliers:
            session.add(supplier)
        session.flush()
            
        print("Seeding alerts...")
        alerts = get_realistic_alerts(suppliers)
        for alert in alerts:
            session.add(alert)

        print("Seeding SLA metrics...")
        for supplier in suppliers:
            metrics = generate_sla_metrics(supplier)
            for metric in metrics:
                session.add(metric)

        print("Seeding interventions...")
        interventions = generate_interventions(suppliers)
        for intervention in interventions:
            session.add(intervention)

        # Seed Admin User
        admin_email = "admin@supplier.com"
        existing_admin = session.exec(select(User).where(User.email == admin_email)).first()
        if not existing_admin:
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash("admin123"),
                full_name="System Admin",
                role="admin"
            )
            session.add(admin_user)
            print("Admin user created.")

        # Seed Driver User
        driver_email = "driver@supplier.com"
        existing_driver = session.exec(select(User).where(User.email == driver_email)).first()
        if not existing_driver:
            driver_user = User(
                email=driver_email,
                password_hash=get_password_hash("driver123"),
                full_name="Ramesh Kumar (Pune Driver)",
                role="driver"
            )
            session.add(driver_user)
            print("Driver user created.")

        # Seed Supplier User
        supplier_email = "supplier@supplier.com"
        existing_supplier = session.exec(select(User).where(User.email == supplier_email)).first()
        if not existing_supplier:
            supplier_user = User(
                email=supplier_email,
                password_hash=get_password_hash("supplier123"),
                full_name="ElectroDrive Support",
                role="supplier"
            )
            session.add(supplier_user)
            print("Supplier user created.")
        
        session.commit()
        print(f"\nDatabase seeded with {len(suppliers)} suppliers, {len(alerts)} alerts, SLA metrics, interventions, and demo user accounts.")

if __name__ == "__main__":
    seed_data()
