# VendorVerse 3.0 – Service Level Agreement (SLA) Monitoring Feature

This document explains the **SLA Monitoring** module in VendorVerse 3.0, including the business problems it solves, its capability for supplier-wise analytics, the decision-making data it exposes, and ideas/steps for future upgrades.

---

## 1. Feature Overview & Problem Solved

### What is it?
The SLA (Service Level Agreement) Monitoring feature tracks whether your active suppliers are meeting their contractually agreed-upon operational performance targets. 

### What Problems Does It Solve?
1. **Lack of Operational Visibility**: Instead of waiting until a supplier misses a shipment to realize there is a problem, the SLA Monitor tracks metrics relative to thresholds in real-time, catching warnings before they trigger breaches.
2. **Supplier Accountability**: Keeps a clear, auditable "report card" of each supplier's performance, eliminating disputes about quality, speed, or response times.
3. **Siloed Performance Data**: Aggregates raw data (lead times, defect rates) into readable percentages and compliance states (`Compliant`, `Warning`, `Breached`).
4. **Crisis Prevention**: Helps dispatchers and procurement managers identify at-a-glance which vendors are dropping in performance trend lines (`up`, `down`, `stable`).

---

## 2. Supplier-Wise Analytics: What It Provides

Every metric in the database is linked directly to a specific supplier via `supplier_id` and `supplier_name`. The system calculates metrics individually for each supplier:

### A. The Core Metrics Tracked
*   **Lead Time / Delivery Time**:
    *   *Target:* 12 Days (Ideal)
    *   *Threshold:* 20 Days (Maximum Acceptable)
    *   *Unit:* Days
*   **Shipping Time**:
    *   *Target:* 4 Days (Ideal)
    *   *Threshold:* 7 Days (Maximum Acceptable)
    *   *Unit:* Days
*   **Quality Score**:
    *   *Target:* 99.0% (Ideal, derived from defect rate)
    *   *Threshold:* 97.0% (Minimum Acceptable)
    *   *Unit:* %
*   **Inspection Pass Rate**:
    *   *Target:* 90.0% (Ideal)
    *   *Threshold:* 60.0% (Minimum Acceptable)
    *   *Unit:* %

### B. Analytical Properties for Each Supplier
For every supplier metric, the dashboard evaluates:
1. **Current Score**: The actual value computed from the database.
2. **Deviation Percentage**: The exact percentage deviation from the target value.
3. **Trend Tracking**: Visual indicators for whether the supplier's performance is moving **Up**, **Down**, or remaining **Stable**.
4. **State-Level Filtering**: Instantly filters metrics globally by `Breached`, `Warning`, or `Compliant` states.

---

## 3. How "Service Lack" (Performance Deficit) is Calculated

"Service Lack" is mathematically represented in the database as the **`deviation_percent`**. It represents how far a supplier's actual performance fell short of the contractual target. 

The calculation depends on the specific metric type:

### A. For Metrics Where "Lower is Better" (Lead Time & Shipping Time)
A higher number represents a performance deficit (taking longer than target).
*   **Data Source**: `supplier.avg_lead_time` and `supplier.avg_shipping_time` (historically tracked supplier logistics data).
*   **Formula**:
    $$\text{Service Lack (Deviation \%)} = \frac{\text{Actual Time} - \text{Target Time}}{\text{Target Time}} \times 100$$
    *Example*: If a supplier takes 16 days to deliver against a target of 12 days, they have a **33.3% service lack / deviation** ($[16 - 12] / 12 \times 100$).

### B. For Metrics Where "Higher is Better" (Quality Score & Inspection Pass Rate)
A lower number represents a performance deficit (failing quality targets).
*   **Data Source**: `supplier.defect_rate` and `supplier.inspection_pass_rate` (factory quality inspect rates).
*   **Formula (Quality)**:
    $$\text{Service Lack (Deviation \%)} = \frac{\text{Actual Defect Rate} - \text{Target Defect Rate}}{\text{Target Defect Rate}} \times 100$$
    *Example*: If the target defect rate is 1% and the supplier's defect rate is 1.8%, they have an **80% quality deficit** ($[1.8 - 1] / 1 \times 100$).
*   **Formula (Inspection Pass Rate)**:
    $$\text{Service Lack (Deviation \%)} = \frac{\text{Target Pass Rate} - \text{Actual Pass Rate}}{\text{Target Pass Rate}} \times 100$$
    *Example*: If the target pass rate is 90% and the supplier's pass rate is 68.4%, they have a **24% inspection deficit** ($[90 - 68.4] / 90 \times 100$).

---

## 4. Who Updates the Inspection Pass Rate, and When?

The `inspection_pass_rate` indicates the percentage of historical inventory batches that passed our Quality Control (QC) inspections. 

### Who Updates It?
1. **The Administrator / Operations Manager**: 
   When onboarding a supplier, the administrator uploads historical records (PDF, CSV, or Excel catalogs/invoices) or inputs product rows manually.
2. **The System Setup (Database Seeder)**: 
   During initial database seeding, the `seed.py` script automatically processes the historical Kaggle supply chain dataset to calculate the baseline score.

