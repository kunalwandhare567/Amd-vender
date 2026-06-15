import { useState } from 'react';
import { api } from '@/lib/api';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UpdateQCModalProps {
  supplierId: string;
  supplierName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateQCModal({ supplierId, supplierName, isOpen, onClose, onSuccess }: UpdateQCModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [passedCount, setPassedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passedCount < 0 || failedCount < 0) {
      setFeedback({ type: 'error', message: 'Inspection counts cannot be negative' });
      return;
    }
    if (passedCount === 0 && failedCount === 0) {
      setFeedback({ type: 'error', message: 'Total inspections must be greater than 0' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const response = await api.put(`/suppliers/${supplierId}/inspection-rate`, {
        passed_count: passedCount,
        failed_count: failedCount
      });

      if (response.data.success) {
        setFeedback({ type: 'success', message: response.data.message });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Manual QC update failed:', error);
      setFeedback({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to update inspection rate.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFeedback({ type: 'error', message: 'Please select a file to upload' });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const response = await api.post(`/suppliers/${supplierId}/upload-qc-log`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setFeedback({ type: 'success', message: response.data.message });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('File QC update failed:', error);
      setFeedback({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to parse and update metrics from QC log.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const computedRate = () => {
    const total = passedCount + failedCount;
    if (total === 0) return 0;
    return Math.round((passedCount / total) * 100);
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card-base w-full max-w-md flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">Update Quality Inspections</h3>
            <p className="text-xs text-muted-foreground">{supplierName} ({supplierId})</p>
          </div>
          <button onClick={onClose} className="icon-btn text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          <button
            onClick={() => { setActiveTab('manual'); setFeedback(null); }}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-primary text-primary bg-background/50'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Manual Metrics
          </button>
          <button
            onClick={() => { setActiveTab('upload'); setFeedback(null); }}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-primary text-primary bg-background/50'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Upload QC / GRIR Sheet
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 space-y-4">
          {feedback && (
            <div className={`p-3 rounded-lg flex items-start gap-2.5 text-sm ${
              feedback.type === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {activeTab === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Passed Inspections</label>
                  <input
                    type="number"
                    min="0"
                    value={passedCount}
                    onChange={e => setPassedCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. 10"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Failed Inspections</label>
                  <input
                    type="number"
                    min="0"
                    value={failedCount}
                    onChange={e => setFailedCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. 2"
                    required
                  />
                </div>
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block">Recalculated Pass Rate</span>
                  <span className="text-xs text-muted-foreground italic">(Target: 90%, Threshold: 60%)</span>
                </div>
                <div className={`text-2xl font-bold ${
                  computedRate() >= 90 ? 'text-success' : computedRate() >= 60 ? 'text-warning' : 'text-destructive'
                }`}>
                  {computedRate()}%
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary py-2 flex items-center gap-1.5">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground block leading-relaxed">
                  Upload a Goods Receipt Inspection Report (GRIR) or Supplier feedback file (CSV/Excel). The parser automatically aggregates inspection pass counts, defect rates, and transit delay times to update your SLA cards.
                </span>
                
                {/* File Dropzone */}
                <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-secondary/10 relative">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                  <span className="text-xs font-semibold text-foreground">
                    {selectedFile ? selectedFile.name : 'Click to select report sheet'}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    Accepts CSV, XLSX or XLS up to 10MB
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || !selectedFile} className="btn-primary py-2 flex items-center gap-1.5">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Ingesting...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" /> Process Report
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
