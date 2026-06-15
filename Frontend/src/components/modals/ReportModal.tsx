import { useState, useEffect } from 'react';
import { Supplier } from '@/data/mockData';
import { api } from '@/lib/api';

interface ReportModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AiReport {
  supplier_id: string;
  summary_text: string;
  generated_date: string;
  key_insights: string[];
  risk_flags: string[];
  data_sources_used: string[];
  supplier?: {
    name: string;
    location: string;
    region?: string | null;
    phone?: string | null;
    product_types: string;
    overall_score?: number | null;
    risk_level?: string | null;
    otd_percentage?: number | null;
    defect_rate: number;
    inspection_pass_rate: number;
    avg_lead_time: number;
    avg_shipping_time: number;
    avg_shipping_cost: number;
    avg_manufacturing_cost: number;
    total_revenue: number;
    total_products_sold: number;
    total_production_volume: number;
    shipping_carriers: string;
    transportation_modes: string;
    routes: string;
  };
  metrics?: Array<{
    metric: string;
    current: number;
    target: number;
    threshold: number;
    unit: string;
    status: string;
    deviation_percent: number;
    proof_filename?: string | null;
  }>;
}

export function ReportModal({ supplier, isOpen, onClose }: ReportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<AiReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!supplier) return;
    try {
      setIsGenerating(true);
      setError(null);
      setReport(null);
      const response = await api.post(`/suppliers/${supplier.supplier_id}/report`);
      if (response.data.success) {
        setReport(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to connect to the backend server. Make sure it is running on http://localhost:8000'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplier) {
      const timer = setTimeout(() => {
        fetchReport();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setError(null);
      setReport(null);
      setIsGenerating(false);
    }
  }, [isOpen, supplier]);

  const handleExport = () => {
    if (!report || !supplier) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export the report as PDF.');
      return;
    }

    const formatList = (val: any) => {
      if (!val) return 'N/A';
      if (Array.isArray(val)) return val.join(', ');
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed.join(', ');
        } catch {}
        return val;
      }
      return String(val);
    };

    const getVal = (key: keyof NonNullable<AiReport['supplier']>, fallback: any) => {
      if (report.supplier && report.supplier[key] !== undefined && report.supplier[key] !== null) {
        return report.supplier[key];
      }
      if (supplier && (supplier as any)[key] !== undefined && (supplier as any)[key] !== null) {
        return (supplier as any)[key];
      }
      return fallback;
    };

    const insightsHtml = report.key_insights
      .map(insight => `<li class="list-item">${insight}</li>`)
      .join('');

    const risksHtml = report.risk_flags
      .map(flag => `<div class="risk-item">${flag}</div>`)
      .join('');

    const sourcesHtml = report.data_sources_used.join(', ');

    const metricsHtml = report.metrics && report.metrics.length > 0
      ? report.metrics.map(m => {
          let statusStyle = '';
          if (m.status === 'compliant') {
            statusStyle = 'background: #d1fae5; color: #065f46; font-weight: 600;';
          } else if (m.status === 'warning') {
            statusStyle = 'background: #fef3c7; color: #92400e; font-weight: 600;';
          } else {
            statusStyle = 'background: #fee2e2; color: #991b1b; font-weight: 600;';
          }
          
          const label = m.metric.replace('_', ' ').toUpperCase();
          const devText = m.deviation_percent > 0 ? `+${m.deviation_percent}%` : `${m.deviation_percent}%`;
          const proof = m.proof_filename ? `📄 ${m.proof_filename}` : 'None uploaded';
          
          return `
            <tr>
              <td><strong>${label}</strong></td>
              <td>${m.current} ${m.unit}</td>
              <td>${m.target} ${m.unit}</td>
              <td>${m.threshold} ${m.unit}</td>
              <td><span class="status-badge" style="${statusStyle}">${m.status.toUpperCase()}</span></td>
              <td style="${m.status === 'breached' ? 'color: #ef4444; font-weight: bold;' : 'color: #334155;'}">${devText}</td>
              <td style="font-size: 11px; color: #64748b;">${proof}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">No SLA metrics configured for this supplier.</td></tr>`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>SLA Performance Audit Report - ${getVal('name', 'Supplier')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
      color: #334155;
      background-color: #ffffff;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
      font-size: 13px;
    }
    
    h1, h2, h3, h4 {
      font-family: 'Outfit', sans-serif;
      color: #0f172a;
      margin: 0;
    }
    
    .brand-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0d9488;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 700;
      color: #0d9488;
    }
    
    .doc-type {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #0d9488;
      background: rgba(13, 148, 136, 0.1);
      padding: 4px 12px;
      border-radius: 9999px;
    }
    
    .report-title-container {
      margin-bottom: 20px;
    }
    
    .report-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    
    .report-subtitle {
      font-size: 13px;
      color: #64748b;
    }
    
    .grid-three-col {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 15px;
    }
    
    .info-card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0d9488;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    
    .grid-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    
    .grid-item-label {
      color: #64748b;
      font-weight: 500;
    }
    
    .grid-item-value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
      max-width: 65%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .overall-score-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 13px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .sla-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    
    .sla-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
    }
    
    .sla-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    
    .sla-table tr:nth-child(even) {
      background: #f8fafc;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      letter-spacing: 0.05em;
    }
    
    .summary-card {
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.02), rgba(248, 250, 252, 1));
      border: 1px solid rgba(13, 148, 136, 0.12);
      border-left: 4px solid #0d9488;
      border-radius: 8px;
      padding: 15px;
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
    }
    
    .grid-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .list-container {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    
    .list-item {
      position: relative;
      padding-left: 18px;
      margin-bottom: 8px;
      font-size: 12.5px;
      color: #475569;
    }
    
    .list-item::before {
      content: "•";
      color: #0d9488;
      font-weight: bold;
      display: inline-block;
      width: 1em;
      margin-left: -1em;
      position: absolute;
      left: 18px;
    }
    
    .risk-item {
      position: relative;
      padding-left: 28px;
      margin-bottom: 8px;
      font-size: 12.5px;
      color: #9a3412;
      background: #fff7ed;
      border: 1px solid #ffedd5;
      border-radius: 6px;
      padding: 8px 10px 8px 28px;
    }
    
    .risk-item::before {
      content: "⚠️";
      position: absolute;
      left: 10px;
      top: 8px;
      font-size: 11px;
    }
    
    .sources-box {
      font-size: 11px;
      color: #64748b;
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    
    .sign-off-block {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      font-size: 12px;
    }
    
    .signature-line {
      border-top: 1.5px solid #cbd5e1;
      margin-top: 50px;
      padding-top: 6px;
      text-align: center;
      color: #64748b;
      font-weight: 500;
    }

    .footer {
      margin-top: 45px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 10px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    
    @media print {
      body {
        padding: 0px;
      }
      .brand-header {
        border-bottom: 2px solid #0d9488 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .info-card {
        background: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sla-table th {
        background: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sla-table tr:nth-child(even) {
        background: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .summary-card {
        background: #f9fbfb !important;
        border-left: 4px solid #0d9488 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .risk-item {
        background: #fff7ed !important;
        border: 1px solid #ffedd5 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <div class="brand-logo">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>VendorVerse</span>
    </div>
    <div class="doc-type">SLA Audit Ledger</div>
  </div>
  
  <div class="report-title-container">
    <h1 class="report-title">SLA Performance Audit Report</h1>
    <div class="report-subtitle">Official compliance scorecard, operational analytics, and AI risk diagnostics</div>
  </div>
  
  <div class="grid-three-col">
    <!-- Supplier Profile -->
    <div class="info-card">
      <div class="info-card-title">Supplier Dossier</div>
      <div class="grid-item">
        <span class="grid-item-label">ID</span>
        <span class="grid-item-value">${getVal('supplier_id', 'SUP001')}</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Name</span>
        <span class="grid-item-value">${getVal('name', 'N/A')}</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Location</span>
        <span class="grid-item-value">${getVal('location', 'N/A')}</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Region</span>
        <span class="grid-item-value">${getVal('region', 'N/A')}</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Phone</span>
        <span class="grid-item-value">${getVal('phone', 'N/A')}</span>
      </div>
    </div>

    <!-- Operational Data -->
    <div class="info-card">
      <div class="info-card-title">Operations Summary</div>
      <div class="grid-item">
        <span class="grid-item-label">Avg Lead Time</span>
        <span class="grid-item-value">${Number(getVal('avg_lead_time', 0)).toFixed(1)} days</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Avg Shipping Time</span>
        <span class="grid-item-value">${Number(getVal('avg_shipping_time', 0)).toFixed(1)} days</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Shipping Carriers</span>
        <span class="grid-item-value" title="${formatList(getVal('shipping_carriers', ''))}">${formatList(getVal('shipping_carriers', 'N/A'))}</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Transport Modes</span>
        <span class="grid-item-value" title="${formatList(getVal('transportation_modes', ''))}">${formatList(getVal('transportation_modes', 'N/A'))}</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Routes Ingedted</span>
        <span class="grid-item-value" title="${formatList(getVal('routes', ''))}">${formatList(getVal('routes', 'N/A'))}</span>
      </div>
    </div>

    <!-- Performance Ratings -->
    <div class="info-card">
      <div class="info-card-title">Risk & Audit Summary</div>
      <div class="grid-item">
        <span class="grid-item-label">Defect Rate</span>
        <span class="grid-item-value">${Number(getVal('defect_rate', 0)).toFixed(2)}%</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Inspection Pass Rate</span>
        <span class="grid-item-value">${Number(getVal('inspection_pass_rate', 0)).toFixed(1)}%</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Total SKUs Active</span>
        <span class="grid-item-value">${getVal('num_skus' as any, 'N/A')}</span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">Overall Performance</span>
        <span class="grid-item-value">
          <span class="overall-score-badge" style="background: ${Number(getVal('overall_score', 0)) >= 75 ? 'rgba(16, 185, 129, 0.15); color: #059669;' : 'rgba(239, 68, 68, 0.15); color: #dc2626;'}">
            ${Number(getVal('overall_score', 0)).toFixed(1)} / 100
          </span>
        </span>
      </div>
      <div class="grid-item">
        <span class="grid-item-label">AI Risk Assessment</span>
        <span class="grid-item-value" style="font-weight: 700; color: ${getVal('risk_level', '') === 'Low' ? '#059669' : (getVal('risk_level', '') === 'Medium' ? '#d97706' : '#dc2626')};">
          ${getVal('risk_level', 'Unevaluated').toUpperCase()}
        </span>
      </div>
    </div>
  </div>

  <!-- SLA Scorecard Table -->
  <div class="section">
    <h2 class="section-title">Service Level Agreement (SLA) Monitor Ledger</h2>
    <table class="sla-table">
      <thead>
        <tr>
          <th>SLA Metric Parameter</th>
          <th>Current Performance</th>
          <th>SLA Target</th>
          <th>SLA Breach Threshold</th>
          <th>Status</th>
          <th>Target Deviation</th>
          <th>Ledger Verification Proof</th>
        </tr>
      </thead>
      <tbody>
        ${metricsHtml}
      </tbody>
    </table>
  </div>
  <!-- Data Sources -->
  <div class="section" style="page-break-inside: avoid;">
    <h2 class="section-title">Verification Ledger & Audit Trail</h2>
    <div class="sources-box">
      This performance scorecard was automatically synthesized and audited by the VendorVerse Intelligence Core. Calculations were validated against historical ledger records and verified upload databases, incorporating data sources from: <strong>${sourcesHtml}</strong>.
    </div>
  </div>
  
  <!-- Sign-off Block -->
  <div class="sign-off-block" style="page-break-inside: avoid;">
    <div>
      <p style="font-size: 11px; color: #64748b; line-height: 1.4;">
        I, the undersigned, hereby attest that this report constitutes a fair and accurate summary of supplier operational metrics and compliance scorecards as of the audit date.
      </p>
      <div class="signature-line">
        VendorVerse Auditor Signature
      </div>
    </div>
    <div>
      <p style="font-size: 11px; color: #64748b; line-height: 1.4;">
        Representing the supplier organization, I acknowledge receipt of this SLA audit scorecard and any associated risk alerts or breach mitigation interventions.
      </p>
      <div class="signature-line">
        Supplier Authorized Representative
      </div>
    </div>
  </div>
  
  <div class="footer">
    <span>Report Generated: ${new Date(report.generated_date).toLocaleString()}</span>
    <span>CONFIDENTIAL / INTERNAL USE ONLY</span>
    <span>© ${new Date().getFullYear()} VendorVerse Inc.</span>
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 500);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <div
        className="card-base w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 id="report-title" className="text-lg font-semibold text-foreground">AI Performance Report</h2>
              <p className="text-sm text-muted-foreground">{supplier?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close modal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Generating AI report...</p>
              <p className="text-sm text-muted-foreground mt-1">Analyzing performance data</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center mb-4 text-destructive">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="font-semibold text-foreground text-base mb-2">Failed to Generate Report</h4>
              <p className="text-sm text-muted-foreground max-w-md mb-6">{error}</p>
              <button
                onClick={fetchReport}
                className="btn-primary py-2 px-4 text-xs font-semibold rounded-md"
              >
                Retry Generation
              </button>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* AI Summary */}
              <div className="ai-summary-box">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="font-semibold text-foreground">AI Analysis Summary</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{report.summary_text}</p>
                
                {/* Visual Comparative Graph (Target vs Current) */}
                {report.metrics && report.metrics.length > 0 && (
                  <div className="mt-6 p-4 border border-border/80 rounded-lg bg-card/50 space-y-4">
                    <h5 className="font-semibold text-xs text-foreground flex items-center gap-2 uppercase tracking-wider">
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      SLA Performance Index (Target vs Current)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {report.metrics.map((m) => {
                        // Normalize calculations for the visual chart
                        const maxVal = Math.max(m.target, m.current, m.threshold, 10) || 100;
                        const targetPercent = Math.max(5, Math.min(100, (m.target / maxVal) * 100));
                        const currentPercent = Math.max(5, Math.min(100, (m.current / maxVal) * 100));
                        
                        return (
                          <div key={m.metric} className="space-y-2 border border-border/40 p-3 rounded bg-muted/20">
                            <div className="flex justify-between text-[11px] font-medium text-foreground">
                              <span className="capitalize">{m.metric.replace('_', ' ')}</span>
                              <span className="text-muted-foreground font-semibold">{m.current}{m.unit} vs {m.target}{m.unit}</span>
                            </div>
                            <div className="space-y-1.5">
                              {/* SLA Target / Before */}
                              <div className="flex items-center gap-2 text-[9px]">
                                <span className="w-12 text-muted-foreground text-left">SLA Target:</span>
                                <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                                  <div className="bg-slate-400 h-full rounded" style={{ width: `${targetPercent}%` }} />
                                </div>
                              </div>
                              {/* Actual Achievement / After */}
                              <div className="flex items-center gap-2 text-[9px]">
                                <span className="w-12 text-muted-foreground text-left">Actual:</span>
                                <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                                  <div className={`h-full rounded ${
                                    m.status === 'compliant' ? 'bg-green-500' :
                                    m.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                                  }`} style={{ width: `${currentPercent}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pointwise Agreement Lack Summary */}
                {report.metrics && (
                  <div className="mt-4 space-y-2">
                    <h5 className="font-semibold text-xs text-foreground flex items-center gap-2 uppercase tracking-wider">
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      SLA Agreement Lacks & Deviation Summary
                    </h5>
                    <ul className="space-y-2 bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-lg">
                      {report.metrics.filter(m => m.status !== 'compliant').map((m) => {
                        const gap = Math.abs(m.target - m.current);
                        const label = m.metric.replace('_', ' ');
                        return (
                          <li key={m.metric} className="text-xs flex items-start gap-2 text-amber-800 dark:text-amber-400">
                            <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span>
                              <strong>{label.toUpperCase()} shortfall:</strong> The actual performance is {m.current}{m.unit}, deviating from the SLA Target ({m.target}{m.unit}) by {m.deviation_percent}% (net gap of {gap.toFixed(1)}{m.unit}). Status: <span className="font-bold uppercase text-[10px] bg-amber-500/10 px-1 rounded">{m.status}</span>.
                            </span>
                          </li>
                        );
                      })}
                      {report.metrics.filter(m => m.status !== 'compliant').length === 0 && (
                        <li className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
                          <span className="mt-0.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                          <span>All metrics comply with the Service Level Agreement (no agreement lacks identified).</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Data Sources */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Data sources:</span> {report.data_sources_used.join(', ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">Generated:</span> {new Date(report.generated_date).toLocaleString()}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!isGenerating && report && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
            <button onClick={handleExport} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
