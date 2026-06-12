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
from models import Supplier, Alert, User, SLAMetric, Intervention, Driver, InvoiceTrip
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


def seed_drivers_and_trips(session):
    """Seed demo drivers and pre-built trips for the routing module."""
    from routers.routing import dijkstra, NODES
    import json as _json

    drivers = [
        Driver(id="DRV-001", name="Kunal Wandhare", phone="+91-9876543210", truck_no="MH-12-QW-5678", status="On Trip", current_lat=19.2183, current_lng=72.9781, supplier_id="SUP001"),
        Driver(id="DRV-002", name="Rajesh Sharma", phone="+91-9123456789", truck_no="MH-04-AB-1234", status="Available", current_lat=18.9388, current_lng=72.8354, supplier_id="SUP001"),
        Driver(id="DRV-003", name="Amit Patil", phone="+91-9988776655", truck_no="MH-14-CD-9012", status="Available", current_lat=18.5204, current_lng=73.8567, supplier_id="SUP002"),
        Driver(id="DRV-004", name="Suresh Jadhav", phone="+91-9112233445", truck_no="MH-43-EF-3456", status="Offline", current_lat=19.0330, current_lng=73.0297, supplier_id="SUP003"),
        Driver(id="DRV-005", name="Vikram Desai", phone="+91-9556677889", truck_no="MH-12-GH-7890", status="Available", current_lat=19.2967, current_lng=73.0631, supplier_id="SUP004"),
    ]
    for d in drivers:
        session.add(d)
    print(f"  Seeded {len(drivers)} drivers.")

    # Pre-built trips with Dijkstra routes
    trip_configs = [
        {
            "id": "TRIP-0001",
            "product_name": "Industrial Capacitors (Batch-C44)",
            "quantity": 500,
            "driver_id": "DRV-001",
            "supplier_id": "SUP001",
            "source": "Thane Warehouse",
            "dest": "Pimpri Chinchwad Plant",
            "status": "In Transit",
            "progress": 35.0,
            "est_arrival": "2026-06-11T14:00:00",
        },
        {
            "id": "TRIP-0002",
            "product_name": "Organic Face Cream (SKU-FC200)",
            "quantity": 1200,
            "driver_id": "DRV-002",
            "supplier_id": "SUP001",
            "source": "Mumbai Port",
            "dest": "Pune Chakan MIDC",
            "status": "Scheduled",
            "progress": 0.0,
            "est_arrival": "2026-06-12T10:00:00",
        },
        {
            "id": "TRIP-0003",
            "product_name": "Herbal Shampoo Concentrate",
            "quantity": 800,
            "driver_id": "DRV-005",
            "supplier_id": "SUP004",
            "source": "Bhiwandi Logistics",
            "dest": "Pune City Center",
            "status": "Scheduled",
            "progress": 0.0,
            "est_arrival": "2026-06-12T16:00:00",
        },
    ]

    for cfg in trip_configs:
        route = dijkstra(cfg["source"], cfg["dest"])
        src = NODES[cfg["source"]]
        dst = NODES[cfg["dest"]]

        trip = InvoiceTrip(
            id=cfg["id"],
            product_name=cfg["product_name"],
            quantity=cfg["quantity"],
            driver_id=cfg["driver_id"],
            supplier_id=cfg["supplier_id"],
            source_location=cfg["source"],
            source_lat=src["lat"],
            source_lng=src["lng"],
            destination_location=cfg["dest"],
            destination_lat=dst["lat"],
            destination_lng=dst["lng"],
            status=cfg["status"],
            route_json=_json.dumps(route["coordinates"]) if route else "[]",
            current_progress=cfg["progress"],
            est_arrival=cfg["est_arrival"],
        )
        session.add(trip)
    print(f"  Seeded {len(trip_configs)} invoice trips with Dijkstra routes.")


def seed_data():
    # Drop and recreate tables using CASCADE to handle dependent objects in Supabase
    from sqlalchemy import text
    with engine.connect() as conn:
        print("Dropping public schema with CASCADE...")
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        conn.commit()
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
                full_name="Kunal Wandhare",
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

        # Seed Drivers & Trips
        print("Seeding drivers and trips...")
        seed_drivers_and_trips(session)
        
        session.commit()
        print(f"\nDatabase seeded with {len(suppliers)} suppliers, {len(alerts)} alerts, SLA metrics, interventions, drivers, trips, and demo user accounts.")

if __name__ == "__main__":
    seed_data()

