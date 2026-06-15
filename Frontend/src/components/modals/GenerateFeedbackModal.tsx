import { useState } from 'react';
import { api } from '@/lib/api';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GenerateFeedbackModalProps {
  shipment: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerateFeedbackModal({ shipment, isOpen, onClose, onSuccess }: GenerateFeedbackModalProps) {
  const [actualQty, setActualQty] = useState<number>(shipment?.supplier_quantity || 0);
  const [actualCost, setActualCost] = useState<number>(shipment?.supplier_cost || 0);
  const [defectRate, setDefectRate] = useState<number>(0);
  const [leadTime, setLeadTime] = useState<number>(shipment?.expected_lead_time || 0);
  const [shippingTime, setShippingTime] = useState<number>(0);
  const [inspectResult, setInspectResult] = useState<string>('Pass');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen || !shipment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualQty < 0 || actualCost < 0 || defectRate < 0 || leadTime < 0 || shippingTime < 0) {
      setFeedback({ type: 'error', message: 'Values cannot be negative.' });
      return;
    }

    const formData = new FormData();
    formData.append('company_quantity', actualQty.toString());
    formData.append('company_cost', actualCost.toString());
    formData.append('company_defect_rate', defectRate.toString());
    formData.append('company_lead_time', leadTime.toString());
    formData.append('company_shipping_time', shippingTime.toString());
    formData.append('company_inspection_result', inspectResult);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await api.post(`/shipments/${shipment.id}/generate-feedback`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setFeedback({ type: 'success', message: 'Inspection feedback successfully registered!' });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      console.error(error);
      setFeedback({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to submit inspection feedback.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card-base w-full max-w-lg flex flex-col overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">Generate Feedback Report</h3>
            <p className="text-xs text-muted-foreground">Audit delivery for dispatch {shipment.id}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shipment Details Pre-filled Info */}
        <div className="p-5 bg-secondary/20 border-b border-border text-xs space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground font-semibold block">Material/Product:</span>
              <span className="text-foreground font-bold">{shipment.product_name} ({shipment.sku})</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Dispatch Date:</span>
              <span className="text-foreground font-bold">{new Date(shipment.shipment_date).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Promised Quantity:</span>
              <span className="text-foreground font-bold">{shipment.supplier_quantity} units</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Promised Unit Cost:</span>
              <span className="text-foreground font-bold">${shipment.supplier_cost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Actual Received Quantity</Label>
              <Input type="number" required min="0" value={actualQty || ''} onChange={e => setActualQty(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Actual Unit Cost ($)</Label>
              <Input type="number" step="0.01" required min="0" value={actualCost || ''} onChange={e => setActualCost(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Actual Defect Rate (%)</Label>
              <Input type="number" step="0.1" required min="0" max="100" placeholder="e.g. 1.5" value={defectRate || ''} onChange={e => setDefectRate(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Actual Lead Time (Days)</Label>
              <Input type="number" step="0.1" required min="0" value={leadTime || ''} onChange={e => setLeadTime(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Actual Shipping/Transit Time (Days)</Label>
              <Input type="number" step="0.1" required min="0" placeholder="e.g. 3.5" value={shippingTime || ''} onChange={e => setShippingTime(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Inspection Pass/Fail Result</Label>
              <select
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                value={inspectResult}
                onChange={e => setInspectResult(e.target.value)}
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground text-left block">Upload Goods Receipt Inspection Report (Optional)</Label>
            <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-secondary/10 relative">
              <input
                type="file"
                accept=".pdf, .png, .jpg, .jpeg, .csv, .xlsx"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs font-semibold text-foreground">
                {selectedFile ? selectedFile.name : 'Select file (optional)'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ingesting...</>
              ) : (
                'Generate Report & Sync SLA'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
