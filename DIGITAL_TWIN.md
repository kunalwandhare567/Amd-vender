# Disruption-to-Impact Digital Twin Documentation

The **Disruption-to-Impact Digital Twin** is an interactive simulation workspace designed to visualize how logistics delays, weather events, and supplier incidents impact production, inventory levels, and revenues. It provides procurement officers with recommended sourcing actions to mitigate supply chain disruptions.

---

## 1. Core Features & How They Work

### A. Live Incident Integration (Database-Driven)
*   **Feature**: Selectable Event Dropdown (Incident Profile).
*   **How it Works**: The workspace loads live telematics and road incidents reported by drivers or detected by the system.
*   **Data Source**: **Database-Driven**. It makes a GET request to `/api/incidents` which queries the PostgreSQL/Supabase database `Incident` table. If the database is empty, it falls back to a default critical profile (e.g. Pune electronics hub flooding).

### B. Duration-to-Impact Simulation Scenarios (Simulation Templates)
*   **Feature**: 3, 7, 14, and 30-day disruption scenario selector.
*   **How it Works**: Users select a disruption duration to simulate the compounding operational impact over time.
*   **Data Source**: **Template/Approximated Data**. The cascading values (Production Impact, Inventory Shortage, Delayed Orders, Revenue Loss, Operating Costs, and Confidence Levels) are fetched from structured simulation matrices in the frontend state. These represent calculated industry-standard projections based on the severity of selected disruption durations.

### C. Cascading Impact Metrics
Displays simulated losses in real-time across six performance areas:
1.  **Production Impact**: Quantity of vehicles or products delayed (e.g., `-6,800 Vehicles`).
2.  **Inventory Shortages**: Depletion of raw items (e.g., `-4,900 Units`).
3.  **Delayed Orders**: Total impacted logistics agreements.
4.  **Revenue Loss**: Compound financial impact (e.g., `₹6.4 Crore`).
5.  **Operating Cost**: Premium transport or rerun costs.
6.  **Confidence Level**: AI forecasting certainty percentage (e.g., `88%`).

### E. Sourcing Actions (Interactive Actions)
Presents three mitigation options:
1.  **Automate Sourcing**: Navigates to the **Supplier Swap** portal (`/supplier-swap`) to execute database supplier substitutions.
2.  **Execute Reroute**: Triggers a simulated divergency notice (Cargos diverted via Mumbai Port).
3.  **File Notice**: Files a mock force majeure notice for contract compliance under Section 12.3.

---

## 2. Summary: Live Database vs. Simulation Templates

*   **Incident Selector**: **Live Database Data** (Queried from active `Incident` table records).
*   **Impact Metrics (Revenue, Qty, Costs)**: **Simulation Templates** (Configured as structured metrics relative to scenario duration).
*   **Supplier Swap Navigation**: **Interactive Sourcing** (Directly triggers DB swap sequences in the supplier pool).
