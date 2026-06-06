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

      fetchReport();
    }
  }, [isOpen, supplier]);

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
        className="card-base w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in"
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
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
                    <li key={index} className="flex items-start gap-2 text-sm text-warning">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
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
            <button className="btn-primary">
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
