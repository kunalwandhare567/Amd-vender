// Mock data based on the Kaggle Supply Chain Analysis dataset

export interface Supplier {
  supplier_id: string;
  name: string;
  // Kaggle CSV fields
  location: string;
  product_types: string;
  avg_price: number;
  avg_availability: number;
  total_products_sold: number;
  total_revenue: number;
  avg_stock_level: number;
  avg_lead_time: number;
  total_order_quantity: number;
  avg_shipping_time: number;
  shipping_carriers: string;
  avg_shipping_cost: number;
  total_production_volume: number;
  avg_manufacturing_lead_time: number;
  avg_manufacturing_cost: number;
  defect_rate: number;
  inspection_pass_rate: number;
  transportation_modes: string;
  routes: string;
  avg_total_cost: number;
  customer_demographics: string;
  num_skus: number;
  // AI-evaluated fields
  overall_score: number | null;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical' | null;
  otd_percentage: number | null;
}

export interface Alert {
  alert_id: string;
  supplier_id: string;
  supplier_name: string;
  type: 'Quality' | 'Delivery' | 'Contract' | 'Other';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  timestamp: string;
  status: 'New' | 'Reviewed' | 'Resolved';
}

export interface PerformanceSummary {
  summary_id: string;
  supplier_id: string;
  summary_text: string;
  generated_date: string;
  key_insights: string[];
  risk_flags: string[];
  data_sources_used: string[];
}

export interface PurchaseOrder {
  po_id: string;
  supplier_id: string;
  order_date: string;
  delivery_due_date: string;
  actual_delivery_date: string | null;
  status: 'Ordered' | 'Shipped' | 'Delivered' | 'Cancelled';
  total_value_usd: number;
}

