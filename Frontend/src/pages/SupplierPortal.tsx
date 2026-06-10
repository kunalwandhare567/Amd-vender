import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { 
  Building2, 
  FileSpreadsheet, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  Send,
  MapPin,
  Map
} from 'lucide-react';

interface RFQItem {
  id: string;
  supplier_id: string;
  supplier_name: string;
  original_supplier_id: string;
  original_supplier_name: string;
  part_sku: string;
  quantity: number;
  target_delivery_days: number;
  delivery_location: string;
  terms_conditions: string;
  status: string;
  bid_price?: number;
  bid_lead_time?: number;
  bid_comments?: string;
  created_at: string;
}

export default function SupplierPortal() {
  const [selectedSupplierId, setSelectedSupplierId] = useState("SUP001");
  const [supplierName, setSupplierName] = useState("Glow Cosmetics");
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [activeTab, setActiveTab] = useState<"rfqs" | "performance" | "sla">("rfqs");
  const [loading, setLoading] = useState(false);

  // Form states for bidding
  const [biddingRfqId, setBiddingRfqId] = useState<string | null>(null);
  const [bidPrice, setBidPrice] = useState("");
  const [bidLeadTime, setBidLeadTime] = useState("");
  const [bidComments, setBidComments] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Supplier profiles for demo switching
  const supplierProfiles = [
    { id: "SUP001", name: "Glow Cosmetics", otd: "94.5%", defect: "2.3%", passRate: "97.5%", slaStatus: "Warning" },
    { id: "SUP002", name: "Herbal Essence Ltd", otd: "96.8%", defect: "1.5%", passRate: "98.2%", slaStatus: "Compliant" },
    { id: "SUP003", name: "EcoBeauty Solutions", otd: "88.2%", defect: "3.2%", passRate: "95.8%", slaStatus: "Breached" },
    { id: "SUP004", name: "Premier Haircare", otd: "79.5%", defect: "5.1%", passRate: "93.2%", slaStatus: "Breached" },
    { id: "SUP005", name: "Luxe Packaging & Supply", otd: "98.3%", defect: "0.8%", passRate: "99.1%", slaStatus: "Warning" }
  ];

  const currentProfile = supplierProfiles.find(p => p.id === selectedSupplierId) || supplierProfiles[0];

  const fetchRfqs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rfqs?supplier_id=${selectedSupplierId}`);
      setRfqs(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load RFQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
    setSupplierName(currentProfile.name);
  }, [selectedSupplierId]);

  // Canvas drawing for outgoing map track
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = canvas.parentElement?.clientWidth || 500;
    const height = canvas.height = 200;

    // Draw tech background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw route: Pune factory to Tata Plant
    ctx.beginPath();
    ctx.moveTo(50, 100);
    ctx.lineTo(width - 50, 100);
    ctx.strokeStyle = '#10b981'; // green route
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pulse outgoing truck
    const pulseX = 50 + ((Date.now() / 50) % (width - 100));
    ctx.beginPath();
    ctx.arc(pulseX, 100, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText("Supplier Warehouse (Dispatch)", 20, 130);
    ctx.fillText("Buyer OEM Facility (In Transit)", width - 150, 130);
  }, [selectedSupplierId]);

  const handleOpenBid = (rfq: RFQItem) => {
    setBiddingRfqId(rfq.id);
    setBidPrice(rfq.part_sku.includes("ECU") ? "24.50" : "15.00");
    setBidLeadTime(rfq.target_delivery_days.toString());
    setBidComments("Confirming production capacity and rapid dispatch window.");
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidPrice || !bidLeadTime) {
      toast.error("Please fill in price and lead time");
      return;
    }
    setSubmittingBid(true);
    try {
      const payload = {
        bid_price: parseFloat(bidPrice),
        bid_lead_time: parseInt(bidLeadTime),
        bid_comments: bidComments
      };

      await api.post(`/rfqs/${biddingRfqId}/bid`, payload);
      toast.success("Bid submitted successfully! Buyer dashboard notified.");
      setBiddingRfqId(null);
      fetchRfqs(); // Reload list
    } catch (err) {
      toast.error("Failed to submit bid");
    } finally {
      setSubmittingBid(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Supplier Collaboration Portal
            </h1>
            <p className="text-muted-foreground mt-1">
              Active RFQs, bid configurations, SLA compliance parameters, and performance scorecard.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Label htmlFor="supplier-select" className="text-xs font-semibold text-muted-foreground">Select Profile (Demo Mode):</Label>
            <select
              id="supplier-select"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-xs bg-secondary font-bold text-foreground focus:outline-none"
            >
              {supplierProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border gap-6">
          <button 
            onClick={() => setActiveTab("rfqs")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "rfqs" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Incoming RFQs ({rfqs.filter(r => r.status === "Sent").length})
          </button>
          <button 
            onClick={() => setActiveTab("performance")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "performance" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Performance Scorecard
          </button>
          <button 
            onClick={() => setActiveTab("sla")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "sla" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            SLA Alerts & Compliance
          </button>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-6">
            <AnimatePresence mode="wait">
              
              {/* Tab 1: Incoming RFQs */}
              {activeTab === "rfqs" && (
                <motion.div
                  key="rfqs"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {loading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading RFQs...</p>
                  ) : rfqs.length === 0 ? (
                    <Card className="card-base p-8 text-center text-muted-foreground">
                      <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="font-semibold">No active RFQs received.</p>
                      <p className="text-xs mt-1">Sourcing Autopilot will broadcast RFQs here during supply chain disruption simulations.</p>
                    </Card>
                  ) : (
                    rfqs.map(rfq => (
                      <Card key={rfq.id} className={`card-base border ${
                        rfq.status === 'Sent' ? 'border-primary/40 bg-primary/5' : 'border-border'
                      }`}>
                        <CardHeader className="py-4 border-b border-border/60">
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle className="text-sm font-mono font-bold text-primary">{rfq.id}</CardTitle>
                              <p className="text-xs text-muted-foreground mt-0.5">Disrupted Supplier: {rfq.original_supplier_name}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              rfq.status === 'Sent' ? 'bg-cyan-500/10 text-cyan-400' :
                              rfq.status === 'Bid_Submitted' ? 'bg-amber-500/10 text-amber-400' :
                              rfq.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>
                              {rfq.status === 'Sent' ? 'Action Required' : rfq.status.replace('_', ' ')}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                          
                          {/* Sourcing Requirements */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-secondary/50 p-4 rounded-xl border border-border/80">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Part / SKU</p>
                              <p className="text-sm font-semibold text-foreground">{rfq.part_sku}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Quantity Required</p>
                              <p className="text-sm font-semibold text-foreground">{rfq.quantity.toLocaleString()} Units</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Target Delivery</p>
                              <p className="text-sm font-semibold text-foreground">{rfq.target_delivery_days} Days</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Delivery Loc</p>
                              <p className="text-sm font-semibold text-foreground truncate">{rfq.delivery_location}</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground">Terms & Conditions</p>
                            <p className="text-xs text-slate-300 bg-secondary/30 p-3 rounded-lg border border-border/50">{rfq.terms_conditions}</p>
                          </div>

                          {/* Existing Bid Display */}
                          {rfq.status !== 'Sent' && (
                            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-2">
                              <p className="text-xs font-bold text-amber-400">Your Submitted Sourcing Proposal</p>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Proposed Price:</span>
                                  <strong className="text-foreground ml-1">${rfq.bid_price?.toFixed(2)}</strong>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Lead Time:</span>
                                  <strong className="text-foreground ml-1">{rfq.bid_lead_time} Days</strong>
                                </div>
                              </div>
                              {rfq.bid_comments && (
                                <p className="text-xs text-muted-foreground mt-1">Comments: "{rfq.bid_comments}"</p>
                              )}
                            </div>
                          )}

                          {/* Submit Bid Button */}
                          {rfq.status === 'Sent' && biddingRfqId !== rfq.id && (
                            <Button onClick={() => handleOpenBid(rfq)} className="w-full bg-cyan-500 hover:bg-cyan-600 font-bold text-slate-950">
                              Configure & Submit Bid Proposal
                            </Button>
                          )}

                          {/* Inline Bidding Form */}
                          {biddingRfqId === rfq.id && (
                            <motion.form 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              onSubmit={handleSubmitBid}
                              className="border border-cyan-500/20 bg-cyan-950/5 p-4 rounded-xl space-y-4"
                            >
                              <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                Configure Sourcing Proposal
                              </h4>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="bidPrice">Unit Price Bid ($)</Label>
                                  <Input 
                                    id="bidPrice"
                                    type="number" 
                                    step="0.01" 
                                    value={bidPrice}
                                    onChange={(e) => setBidPrice(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="bidLeadTime">Lead Time Bid (Days)</Label>
                                  <Input 
                                    id="bidLeadTime" 
                                    type="number"
                                    value={bidLeadTime}
                                    onChange={(e) => setBidLeadTime(e.target.value)}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                  <Label htmlFor="bidComments">Capacity / Execution Strategy</Label>
                                  <Textarea 
                                    id="bidComments"
                                    rows={3}
                                    placeholder="Brief details regarding plant capacity, freight methods or certifications..."
                                    value={bidComments}
                                    onChange={(e) => setBidComments(e.target.value)}
                                  />
                              </div>

                              <div className="flex gap-3 justify-end">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setBiddingRfqId(null)}>Cancel</Button>
                                <Button type="submit" disabled={submittingBid} size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold">
                                  {submittingBid ? "Sending..." : "Submit Bid"}
                                </Button>
                              </div>
                            </motion.form>
                          )}

                        </CardContent>
                      </Card>
                    ))
                  )}
                </motion.div>
              )}

              {/* Tab 2: Performance Scorecard */}
              {activeTab === "performance" && (
                <motion.div
                  key="performance"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="card-base">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Performance Scorecard Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      
                      {/* Metric Dashboard */}
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="bg-secondary/40 p-4 rounded-xl border border-border">
                          <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                          <p className="text-2xl font-black text-foreground">{currentProfile.otd}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">On-Time Delivery</p>
                        </div>
                        <div className="bg-secondary/40 p-4 rounded-xl border border-border">
                          <AlertOctagon className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                          <p className="text-2xl font-black text-foreground">{currentProfile.defect}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Defect Rate</p>
                        </div>
                        <div className="bg-secondary/40 p-4 rounded-xl border border-border">
                          <Clock className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
                          <p className="text-2xl font-black text-foreground">{currentProfile.passRate}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Inspection Pass Rate</p>
                        </div>
                      </div>

                      <div className="mt-8 space-y-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Logistics Routes</h4>
                        <div className="border border-border/80 rounded-xl bg-slate-950/80 p-4 relative shadow-inner">
                          <canvas ref={canvasRef} className="w-full block" />
                          <div className="absolute top-4 left-4 bg-slate-900/90 border border-border/60 px-2 py-1 rounded text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            Active Dispatch Route
                          </div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Tab 3: SLA Alerts */}
              {activeTab === "sla" && (
                <motion.div
                  key="sla"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <Card className="card-base">
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <AlertOctagon className="h-5 w-5 text-amber-500" />
                        SLA Compliance Monitoring
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {currentProfile.slaStatus === 'Compliant' ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl text-center space-y-2">
                          <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
                          <h4 className="text-sm font-bold text-emerald-400">All Metrics Compliant</h4>
                          <p className="text-xs text-muted-foreground">Your account is fully compliant with all customer SLA metrics. Maintain high dispatch performance.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4">
                            <AlertOctagon className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-bold text-amber-400">Quality Margin Threshold Warning</h4>
                              <p className="text-xs text-slate-300 mt-1">Inspection pass rate has dropped below target threshold of 98.0%. Active audit required.</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-secondary/40 p-4 rounded-xl border border-border">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Quality Pass Target</span>
                              <p className="text-lg font-bold mt-1 text-slate-200">98.0%</p>
                            </div>
                            <div className="bg-secondary/40 p-4 rounded-xl border border-border">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Your Current Rate</span>
                              <p className="text-lg font-bold mt-1 text-amber-400">{currentProfile.passRate}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Sidebar Panel - Sourcing Summary */}
          <div className="lg:col-span-4 space-y-6">
            
            <Card className="card-base border border-border bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Supplier Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier ID:</span>
                    <span className="font-mono font-bold text-foreground">{currentProfile.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Org Name:</span>
                    <span className="font-bold text-foreground">{currentProfile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SLA Status:</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                      currentProfile.slaStatus === 'Compliant' ? 'bg-emerald-500/10 text-emerald-400' :
                      currentProfile.slaStatus === 'Warning' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>{currentProfile.slaStatus}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Compliance Rating</span>
                  <div className="flex gap-2 items-center">
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border">
                      <div 
                        className={`h-full rounded-full ${
                          currentProfile.slaStatus === 'Compliant' ? 'bg-emerald-500' :
                          currentProfile.slaStatus === 'Warning' ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: currentProfile.slaStatus === 'Compliant' ? '98%' : currentProfile.slaStatus === 'Warning' ? '80%' : '65%' }}
                      />
                    </div>
                    <span className="text-xs font-bold">{currentProfile.slaStatus === 'Compliant' ? '98%' : currentProfile.slaStatus === 'Warning' ? '80%' : '65%'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
