import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Send, 
  HelpCircle, 
  AlertTriangle,
  Building,
  UserCheck,
  TrendingDown,
  Info,
  Settings,
  Loader2
} from 'lucide-react';

interface AlternativeSupplier {
  id: string;
  name: string;
  fitScore: number;
  costCompare: string;
  leadTime: number;
  capacity: string;
  quality: string;
  risk: string;
  impact: string;
  badge: string;
}

interface RFQRecord {
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

export default function SupplierSwap() {
  // Real alternatives from Procurement Agent
  const [alternatives, setAlternatives] = useState<AlternativeSupplier[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [selectedAlt, setSelectedAlt] = useState<AlternativeSupplier | null>(null);

  const [rfqList, setRfqList] = useState<RFQRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Sourcing Requirements Inputs (Step 1)
  const [sku, setSku] = useState("COSM-HYD-04");
  const [qty, setQty] = useState("5000");
  const [targetDays, setTargetDays] = useState("14");
  const [location, setLocation] = useState("Tata Motors Assembly Plant, Pimpri");
  const [disruptedSupplierId, setDisruptedSupplierId] = useState("SUP004");
  const [disruptedSupplierName, setDisruptedSupplierName] = useState("Premier Haircare");
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Sourcing Search Workflow State
  const [hasSearched, setHasSearched] = useState(false);

  // RFQ Persisted Draft State
  const [draftRfq, setDraftRfq] = useState<RFQRecord | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [terms, setTerms] = useState("");
  const [sendingRfq, setSendingRfq] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('user_openrouter_api_key') || '');

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      const data = res.data?.data?.suppliers || [];
      setSuppliers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAlternatives = async () => {
    setAgentLoading(true);
    setAgentError(null);
    setHasSearched(true);
    setSelectedAlt(null);
    setDraftRfq(null);
    setTerms("");
    try {
      const res = await api.post('/agents/procurement', {
        query: `Find alternative suppliers for part SKU ${sku} with quantity ${qty} units and target delivery ${targetDays} days. Disrupted supplier is ${disruptedSupplierName} (${disruptedSupplierId}). Rank them by overall score, lowest risk, and best OTD.`,
        supplier_id: disruptedSupplierId,
      });
      const recs = res.data?.findings?.recommended_suppliers || [];
      // Map Procurement Agent response to UI shape
      const mapped: AlternativeSupplier[] = recs.map((r: any) => ({
        id: r.supplier_id,
        name: r.supplier_name,
        fitScore: r.overall_score || 0,
        costCompare: r.cost_index === 'Lower' ? '↓ Lower' : r.cost_index === 'Higher' ? '↑ Higher' : '≈ Similar',
        leadTime: r.lead_time_days || 0,
        capacity: r.otd_percentage >= 90 ? 'High' : r.otd_percentage >= 75 ? 'Medium' : 'Low',
        quality: `${(100 - (r.defect_rate || 2)).toFixed(1)}%`,
        risk: r.risk_level || 'Unknown',
        impact: r.swap_recommendation?.includes('Recommended') ? 'Favorable' : 'Neutral',
        badge: r.rank === 1 ? 'Best Fit' : r.rank <= 3 ? 'Shortlist' : 'Backup',
      }));
      setAlternatives(mapped);
      if (mapped.length > 0) {
        setSelectedAlt(mapped[0]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Procurement Agent unavailable — showing cached data';
      setAgentError(msg);
      // Fallback static data so UI doesn't break
      const fallback: AlternativeSupplier[] = [
        { id: "SUP001", name: "Glow Cosmetics", fitScore: 92, costCompare: "-3.2%", leadTime: 5, capacity: "High", quality: "98.2%", risk: "Low", impact: "Favorable", badge: "Best Fit" },
        { id: "SUP002", name: "Herbal Essence Ltd", fitScore: 86, costCompare: "+1.8%", leadTime: 6, capacity: "High", quality: "99.1%", risk: "Low", impact: "Favorable", badge: "Shortlist" },
        { id: "SUP003", name: "EcoBeauty Solutions", fitScore: 74, costCompare: "+5.5%", leadTime: 8, capacity: "Medium", quality: "95.8%", risk: "Medium", impact: "Neutral", badge: "Shortlist" },
      ];
      setAlternatives(fallback);
      setSelectedAlt(fallback[0]);
    } finally {
      setAgentLoading(false);
    }
  };

  const fetchRfqs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rfqs');
      setRfqList(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load active RFQ log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchRfqs();
  }, []);

  const handleGenerateDraft = async () => {
    if (!selectedAlt) {
      toast.error("Please select a supplier from the list first.");
      return;
    }
    setIsGeneratingDraft(true);
    try {
      // 1. Generate customized terms/T&Cs using LLM if possible
      const resDraft = await api.post(`/suppliers/${selectedAlt.id}/draft-email`, {
        subject: `Draft terms for RFQ: Part SKU ${sku}, Qty ${qty}, Target Delivery ${targetDays} days. Address special compliance for standard net-30 terms, ISO 9001 and IATF 16949 certification compliance.`,
        sender_role: 'Admin'
      });
      
      const generatedTerms = resDraft.data?.draft || `Standard net-30 terms. ISO 9001 and IATF 16949 certification compliance required. Immediate delivery upon validation for SKU ${sku} (Quantity: ${qty}).`;
      setTerms(generatedTerms);

      // 2. Persist the RFQ as "Draft" in the database
      const payload = {
        supplier_id: selectedAlt.id,
        original_supplier_id: disruptedSupplierId,
        part_sku: sku,
        quantity: parseInt(qty),
        target_delivery_days: parseInt(targetDays),
        delivery_location: location,
        terms_conditions: generatedTerms,
        status: "Draft"
      };

      const resRfq = await api.post('/rfqs', payload);
      setDraftRfq(resRfq.data);
      toast.success(`Draft RFQ generated successfully for ${selectedAlt.name}!`);
      fetchRfqs(); // Reload list
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to generate RFQ draft");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSendRFQ = async () => {
    if (!draftRfq) {
      toast.error("Please generate an RFQ draft first.");
      return;
    }
    setSendingRfq(true);
    try {
      // Broadcast / Send the draft RFQ (updating status to "Sent")
      await api.post(`/rfqs/${draftRfq.id}/send`);
      toast.success(`RFQ broadcasted to ${selectedAlt?.name}!`);
      setDraftRfq(null); // Clear active draft
      setSelectedAlt(null); // Reset selection
      setTerms("");
      fetchRfqs(); // Reload list
    } catch (e) {
      toast.error("Failed to send RFQ");
    } finally {
      setSendingRfq(false);
    }
  };

  const handleApproveSwap = async (rfqId: string) => {
    try {
      await api.post(`/rfqs/${rfqId}/approve`);
      toast.success("Supplier swap approved! Database updated and alerts resolved.");
      fetchRfqs(); // Reload list
    } catch (e) {
      toast.error("Failed to approve supplier swap");
    }
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              Supplier Swap & RFQ Autopilot
            </h1>
            <p className="text-muted-foreground mt-1">
              Search alternative suppliers, rank them by fit, generate draft RFQs, and broadcast to candidates.
            </p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            Autopilot Ready
          </div>
        </header>

        {/* Workflow Diagram */}
        <div className="grid grid-cols-6 gap-2 text-center text-[9px] font-bold text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-border/60">
          <div className="p-1">1. TRIGGER</div>
          <div className="p-1">2. REQUIREMENT EXTRACT</div>
          <div className="p-1">3. ALTERNATE SEARCH</div>
          <div className="bg-primary/20 text-cyan-400 border border-cyan-400/40 p-1 rounded animate-pulse">4. EVALUATION & RANK</div>
          <div className="bg-primary/20 text-cyan-400 border border-cyan-400/40 p-1 rounded">5. RFQ AUTOGEN</div>
          <div className="p-1">6. TAKE ACTION</div>
        </div>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Main ranking and active list area (Col 8) */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Step 1: Sourcing Requirement Input */}
            <Card className="card-base border border-primary/20 bg-card/45">
              <CardHeader className="py-4 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">1</span>
                  Enter Sourcing Requirement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="disruptedSupplier" className="text-muted-foreground">Disrupted Supplier</Label>
                    <select
                      id="disruptedSupplier"
                      className="w-full border border-border rounded-md px-3 py-2 text-xs bg-secondary/40 text-foreground h-9"
                      value={disruptedSupplierId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDisruptedSupplierId(val);
                        const match = suppliers.find(s => s.supplier_id === val);
                        if (match) setDisruptedSupplierName(match.name);
                      }}
                    >
                      {suppliers.map(s => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.name} ({s.supplier_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sku" className="text-muted-foreground">Part / SKU Name</Label>
                    <Input
                      id="sku"
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                      className="bg-secondary/40 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="qty" className="text-muted-foreground">Required Quantity</Label>
                    <Input
                      id="qty"
                      type="number"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      className="bg-secondary/40 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="targetDays" className="text-muted-foreground">Target Delivery Days</Label>
                    <Input
                      id="targetDays"
                      type="number"
                      value={targetDays}
                      onChange={e => setTargetDays(e.target.value)}
                      className="bg-secondary/40 h-9"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="location" className="text-muted-foreground">Delivery Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="bg-secondary/40 h-9"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={fetchAlternatives}
                    disabled={agentLoading || !sku || !qty}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6"
                  >
                    {agentLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2 text-cyan-400" />Search Matching Suppliers</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Alternatives Ranking Table */}
            <Card className="card-base">
              <CardHeader className="py-4 flex flex-row justify-between items-center border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">2</span>
                  Review & Rank Alternative Suppliers
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {agentLoading ? '⟳ Procurement Agent running...' : hasSearched ? `${alternatives.length} alternatives matched` : 'No search run'}
                </span>
              </CardHeader>
              <CardContent className="p-0">
                {agentError && (
                  <div className="m-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{agentError} — showing fallback data.</span>
                  </div>
                )}
                {!hasSearched ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <Building className="h-10 w-10 opacity-30 mb-3" />
                    <p className="font-semibold text-sm">No Sourcing Query Run Yet</p>
                    <p className="text-xs mt-1">Fill out the requirements in Step 1 and search to discover alternative candidates.</p>
                  </div>
                ) : agentLoading ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span className="text-sm">Procurement Agent is finding alternatives...</span>
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-[10px] font-bold text-muted-foreground uppercase">
                        <th className="p-4">Fit Rank</th>
                        <th className="p-4">Supplier</th>
                        <th className="p-4 text-center">Fit Score</th>
                        <th className="p-4">Cost vs Current</th>
                        <th className="p-4">Lead Time</th>
                        <th className="p-4">Capacity</th>
                        <th className="p-4">Quality History</th>
                        <th className="p-4">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {alternatives.map((alt, idx) => (
                        <tr 
                          key={alt.id}
                          onClick={() => {
                            setSelectedAlt(alt);
                            setDraftRfq(null);
                            setTerms("");
                            toast.info(`Selected ${alt.name} for RFQ generation.`);
                          }}
                          className={`cursor-pointer transition-all hover:bg-secondary/40 ${
                            selectedAlt?.id === alt.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                          }`}
                        >
                          <td className="p-4 font-bold">
                            <div className="flex items-center gap-2">
                              <span>#{idx + 1}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                alt.badge === 'Best Fit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                alt.badge === 'Shortlist' ? 'bg-cyan-500/10 text-cyan-400' :
                                'bg-slate-500/10 text-slate-400'
                              }`}>{alt.badge}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-foreground">{alt.name}</td>
                          <td className="p-4 text-center">
                            <span className="font-extrabold text-primary">{alt.fitScore}%</span>
                          </td>
                          <td className={`p-4 font-semibold ${alt.costCompare.startsWith('-') ? 'text-emerald-400' : 'text-red-400'}`}>
                            {alt.costCompare}
                          </td>
                          <td className="p-4 font-semibold">{alt.leadTime} Days</td>
                          <td className="p-4">{alt.capacity}</td>
                          <td className="p-4 font-medium">{alt.quality}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              alt.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>{alt.risk}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Active RFQ / Bids Tracker */}
            <Card className="card-base">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Active RFQs & Submitted Bids Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 border-t border-border">
                {loading ? (
                  <p className="p-6 text-center text-xs text-muted-foreground">Loading active RFQ log...</p>
                ) : rfqList.length === 0 ? (
                  <p className="p-6 text-center text-xs text-muted-foreground">No RFQs sent yet. Use the autopilot on the right to broadcast an RFQ.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {rfqList.map(rfq => (
                      <div key={rfq.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary">{rfq.id}</span>
                            <span className="font-bold text-foreground">Target: {rfq.supplier_name}</span>
                          </div>
                          <p className="text-muted-foreground">
                            Part: {rfq.part_sku} | Qty: {rfq.quantity.toLocaleString()} | Delivery target: {rfq.target_delivery_days} days
                          </p>
                          
                          {/* Bid proposal details if submitted */}
                          {rfq.status === 'Bid_Submitted' && (
                            <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg mt-2 space-y-1">
                              <span className="font-bold text-amber-400">Received Proposal:</span>
                              <div className="grid grid-cols-2 gap-4 mt-1">
                                <div>Proposed Price: <strong>${rfq.bid_price?.toFixed(2)}</strong></div>
                                <div>Proposed Lead Time: <strong>{rfq.bid_lead_time} Days</strong></div>
                              </div>
                              {rfq.bid_comments && <p className="text-muted-foreground mt-1">"{rfq.bid_comments}"</p>}
                            </div>
                          )}
                        </div>

                        {/* Status and Action Buttons */}
                        <div className="flex items-center gap-3 self-end md:self-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rfq.status === 'Sent' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                            rfq.status === 'Bid_Submitted' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                            rfq.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-slate-500/10 text-slate-400'
                          }`}>
                            {rfq.status.replace('_', ' ')}
                          </span>

                          {rfq.status === 'Bid_Submitted' && (
                            <Button 
                              onClick={() => handleApproveSwap(rfq.id)} 
                              size="sm" 
                              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                            >
                              Approve Swap
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* AI RFQ Draft Sidebar (Col 4) */}
          <div className="xl:col-span-4 space-y-6">
            <Card className="card-base border border-primary/20 bg-card/65 backdrop-blur-md shadow-2xl">
              <CardHeader className="border-b border-border/80 flex flex-row items-center gap-2 py-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-extrabold text-foreground flex-1 flex items-center justify-between">
                  <span>AI RFQ Auto-Generator</span>
                  <button 
                    onClick={() => setShowSettings(!showSettings)} 
                    className="text-muted-foreground hover:text-foreground transition-all"
                    title="API Settings"
                  >
                    <Settings className={`h-4 w-4 ${showSettings ? 'animate-spin' : ''}`} />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {showSettings && (
                  <div className="p-3 bg-secondary/35 rounded-lg border border-border text-[11px] space-y-2">
                    <p className="font-semibold text-primary">🔧 Configure Custom OpenRouter Settings</p>
                    <div className="space-y-1">
                      <Label className="text-[10px]">OpenRouter API Key</Label>
                      <Input 
                        type="password" 
                        placeholder="sk-or-..." 
                        value={userApiKey} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setUserApiKey(val);
                          if (val.trim()) {
                            localStorage.setItem('user_openrouter_api_key', val.trim());
                          } else {
                            localStorage.removeItem('user_openrouter_api_key');
                          }
                        }}
                        className="h-7 text-xs bg-slate-900 border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Model</Label>
                      <Input 
                        placeholder="google/gemini-2.5-flash" 
                        value={localStorage.getItem('user_openrouter_model') || 'google/gemini-2.5-flash'} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.trim()) {
                            localStorage.setItem('user_openrouter_model', val.trim());
                          } else {
                            localStorage.removeItem('user_openrouter_model');
                          }
                        }}
                        className="h-7 text-xs bg-slate-900 border-border"
                      />
                    </div>
                  </div>
                )}

                {!selectedAlt ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Info className="h-8 w-8 mx-auto opacity-20" />
                    <p className="font-semibold text-sm">No Supplier Selected</p>
                    <p className="text-xs">Select an alternative supplier from the rankings table to initiate RFQ generation.</p>
                  </div>
                ) : !draftRfq ? (
                  <div className="space-y-4">
                    <div className="bg-slate-950/80 border border-border p-3 rounded-lg text-[10px] font-mono text-cyan-400 space-y-1">
                      <p>SYSTEM // SELECTED SUPPLIER: {selectedAlt.name}</p>
                      <p>SYSTEM // FIT SCORE: {selectedAlt.fitScore}%</p>
                      <p>SYSTEM // RFQ STATE: NOT GENERATED</p>
                    </div>
                    <Button 
                      onClick={handleGenerateDraft} 
                      disabled={isGeneratingDraft}
                      className="w-full bg-primary hover:bg-primary/90 font-bold"
                    >
                      {isGeneratingDraft ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Draft...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2 text-cyan-400 animate-pulse" />Generate RFQ Draft</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-950/80 border border-border p-3 rounded-lg text-[10px] font-mono text-cyan-400 space-y-1">
                      <p>SYSTEM // RFQ ID: {draftRfq.id}</p>
                      <p>SYSTEM // TARGET: {selectedAlt.name}</p>
                      <p>SYSTEM // RFQ STATUS: DRAFT</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="sku">Part / SKU Name</Label>
                      <Input 
                        id="sku"
                        disabled
                        value={sku}
                        className="bg-secondary/20 h-8 text-xs opacity-75"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="qty">Quantity</Label>
                        <Input 
                          id="qty"
                          type="number"
                          disabled
                          value={qty}
                          className="bg-secondary/20 h-8 text-xs opacity-75"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="targetDays">Target Delivery (Days)</Label>
                        <Input 
                          id="targetDays"
                          type="number"
                          disabled
                          value={targetDays}
                          className="bg-secondary/20 h-8 text-xs opacity-75"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="terms">AI Drafted Terms & T&Cs</Label>
                      <Textarea 
                        id="terms"
                        rows={7}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="text-xs bg-slate-950 border-border"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          setDraftRfq(null);
                          setTerms("");
                        }}
                        variant="outline"
                        className="flex-1 text-xs font-semibold h-9"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSendRFQ} 
                        disabled={sendingRfq}
                        className="flex-[2] bg-cyan-500 hover:bg-cyan-600 font-bold text-slate-950 h-9"
                      >
                        {sendingRfq ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Broadcasting...</>
                        ) : (
                          <><Send className="h-3.5 w-3.5 mr-1.5" />Broadcast RFQ</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            <Card className="card-base border border-border bg-secondary/20">
              <CardContent className="p-4 flex gap-3 text-xs text-muted-foreground">
                <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  Once you broadcast the RFQ, the target supplier will receive a notification in their **Supplier Portal** where they can submit their custom capacity bid.
                </p>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