export interface QualityReport {
  report_id: string;
  po_id: string;
  supplier_id: string;
  inspection_date: string;
  defect_count: number;
  total_inspected_quantity: number;
  defect_type: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface DeliveryLog {
  delivery_id: string;
  po_id: string;
  supplier_id: string;
  shipment_date: string;
  received_date: string;
  transport_mode: string;
  delivery_status: 'OnTime' | 'Delayed';
  delay_days: number;
  damage_reported: boolean;
}

export const suppliers: Supplier[] = [
  {
    supplier_id: "SUP-001",
    name: "Supplier 1",
    location: "Bangalore, Chennai, Delhi, Kolkata, Mumbai",
    product_types: '["cosmetics","haircare","skincare"]',
    avg_price: 59.23,
    avg_availability: 45.2,
    total_products_sold: 11080,
    total_revenue: 157529,
    avg_stock_level: 42.3,
    avg_lead_time: 16.8,
    total_order_quantity: 1458,
    avg_shipping_time: 6.1,
    shipping_carriers: '["Carrier A","Carrier B","Carrier C"]',
    avg_shipping_cost: 5.51,
    total_production_volume: 13545,
    avg_manufacturing_lead_time: 18.2,
    avg_manufacturing_cost: 45.25,
    defect_rate: 1.80,
    inspection_pass_rate: 48.1,
    transportation_modes: '["Air","Rail","Road","Sea"]',
    routes: '["Route A","Route B","Route C"]',
    avg_total_cost: 220.50,
    customer_demographics: '["Female","Male","Non-binary"]',
    num_skus: 27,
    overall_score: 82,
    risk_level: "Low",
    otd_percentage: 93.0,
  },
  {
    supplier_id: "SUP-002",
    name: "Supplier 2",
    location: "Bangalore, Chennai, Delhi, Kolkata, Mumbai",
    product_types: '["cosmetics","haircare","skincare"]',
    avg_price: 46.54,
    avg_availability: 38.5,
    total_products_sold: 11068,
    total_revenue: 125467,
    avg_stock_level: 46.5,
    avg_lead_time: 16.2,
    total_order_quantity: 1022,
    avg_shipping_time: 5.5,
    shipping_carriers: '["Carrier A","Carrier B","Carrier C"]',
    avg_shipping_cost: 5.74,
    total_production_volume: 14105,
    avg_manufacturing_lead_time: 19.0,
    avg_manufacturing_cost: 41.62,
    defect_rate: 2.36,
    inspection_pass_rate: 22.7,
    transportation_modes: '["Air","Rail","Road","Sea"]',
    routes: '["Route A","Route B","Route C"]',
    avg_total_cost: 195.80,
    customer_demographics: '["Female","Male","Non-binary"]',
    num_skus: 22,
    overall_score: 58,
    risk_level: "High",
    otd_percentage: 78.0,
  },
  {
    supplier_id: "SUP-003",
    name: "Supplier 3",
    location: "Bangalore, Chennai, Delhi, Kolkata, Mumbai",
    product_types: '["cosmetics","haircare","skincare"]',
    avg_price: 47.64,
    avg_availability: 42.0,
    total_products_sold: 8482,
    total_revenue: 97796,
    avg_stock_level: 44.3,
    avg_lead_time: 16.5,
    total_order_quantity: 1050,
    avg_shipping_time: 5.7,
    shipping_carriers: '["Carrier A","Carrier B","Carrier C"]',
    avg_shipping_cost: 5.40,
    total_production_volume: 11540,
    avg_manufacturing_lead_time: 17.8,
    avg_manufacturing_cost: 47.87,
    defect_rate: 2.47,
    inspection_pass_rate: 13.3,
    transportation_modes: '["Air","Rail","Road","Sea"]',
    routes: '["Route A","Route B","Route C"]',
    avg_total_cost: 210.00,
    customer_demographics: '["Female","Male","Non-binary"]',
    num_skus: 20,
    overall_score: 45,
    risk_level: "Critical",
    otd_percentage: 72.0,
  },
  {
    supplier_id: "SUP-004",
    name: "Supplier 4",
    location: "Bangalore, Chennai, Delhi, Kolkata, Mumbai",
    product_types: '["cosmetics","haircare","skincare"]',
    avg_price: 52.08,
    avg_availability: 40.1,
    total_products_sold: 8760,
    total_revenue: 86469,
    avg_stock_level: 49.2,
    avg_lead_time: 17.0,
    total_order_quantity: 1182,
    avg_shipping_time: 5.7,
    shipping_carriers: '["Carrier A","Carrier B","Carrier C"]',
    avg_shipping_cost: 5.65,
    total_production_volume: 11175,
    avg_manufacturing_lead_time: 21.5,
    avg_manufacturing_cost: 62.71,
    defect_rate: 1.84,
    inspection_pass_rate: 0.0,
    transportation_modes: '["Air","Rail","Road","Sea"]',
    routes: '["Route A","Route B","Route C"]',
    avg_total_cost: 248.30,
    customer_demographics: '["Female","Male","Non-binary"]',
    num_skus: 20,
    overall_score: 38,
    risk_level: "Critical",
    otd_percentage: 68.0,
  },
  {
    supplier_id: "SUP-005",
    name: "Supplier 5",
    location: "Bangalore, Chennai, Delhi, Kolkata, Mumbai",
    product_types: '["cosmetics","haircare","skincare"]',
    avg_price: 49.32,
    avg_availability: 35.8,
    total_products_sold: 9878,
    total_revenue: 110002,
    avg_stock_level: 48.1,
    avg_lead_time: 14.7,
    total_order_quantity: 1340,
    avg_shipping_time: 6.2,
    shipping_carriers: '["Carrier A","Carrier B","Carrier C"]',
    avg_shipping_cost: 5.30,
    total_production_volume: 12600,
    avg_manufacturing_lead_time: 16.5,
    avg_manufacturing_cost: 46.88,
    defect_rate: 2.67,
    inspection_pass_rate: 16.7,
    transportation_modes: '["Air","Rail","Road","Sea"]',
    routes: '["Route A","Route B","Route C"]',
    avg_total_cost: 205.10,
    customer_demographics: '["Female","Male","Non-binary"]',
    num_skus: 18,
    overall_score: 55,
    risk_level: "High",
    otd_percentage: 74.0,
  },
];

export const alerts: Alert[] = [
  {
    alert_id: "ALT-101",
    supplier_id: "SUP-003",
    supplier_name: "Shenzhen Electronics Co.",
    type: "Delivery",
    severity: "Critical",
    message: "Critical Shipment Delay: Containers stuck at Shenzhen port due to unexpected customs audit. Impacting Order #PO-2024-889. Expected delay: 14 days.",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: "New"
  },
  {
    alert_id: "ALT-102",
    supplier_id: "SUP-007",
    supplier_name: "Mumbai Textiles Group",
    type: "Quality",
    severity: "High",
    message: "Quality Control Failure: Batch #TX-992 rejected due to color fastness falling below ISO-105 standards. 15% defect rate in sample.",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    status: "New"
  },
  {
    alert_id: "ALT-103",
    supplier_id: "SUP-002",
    supplier_name: "Global Logistics Partners",
    type: "Contract",
    severity: "Medium",
    message: "SLA Warning: On-time delivery metric dropped to 88% (Contract minimum: 90%) for Q1 2025. Penalty clause may trigger.",
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    status: "Reviewed"
  },
  {
    alert_id: "ALT-104",
    supplier_id: "SUP-012",
    supplier_name: "Guadalajara Plastics",
    type: "Delivery",
    severity: "Medium",
    message: "Production Capacity Constraints: Supplier reports 20% capacity reduction due to machinery maintenance. Lead times extended by 5 days.",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    status: "New"
  },
  {
    alert_id: "ALT-105",
    supplier_id: "SUP-015",
    supplier_name: "Cairo Textiles",
    type: "Other",
    severity: "High",
    message: "Financial Risk Indicator: Credit rating downgrade reported by external agency. Watchlist status recommended.",
    timestamp: new Date(Date.now() - 604800000).toISOString(),
    status: "Reviewed"
  },
  {
    alert_id: "ALT-106",
    supplier_id: "SUP-019",
    supplier_name: "Bangkok Electronics",
    type: "Quality",
    severity: "Critical",
    message: "Component Recall: Serious defect found in Capacitor-X7 series. Stop-ship order issued immediately.",
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    status: "New"
  },
  {
    alert_id: "ALT-107",
    supplier_id: "SUP-001",
    supplier_name: "TechFlow Systems",
    type: "Contract",
    severity: "Low",
    message: "Contract Renewal Upcoming: Master Service Agreement expires in 90 days. Initiate renewal discussions.",
    timestamp: new Date(Date.now() - 432000000).toISOString(),
    status: "Reviewed"
  },
  {
    alert_id: "ALT-108",
    supplier_id: "SUP-005",
    supplier_name: "Rio Components Ltda",
    type: "Delivery",
    severity: "Medium",
    message: "Logistics Disruption: Regional truck drivers strike in Brazil may affect outbound shipments next week.",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    status: "New"
  },
  {
    alert_id: "ALT-110",
    supplier_id: "SUP-010",
    supplier_name: "Vietnam Assembly Partners",
    type: "Delivery",
    severity: "High",
    message: "Material Shortage: Supplier unable to source raw copper for Order #PO-991. Production halted indefinitely.",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: "New"
  }
];

export const performanceSummaries: Record<string, PerformanceSummary> = {
  'SUP-001': {
    summary_id: 'SUM-101',
    supplier_id: 'SUP-001',
    summary_text: 'TechFlow Systems maintains excellent performance metrics across the board. Recent audit confirms 100% compliance with new ESG standards. Suggest leveraging their stability for critical Q4 projects.',
    generated_date: '2024-12-04T10:00:00Z',
    key_insights: [
      'Top-tier performance stability',
      'Zero critical defects in 12 months',
      'ESG leader in North America region'
    ],
    risk_flags: [],
    data_sources_used: ['PurchaseOrders', 'QualityReports', 'ESGData'],
  },
  'SUP-003': {
    summary_id: 'SUM-103',
    supplier_id: 'SUP-003',
    summary_text: 'Shenzhen Electronics Co. is facing significant logistical headwinds. Port congestion has increased average lead time by 14 days. Quality remains acceptable but delivery unpredictability is a major risk.',
    generated_date: '2024-12-04T09:00:00Z',
    key_insights: [
      'Severe port congestion impact',
      'Lead time variance +40%',
      'Quality stable'
    ],
    risk_flags: [
      'Logistical bottleneck',
      'Single point of failure for APAC region'
    ],
    data_sources_used: ['PurchaseOrders', 'DeliveryLogs', 'LogisticsData'],
  }
};

export const purchaseOrders: PurchaseOrder[] = [
  { po_id: 'PO-2024-889', supplier_id: 'SUP-003', order_date: '2024-11-15', delivery_due_date: '2024-12-01', actual_delivery_date: null, status: 'Shipped', total_value_usd: 125000 },
  { po_id: 'PO-2024-991', supplier_id: 'SUP-010', order_date: '2024-11-20', delivery_due_date: '2024-12-05', actual_delivery_date: null, status: 'Ordered', total_value_usd: 89000 },
];

export const qualityReports: QualityReport[] = [
  { report_id: 'QR-992', po_id: 'PO-2024-889', supplier_id: 'SUP-007', inspection_date: '2024-11-30', defect_count: 150, total_inspected_quantity: 1000, defect_type: 'Color Fastness', severity: 'High' },
];

export const deliveryLogs: DeliveryLog[] = [
  { delivery_id: 'DL-889', po_id: 'PO-2024-889', supplier_id: 'SUP-003', shipment_date: '2024-11-25', received_date: '2024-11-30', transport_mode: 'Sea', delivery_status: 'Delayed', delay_days: 14, damage_reported: false },
];

// AI Agent Configuration
export const aiAgent = {
  name: 'VendorVerse AI Assistant',
  version: '2.5.0',
  description: 'Advanced AI-powered analytics engine for supplier performance monitoring and risk detection.',
  capabilities: [
    'Real-time performance anomaly detection',
    'Natural language summary generation',
    'Predictive risk scoring',
    'Root cause analysis',
    'Contract compliance monitoring',
    'Trend forecasting',
  ],
  models_used: [
    { name: 'Performance Analyzer', type: 'Time Series Analysis', accuracy: '94.2%' },
    { name: 'Risk Predictor', type: 'Classification Model', accuracy: '91.8%' },
    { name: 'Summary Generator', type: 'Large Language Model', accuracy: '96.5%' },
    { name: 'Anomaly Detector', type: 'Unsupervised Learning', accuracy: '89.3%' },
  ],
  data_refresh_interval: '15 minutes',
  last_model_update: '2024-12-01',
};