### When is it Updated?
1. **On New Supplier Creation / Uploads**:
   Whenever a new supplier is onboarded via the API (`POST /api/suppliers/` inside [routers/suppliers.py](file:///d:/AMDTcs/AMD/Amd-vender/Backend/routers/suppliers.py#L665)), the system aggregates all product rows.
   *   It checks the `inspection_result` of each product row (must be either `"Pass"` or `"Fail"`).
   *   It calculates the rate using:
       $$\text{inspection\_pass\_rate} = \frac{\text{Passed Inspections}}{\text{Total Inspections}} \times 100$$
   *   *Fallback*: If no product rows contain inspection data, it defaults to **`50.0%`**.
2. **On SLA Analysis Execution**:
   When the AI SLA job (`POST /api/sla/analyze` inside [routers/sla.py](file:///d:/AMDTcs/AMD/Amd-vender/Backend/routers/sla.py#L27)) runs, it reads the current `inspection_pass_rate` from the supplier table and maps it to the corresponding `SLAMetric` status.

### Operational Update Frequencies (Monthly vs. Quarterly)
When new quality control/inspection logs arrive from clients or factory floor reports, the administrator can upload the new batch sheets to update the database values. 

The update schedule is typically chosen based on product criticality:
*   **Monthly Updates**: 
    Used for **critical suppliers** (e.g., microchips, engine sensors, complex medical parts). Because quality failures in these parts immediately stop production, the inspection pass rates are processed **monthly** to catch defect spikes early.
*   **Quarterly Updates**: 
    Used for **commodity or packaging suppliers** (e.g., cardboard boxes, standard screws, pallets). Since these present low operational risk and defects are easy to swap, quality logs are aggregated and processed **quarterly** to review overall contract health.

---

## 5. Data Used to Drive Decisions

The SLA Monitor provides raw and synthesized data points that directly feed into the platform's decision-making workflows:

| Data Point | Description | Actionable Business Decision |
| :--- | :--- | :--- |
| **`status = breached`** | Supplier has crossed the maximum allowed threshold (e.g. delivery is over 20 days). | **Supplier Swap (RFQ Autopilot)**: Triggers an automated search for alternative vendors to substitute the breached supplier. |
| **`trend = down`** | Performance is steadily worsening over time. | **Contract Penalties / Auditing**: Triggers an alert or intervention playbook to schedule an emergency quality check or issue warning notes. |
| **`deviation_percent`** | Exact mathematical gap between target contract terms and current execution. | **Financial Penalties**: Automatically calculates penalty clauses on monthly invoices based on SLA deviation parameters. |
| **`inspection_rate`** | The percentage of inspections that passed quality control. | **Logistics Shifts**: Shifting critical supply volume away from low-performing inspection vendors towards safer backups. |

---

## 6. How to Upgrade & Add More Features

Here is a step-by-step roadmap to upgrade and expand the SLA Monitoring capability:

### Upgradability Path 1: User-Defined SLA Targets (Admin settings)
*   **Goal**: Allow administrators to manually customize thresholds and targets in the frontend rather than relying on hardcoded seeding or AI generation.
*   **How to implement**:
    1. Create a `PUT /api/sla/{id}` endpoint in [routers/sla.py](file:///d:/AMDTcs/AMD/Amd-vender/Backend/routers/sla.py) to update `target` and `threshold`.
    2. Add an "Edit SLA" modal in the frontend [SLAMonitor.tsx](file:///d:/AMDTcs/AMD/Amd-vender/Frontend/src/pages/SLAMonitor.tsx) that fires this API request.

### Upgradability Path 2: Automated Slack/Email Notifications for Breaches
*   **Goal**: Instantly notify the supply chain team when an SLA transitions to a `breached` state.
*   **How to implement**:
    1. Integrate a notifier library (e.g., SMTP or SendGrid client) into [routers/sla.py](file:///d:/AMDTcs/AMD/Amd-vender/Backend/routers/sla.py).
    2. During the metrics evaluation logic, if a metric transitions to `breached`, call:
       ```python
       send_email_alert(supplier_name, metric, current_value)
       ```

### Upgradability Path 3: Direct Integration with Invoice Penalties
*   **Goal**: Automatically apply financial penalty discounts on invoice settlements when SLAs are breached.
*   **How to implement**:
    1. When processing invoices, fetch the `SLAMetric` status for the billing period.
    2. Apply logic:
       ```python
       if metric.status == "breached":
           invoice.total_amount -= (invoice.total_amount * 0.05) # Apply 5% SLA penalty
       ```

### Upgradability Path 4: LLM-Driven Smart SLA Recommendations
*   **Goal**: Use AI to inspect the history of performance and recommend adjustments to supplier contracts.
*   **How to implement**:
    1. Query historical SQLModel SLA trend data.
    2. Send it to your LLM agent in `Backend/agents/risk_agent.py` to draft recommended contract updates, e.g.: *"Supplier A averages 18-day lead times. Re-negotiate contract target from 12 days to 16 days to reflect physical limits."*

---

## 7. Key Files Reference

*   **Database Definitions**: [models.py](file:///d:/AMDTcs/AMD/Amd-vender/Backend/models.py#L63-L75) – Declares the `SLAMetric` schema structure.
*   **API Router Endpoints**: [sla.py](file:///d:/AMDTcs/AMD/Amd-vender/Backend/routers/sla.py) – Hosts the `GET` endpoint to list metrics and `POST` endpoint to trigger AI analysis.
*   **Rule-Based Seeding**: [sla.py (Seeding Script)](file:///d:/AMDTcs/AMD/Amd-vender/Backend/seed_data/sla.py) – Generates initial mathematical SLA data on setup based on Kaggle CSV records.
*   **Frontend UI Pages**: [SLAMonitor.tsx](file:///d:/AMDTcs/AMD/Amd-vender/Frontend/src/pages/SLAMonitor.tsx) – Contains the main view rendering performance cards, progress indicators, trends, status tags, and filters.
