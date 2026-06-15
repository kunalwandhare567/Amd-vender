import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface ComparisonModalProps {
  shipment: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ComparisonModal({ shipment, isOpen, onClose }: ComparisonModalProps) {
  if (!isOpen || !shipment) return null;

  const handleDownloadReceipt = async () => {
    if (!shipment.supplier_receipt_doc_id) {
      toast.error('No receipt document linked to this shipment.');
      return;
    }
    try {
      const response = await api.get(`/documents/${shipment.supplier_receipt_doc_id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Get filename from response headers or fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'receipt_document.pdf';
      if (contentDisposition) {
        const parts = contentDisposition.split('filename=');
        if (parts.length > 1) filename = parts[1].replace(/"/g, '');
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('Failed to download invoice receipt.');
    }
  };

  const getDeviationClass = (metric: 'quantity' | 'cost' | 'lead_time', supplierVal: number, companyVal: number) => {
    const diff = companyVal - supplierVal;
    if (metric === 'quantity') {
      if (diff === 0) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      if (diff < 0) return 'text-red-400 bg-red-500/10 border-red-500/20'; // under-delivered
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'; // extra delivered
    }
    if (metric === 'cost') {
      if (diff === 0) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      if (diff > 0) return 'text-red-400 bg-red-500/10 border-red-500/20'; // cost overrun
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'; // cheaper
    }
    if (metric === 'lead_time') {
      if (companyVal <= supplierVal) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      if (companyVal <= supplierVal + 2) return 'text-amber-400 bg-amber-500/10 border-amber-500/20'; // warning
      return 'text-red-400 bg-red-500/10 border-red-500/20'; // breached
    }
    return '';
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('emerald') || status.includes('teal')) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
    if (status.includes('amber') || status.includes('warning')) {
      return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const qtyDiff = (shipment.company_quantity || 0) - shipment.supplier_quantity;
  const costDiff = (shipment.company_cost || 0) - shipment.supplier_cost;
  const leadDiff = (shipment.company_lead_time || 0) - shipment.expected_lead_time;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card-base w-full max-w-3xl flex flex-col overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">Supplier Claim vs. Company Audit Comparison</h3>
            <p className="text-xs text-muted-foreground">Detailed Ledger Audit for shipment {shipment.id}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info Grid */}
        <div className="p-6 bg-secondary/10 border-b border-border space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Source (Supplier Dispatch)</h4>
              <p className="font-semibold text-foreground">{shipment.source_name}</p>
              <p className="text-muted-foreground">{shipment.source_address}</p>
              <p className="text-muted-foreground">Email: {shipment.source_email} | Tel: {shipment.source_contact}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Destination (Audit Location)</h4>
              <p className="font-semibold text-foreground">{shipment.destination_name}</p>
              <p className="text-muted-foreground">{shipment.destination_address}</p>
              <p className="text-muted-foreground">Email: {shipment.destination_email} | Tel: {shipment.destination_contact}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4 text-muted-foreground">
            <div>
              <span className="block font-semibold">Product SKU</span>
              <span className="text-foreground font-bold">{shipment.sku}</span>
            </div>
            <div>
              <span className="block font-semibold">Product Name</span>
              <span className="text-foreground font-bold">{shipment.product_name}</span>
            </div>
            <div>
              <span className="block font-semibold">Dispatch Date</span>
              <span className="text-foreground font-bold">{new Date(shipment.shipment_date).toLocaleString()}</span>
            </div>
            <div>
              <span className="block font-semibold">Audited Date</span>
              <span className="text-foreground font-bold">{shipment.audited_at ? new Date(shipment.audited_at).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 max-h-[50vh] overflow-y-auto scrollbar-thin">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Quantity Card */}
            <Card className="card-base border-border bg-background/50">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Quantity Audit</span>
                  <Badge variant="outline" className={getDeviationClass('quantity', shipment.supplier_quantity, shipment.company_quantity || 0)}>
                    {qtyDiff === 0 ? 'ExactMatch' : qtyDiff < 0 ? `${qtyDiff} items` : `+${qtyDiff} items`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-foreground">{shipment.supplier_quantity}</p>
                    <p className="text-[10px] text-muted-foreground">Promised (Receipt)</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 mx-2" />
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-foreground">{shipment.company_quantity || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Received (Audited)</p>
                  </div>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${qtyDiff >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, ((shipment.company_quantity || 0) / shipment.supplier_quantity) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cost Card */}
            <Card className="card-base border-border bg-background/50">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Unit Cost Audit</span>
                  <Badge variant="outline" className={getDeviationClass('cost', shipment.supplier_cost, shipment.company_cost || 0)}>
                    {costDiff === 0 ? 'Correct Price' : costDiff > 0 ? `+$${costDiff.toFixed(2)}` : `-$${Math.abs(costDiff).toFixed(2)}`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-foreground">${shipment.supplier_cost.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Invoiced Claim</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 mx-2" />
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-foreground">${(shipment.company_cost || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Audited Cost</p>
                  </div>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${costDiff <= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (shipment.supplier_cost / (shipment.company_cost || 1)) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lead Time Card */}
            <Card className="card-base border-border bg-background/50">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Lead Time Audit</span>
                  <Badge variant="outline" className={getDeviationClass('lead_time', shipment.expected_lead_time, shipment.company_lead_time || 0)}>
                    {leadDiff <= 0 ? 'On Time' : `+${leadDiff.toFixed(1)} days`}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-foreground">{shipment.expected_lead_time}d</p>
                    <p className="text-[10px] text-muted-foreground">Expected</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 mx-2" />
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-foreground">{(shipment.company_lead_time || 0).toFixed(1)}d</p>
                    <p className="text-[10px] text-muted-foreground">Actual Lead</p>
                  </div>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${leadDiff <= 0 ? 'bg-emerald-500' : leadDiff <= 2 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (shipment.expected_lead_time / (shipment.company_lead_time || 1)) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Quality Feedback and Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-secondary/15 space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">QC & Audit Verification Results</h4>
              <div className="flex items-center gap-3">
                {getStatusIcon(getDeviationClass('lead_time', shipment.expected_lead_time, shipment.company_lead_time || 0))}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Inspection Result: <span className={shipment.company_inspection_result === 'Pass' ? 'text-emerald-400' : 'text-red-400'}>{shipment.company_inspection_result}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Shipment Defect Rate: {shipment.company_defect_rate}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Logistics transit delay was {(shipment.company_shipping_time || 0).toFixed(1)} days. Deviation analysis feeds directly to SLA dashboard metrics.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/15 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Linked Documents</h4>
                <div className="flex items-center gap-2 p-2 bg-background/50 border border-border/60 rounded-lg text-xs">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground truncate max-w-[180px]">Supplier Receipt (Invoice)</span>
                  <Badge variant="outline" className="ml-auto text-[8px] bg-primary/10 border-primary/20 text-primary">INVOICE</Badge>
                </div>
              </div>
              <Button onClick={handleDownloadReceipt} variant="outline" size="sm" className="mt-4 gap-1.5 self-start text-xs border-primary/30 text-primary hover:bg-primary/10">
                <Download className="w-3.5 h-3.5" /> Download Supplier Receipt
              </Button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex justify-end bg-secondary/10">
          <Button onClick={onClose} className="font-bold">
            Close Audit Details
          </Button>
        </div>
      </div>
    </div>
  );
}
