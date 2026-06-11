"""
Reads the Kaggle supply_chain_data.csv and aggregates per-supplier.
Every field comes directly from the CSV — no invented data.
"""
import csv
import json
import os
from models import Supplier


def _csv_path() -> str:
    return os.path.join(os.path.dirname(__file__), "..", "kaggle_data", "supply_chain_data.csv")


def get_kaggle_suppliers() -> list[Supplier]:
    """Aggregate the product-level CSV rows into per-supplier records."""
    rows: list[dict] = []
    with open(_csv_path(), newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    # Group rows by supplier name
    suppliers_map: dict[str, list[dict]] = {}
    for row in rows:
        name = row["Supplier name"].strip()
        suppliers_map.setdefault(name, []).append(row)

    suppliers: list[Supplier] = []
    for idx, (name, prod_rows) in enumerate(sorted(suppliers_map.items()), start=1):
        n = len(prod_rows)

        # Aggregate per-supplier from raw CSV columns
        locations = sorted(set(r["Location"].strip() for r in prod_rows))
        product_types = sorted(set(r["Product type"].strip() for r in prod_rows))
        skus = set(r["SKU"].strip() for r in prod_rows)
        carriers = sorted(set(r["Shipping carriers"].strip() for r in prod_rows))
        transport_modes = sorted(set(r["Transportation modes"].strip() for r in prod_rows))
        route_list = sorted(set(r["Routes"].strip() for r in prod_rows))
        demographics = sorted(set(r["Customer demographics"].strip() for r in prod_rows))

        avg_price = sum(float(r["Price"]) for r in prod_rows) / n
        avg_availability = sum(float(r["Availability"]) for r in prod_rows) / n
        total_sold = sum(int(r["Number of products sold"]) for r in prod_rows)
        total_revenue = sum(float(r["Revenue generated"]) for r in prod_rows)
        avg_stock = sum(float(r["Stock levels"]) for r in prod_rows) / n
        avg_lead = sum(float(r["Lead times"]) for r in prod_rows) / n
        total_order_qty = sum(int(r["Order quantities"]) for r in prod_rows)
        avg_ship_time = sum(float(r["Shipping times"]) for r in prod_rows) / n
        avg_ship_cost = sum(float(r["Shipping costs"]) for r in prod_rows) / n
        total_prod_vol = sum(int(r["Production volumes"]) for r in prod_rows)
        avg_mfg_lead = sum(float(r["Manufacturing lead time"]) for r in prod_rows) / n
        avg_mfg_cost = sum(float(r["Manufacturing costs"]) for r in prod_rows) / n
        avg_defect = sum(float(r["Defect rates"]) for r in prod_rows) / n
        avg_total_cost = sum(float(r["Costs"]) for r in prod_rows) / n

        # Inspection pass rate: % of rows with "Pass" out of Pass/Fail (ignore Pending)
        inspected = [r for r in prod_rows if r["Inspection results"].strip() in ("Pass", "Fail")]
        if inspected:
            passed = sum(1 for r in inspected if r["Inspection results"].strip() == "Pass")
            inspection_pass = round(passed / len(inspected) * 100, 1)
        else:
            inspection_pass = 0.0

        suppliers.append(Supplier(
            supplier_id=f"SUP{idx:03d}",
            name=name,
            location=", ".join(locations),
            product_types=json.dumps(product_types),
            avg_price=round(avg_price, 2),
            avg_availability=round(avg_availability, 1),
            total_products_sold=total_sold,
            total_revenue=round(total_revenue, 2),
            avg_stock_level=round(avg_stock, 1),
            avg_lead_time=round(avg_lead, 1),
            total_order_quantity=total_order_qty,
            avg_shipping_time=round(avg_ship_time, 1),
            shipping_carriers=json.dumps(carriers),
            avg_shipping_cost=round(avg_ship_cost, 2),
            total_production_volume=total_prod_vol,
            avg_manufacturing_lead_time=round(avg_mfg_lead, 1),
            avg_manufacturing_cost=round(avg_mfg_cost, 2),
            defect_rate=round(avg_defect, 2),
            inspection_pass_rate=inspection_pass,
            transportation_modes=json.dumps(transport_modes),
            routes=json.dumps(route_list),
            avg_total_cost=round(avg_total_cost, 2),
            customer_demographics=json.dumps(demographics),
            num_skus=len(skus),
            # AI-evaluated fields — left None, filled later by AI
            overall_score=None,
            risk_level=None,
            otd_percentage=None,
        ))

    return suppliers
