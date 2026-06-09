"""
SQL Seed Script for Vendor-Verse (Supabase PostgreSQL)
Inserts hardcoded supplier, alert, SLA, and intervention data directly via SQL.
Connection string is loaded from Backend/.env (DATABASE_URL).
"""
import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path
from database import create_db_and_tables
import models  # import models to register in metadata

# Load DATABASE_URL from .env
load_dotenv(Path(__file__).parent / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in Backend/.env")


def execute_sql():
    # Ensure tables are created first using SQLModel metadata
    print("Creating tables if they do not exist...")
    create_db_and_tables()

    # Connect using the Supabase DATABASE_URL from .env
    print(f"Connecting to Supabase database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # To avoid conflicts/foreign key errors, clean out tables first
        # order is important because of foreign keys (slametric references supplier)
        print("Cleaning existing records from tables...")
        cur.execute("TRUNCATE TABLE slametric, alert, intervention, supplier CASCADE;")

        # 1. Supplier inserts
        print("Inserting supplier data...")
        supplier_sql = """
        INSERT INTO supplier (
            supplier_id, name, location, product_types, avg_price, avg_availability,
            total_products_sold, total_revenue, avg_stock_level, avg_lead_time,
            total_order_quantity, avg_shipping_time, shipping_carriers, avg_shipping_cost,
            total_production_volume, avg_manufacturing_lead_time, avg_manufacturing_cost,
            defect_rate, inspection_pass_rate, transportation_modes, routes,
            avg_total_cost, customer_demographics, num_skus,
            overall_score, risk_level, otd_percentage,
            created_at, updated_at
        ) VALUES
        ('SUP001', 'Glow Cosmetics', 'Mumbai, Delhi', '["skincare","cosmetics","makeup"]', 24.99, 85.5,
        125000, 3125000.0, 4500.0, 12.5, 158000, 4.2, '["Blue Dart","Delhivery"]', 2.5,
        140000, 10.0, 8.75, 2.3, 97.5, '["Road","Air"]', '["Mumbai-Delhi","Mumbai-Chennai"]',
        28.5, '["Female","Non-binary"]', 45, 87.2, 'Low', 94.5,
        '2025-02-01 08:00:00', '2025-02-15 12:00:00'),
        ('SUP002', 'Herbal Essence Ltd', 'Bangalore, Hyderabad', '["haircare","skincare","wellness"]', 18.5, 92.0,
        98000, 1813000.0, 3200.0, 8.2, 112000, 3.5, '["FedEx","India Post"]', 1.8,
        120000, 7.0, 6.2, 1.5, 98.2, '["Road","Rail"]', '["Bangalore-Chennai","Bangalore-Mumbai"]',
        21.4, '["Male","Female"]', 28, 92.4, 'Low', 96.8,
        '2025-02-01 08:00:00', '2025-02-15 12:00:00'),
        ('SUP003', 'EcoBeauty Solutions', 'Pune, Chennai', '["cosmetics","natural products","skincare"]', 32.0, 78.3,
        65000, 2080000.0, 2100.0, 15.0, 72000, 5.1, '["DHL","Blue Dart"]', 3.2,
        70000, 12.5, 11.0, 3.2, 95.8, '["Air","Road"]', '["Pune-Delhi","Pune-Kolkata"]',
        37.8, '["Female","Non-binary","Male"]', 62, 76.5, 'Medium', 88.2,
        '2025-02-01 08:00:00', '2025-02-15 12:00:00'),
        ('SUP004', 'Premier Haircare', 'Kolkata, Ahmedabad', '["haircare","styling tools"]', 45.75, 68.0,
        42000, 1921500.0, 950.0, 18.3, 51000, 6.8, '["UPS","Delhivery"]', 4.5,
        48000, 14.0, 16.5, 5.1, 93.2, '["Road","Air"]', '["Kolkata-Delhi","Kolkata-Mumbai"]',
        52.0, '["Female","Male"]', 35, 68.4, 'High', 79.5,
        '2025-02-01 08:00:00', '2025-02-15 12:00:00'),
        ('SUP005', 'Luxe Packaging & Supply', 'Noida, Jaipur', '["packaging","accessories","tools"]', 12.25, 95.5,
        210000, 2572500.0, 8700.0, 5.5, 225000, 2.9, '["XpressBees","Amazon Shipping"]', 1.2,
        230000, 4.0, 4.5, 0.8, 99.1, '["Road","Rail"]', '["Noida-Delhi","Jaipur-Mumbai"]',
        14.9, '["Male","Female"]', 50, 94.8, 'Low', 98.3,
        '2025-02-01 08:00:00', '2025-02-20 10:30:00');
        """
        cur.execute(supplier_sql)

        # 2. Alert inserts
        print("Inserting alert data...")
        alert_sql = """
        INSERT INTO alert (alert_id, supplier_id, supplier_name, type, severity, message, timestamp, status) VALUES
        ('ALT001', 'SUP004', 'Premier Haircare', 'Quality', 'Critical', 'Defect rate spiked to 8.2%% in last shipment – immediate inspection required', '2025-02-18 09:45:00', 'New'),
        ('ALT002', 'SUP003', 'EcoBeauty Solutions', 'Delivery', 'High', 'Order #PO-4587 delayed by 10 days due to port strike', '2025-02-20 14:30:00', 'Reviewed'),
        ('ALT003', 'SUP001', 'Glow Cosmetics', 'Contract', 'Medium', 'Contract renewal pending – pricing negotiation overdue', '2025-02-10 11:00:00', 'Resolved'),
        ('ALT004', 'SUP002', 'Herbal Essence Ltd', 'Quality', 'Low', 'Minor packaging damage reported on 2 cartons', '2025-02-22 08:20:00', 'New'),
        ('ALT005', 'SUP005', 'Luxe Packaging & Supply', 'Other', 'Medium', 'Carrier capacity shortage – possible shipping delay next week', '2025-02-23 16:10:00', 'New');
        """
        cur.execute(alert_sql)

        # 3. SLA Metric inserts
        print("Inserting SLA metric data...")
        sla_sql = """
        INSERT INTO slametric (
            id, supplier_id, supplier_name, metric, current, threshold, target, unit,
            status, deviation_percent, trend, updated_at
        ) VALUES
        ('SLA001', 'SUP001', 'Glow Cosmetics', 'lead_time', 13.2, 14.0, 10.0, 'days', 'warning', -5.7, 'up', '2025-02-23 23:59:00'),
        ('SLA002', 'SUP002', 'Herbal Essence Ltd', 'shipping_time', 3.4, 5.0, 3.0, 'days', 'compliant', -32.0, 'down', '2025-02-23 23:59:00'),
        ('SLA003', 'SUP003', 'EcoBeauty Solutions', 'quality_score', 94.2, 96.0, 98.0, '%%', 'breached', -1.9, 'stable', '2025-02-23 23:59:00'),
        ('SLA004', 'SUP004', 'Premier Haircare', 'inspection_rate', 89.5, 95.0, 99.0, '%%', 'breached', -5.8, 'down', '2025-02-23 23:59:00'),
        ('SLA005', 'SUP005', 'Luxe Packaging & Supply', 'lead_time', 5.2, 7.0, 4.0, 'days', 'warning', -25.7, 'stable', '2025-02-23 23:59:00');
        """
        cur.execute(sla_sql)

        # 4. Intervention inserts
        print("Inserting intervention data...")
        intervention_sql = """
        INSERT INTO intervention (
            id, type, category, priority, title, description,
            target_suppliers, actions, status, impact_risk_reduction,
            impact_cost_savings, impact_performance_improvement,
            estimated_duration, created_at
        ) VALUES
        ('INT001', 'ai_suggested', 'risk_mitigation', 'critical', 'Quality audit for Premier Haircare',
        'On-site quality audit and root cause analysis for rising defect rates',
        '["SUP004"]',
        '[{"action":"Schedule audit","due":"2025-03-01"},{"action":"Implement SPC charts","due":"2025-03-15"}]',
        'in_progress', 40.0, 0.0, 25.0, '30 days', '2025-02-19 08:00:00'),
        ('INT002', 'automated', 'performance_boost', 'high', 'Lead time reduction program',
        'Optimize logistics routes for EcoBeauty and Luxe Packaging',
        '["SUP003","SUP005"]',
        '[{"action":"Negotiate with alternate carriers","due":"2025-03-05"},{"action":"Consolidate shipments","due":"2025-03-10"}]',
        'pending', 15.0, 12000.0, 18.0, '14 days', '2025-02-21 10:30:00'),
        ('INT003', 'manual', 'relationship_building', 'medium', 'Supplier summit Q1 2025',
        'Quarterly business review and strategic alignment with all key suppliers',
        '["SUP001","SUP002","SUP003","SUP004","SUP005"]',
        '[{"action":"Send invitations","due":"2025-03-01"},{"action":"Prepare performance dashboards","due":"2025-03-10"}]',
        'pending', 5.0, 0.0, 10.0, '7 days', '2025-02-22 09:15:00'),
        ('INT004', 'ai_suggested', 'cost_optimization', 'medium', 'Shipping carrier rationalization',
        'Reduce shipping cost by consolidating carriers for Herbal Essence and Glow Cosmetics',
        '["SUP001","SUP002"]',
        '[{"action":"Analyze carrier performance","due":"2025-03-03"},{"action":"Renegotiate rates","due":"2025-03-20"}]',
        'pending', 8.0, 25000.0, 5.0, '21 days', '2025-02-23 13:45:00'),
        ('INT005', 'automated', 'performance_boost', 'low', 'Inventory buffer adjustment',
        'Increase safety stock for high-demand SKUs at Luxe Packaging',
        '["SUP005"]',
        '[{"action":"Run demand forecast","due":"2025-02-28"},{"action":"Update inventory parameters","due":"2025-03-05"}]',
        'completed', 3.0, 5000.0, 12.0, '5 days', '2025-02-18 16:20:00');
        """
        cur.execute(intervention_sql)

        # Commit transaction
        conn.commit()
        print("All SQL records inserted successfully into Supabase!")

    except Exception as e:
        conn.rollback()
        print(f"Failed to execute SQL: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    execute_sql()
