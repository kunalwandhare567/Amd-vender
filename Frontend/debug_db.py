from sqlmodel import Session, select
from backend.database import engine
from backend.models import Supplier, Alert

def verify():
    with open("db_output.txt", "w") as f:
        f.write("Verifying database content...\n")
        try:
            with Session(engine) as session:
                suppliers = session.exec(select(Supplier)).all()
                alerts = session.exec(select(Alert)).all()
                f.write(f"Suppliers count: {len(suppliers)}\n")
                f.write(f"Alerts count: {len(alerts)}\n")
                
                if len(suppliers) > 0:
                    f.write(f"Sample Supplier: {suppliers[0].name}\n")
                else:
                    f.write("No suppliers found!\n")
                    
                if len(alerts) > 0:
                    f.write(f"Sample Alert: {alerts[0].message}\n")
                else:
                    f.write("No alerts found!\n")
        except Exception as e:
            f.write(f"Error connecting to database: {e}\n")

if __name__ == "__main__":
    verify()
