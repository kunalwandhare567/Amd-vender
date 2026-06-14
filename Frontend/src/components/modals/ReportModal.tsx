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
}

export function ReportModal({ supplier, isOpen, onClose }: ReportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<AiReport | null>(null);

  useEffect(() => {
    if (isOpen && supplier) {
      setIsGenerating(true);
      setReport(null);

      const fetchReport = async () => {
        try {
          const response = await api.post(`/suppliers/${supplier.supplier_id}/report`);
          if (response.data.success) {
            setReport(response.data.data);
          }
        } catch (error) {
          console.error('Failed to generate report:', error);
        } finally {
          setIsGenerating(false);
        }
      };

      const timer = setTimeout(() => {
        fetchReport();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, supplier]);

  const handleExport = () => {
    if (!report || !supplier) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export the report as PDF.');
      return;
    }

    const insightsHtml = report.key_insights
      .map(insight => `<li class="list-item">${insight}</li>`)
      .join('');

    const risksHtml = report.risk_flags
      .map(flag => `<div class="risk-item">${flag}</div>`)
      .join('');

    const sourcesHtml = report.data_sources_used.join(', ');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>AI Performance Report - ${supplier.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
      color: #334155;
      background-color: #ffffff;
      margin: 0;
      padding: 50px;
      line-height: 1.6;
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
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 700;
      color: #0d9488;
    }
    
    .doc-type {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      background: #f1f5f9;
      padding: 4px 12px;
      border-radius: 9999px;
    }
    
    .report-title-container {
      margin-bottom: 25px;
    }
    
    .report-title {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 5px;
    }
    
    .report-subtitle {
      font-size: 14px;
      color: #64748b;
    }
    
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 30px;
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    
    .meta-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    
    .section {
      margin-bottom: 35px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .summary-card {
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.03), rgba(248, 250, 252, 1));
      border: 1px solid rgba(13, 148, 136, 0.15);
      border-left: 4px solid #0d9488;
      border-radius: 8px;
      padding: 20px;
      font-size: 14.5px;
      color: #334155;
      line-height: 1.7;
    }
    
    .grid-two-col {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 30px;
    }
    
    .list-container {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    
    .list-item {
      position: relative;
      padding-left: 20px;
      margin-bottom: 12px;
      font-size: 13.5px;
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
      left: 20px;
    }
    
    .risk-item {
      position: relative;
      padding-left: 24px;
      margin-bottom: 12px;
      font-size: 13.5px;
      color: #9a3412;
      background: #fff7ed;
      border: 1px solid #ffedd5;
      border-radius: 6px;
      padding: 10px 12px 10px 32px;
    }
    
    .risk-item::before {
      content: "⚠️";
      position: absolute;
      left: 10px;
      top: 9px;
      font-size: 12px;
    }
    
    .sources-box {
      font-size: 12px;
      color: #64748b;
      background: #f8fafc;
      padding: 12px 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    
    .footer {
      margin-top: 60px;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    
    @media print {
      body {
        padding: 20px 30px;
      }
      .meta-grid {
        background: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .summary-card {
        background: #f4fafb !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .risk-item {
        background: #fff7ed !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <div class="brand-logo">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>VendorVerse</span>
    </div>
    <div class="doc-type">Supplier Dossier</div>
  </div>
  
  <div class="report-title-container">
    <h1 class="report-title">AI Performance Report</h1>
    <div class="report-subtitle">Analytical overview of vendor operations and compliance scorecards</div>
  </div>
  
  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Supplier Name</span>
      <span class="meta-value">${supplier.name}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Supplier ID</span>
      <span class="meta-value">${supplier.supplier_id}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Geographic Region</span>
      <span class="meta-value">${supplier.region || 'Not Specified'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Analysis Date</span>
      <span class="meta-value">${new Date(report.generated_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Executive Intelligence Summary</h2>
    <div class="summary-card">
      ${report.summary_text}
    </div>
  </div>
  
  <div class="grid-two-col">
    <div class="section">
      <h2 class="section-title">Key Performance Insights</h2>
      <ul class="list-container">
        ${insightsHtml}
      </ul>
    </div>
    
    <div class="section">
      <h2 class="section-title">Operational Risk Warnings</h2>
      <div class="list-container">
        ${risksHtml || '<div style="font-size: 13.5px; color: #64748b;">No outstanding risk warnings detected.</div>'}
      </div>
    </div>
  </div>
  
  <div class="section" style="margin-top: 15px;">
    <h2 class="section-title">Verification Auditing & Data Sources</h2>
    <div class="sources-box">
      This analysis is synthesised by VendorVerse AI Engine using verification datasets from: <strong>${sourcesHtml}</strong>.
    </div>
  </div>
  
  <div class="footer">
    <span>© ${new Date().getFullYear()} VendorVerse Inc. All Rights Reserved.</span>
    <span>CONFIDENTIAL / INTERNAL USE ONLY</span>
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
              </div>

              {/* Key Insights */}
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Key Insights
                </h4>
                <ul className="space-y-2">
                  {report.key_insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risk Flags */}
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Risk Flags
                </h4>
                <ul className="space-y-2">
                  {report.risk_flags.map((flag, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-warning">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                      </svg>
                      {flag}
                    </li>
                  ))}
                </ul>
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
