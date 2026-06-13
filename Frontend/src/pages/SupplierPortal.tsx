import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Building2, TrendingUp, AlertTriangle, MapPin, Package,
  FileText, Navigation, Loader2, CheckCircle2, XCircle,
  CloudRain, Newspaper, BarChart3, RefreshCw, Clock, Zap
} from 'lucide-react';

interface RouteReport {
  report_id: string;
  source: string;
  destination: string;
  risk_score: number;
  reliability_score: number;
  delay_probability: number;
  estimated_transit_days: number;
  weather_analysis: any;
  news_analysis: any;
  infrastructure_analysis: any;
  historical_sla_analysis: any;
  recommendation: string;
  rfq_id?: string;
  created_at: string;
}

interface RFQ {
  id: string;
  part_sku: string;
  quantity: number;
  target_delivery_days: number;
  delivery_location: string;
  status: string;
  created_at: string;
}

const RISK_COLOR = (score: number) => {
  if (score >= 70) return 'text-red-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-emerald-400';
};

const RISK_BG = (score: number) => {
  if (score >= 70) return 'bg-red-500/10 border-red-500/30';
  if (score >= 40) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-emerald-500/10 border-emerald-500/30';
};

const ScoreGauge = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r="32"
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(value / 100) * 201} 201`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-foreground">{Math.round(value)}</span>
      </div>
    </div>
    <span className="text-xs text-muted-foreground font-medium">{label}</span>
  </div>
);

export default function SupplierPortal() {
  const SUPPLIER_ID = 'SUP001'; // In production: get from auth context

  const tabs = ['overview', 'route-intelligence', 'rfqs', 'documents'] as const;
  type Tab = typeof tabs[number];
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Route Intelligence state
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [routeReports, setRouteReports] = useState<RouteReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<RouteReport | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // RFQ state
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(false);

  const fetchRouteReports = async () => {
    setLoadingReports(true);
    try {
      const res = await api.get(`/route-intelligence/supplier/${SUPPLIER_ID}`);
      setRouteReports(res.data.reports || []);
    } catch {
      setRouteReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchRfqs = async () => {
    setLoadingRfqs(true);
    try {
      const res = await api.get('/rfqs');
      setRfqs((res.data || []).filter((r: RFQ) => r.status !== 'Rejected'));
    } catch {
      setRfqs([]);
    } finally {
      setLoadingRfqs(false);
    }
  };

  useEffect(() => {
    fetchRouteReports();
    fetchRfqs();
  }, []);

  const handleAnalyzeRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !destination.trim()) {
      toast.error('Please enter both Source and Destination');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await api.post('/route-intelligence/analyze', {
        supplier_id: SUPPLIER_ID,
        source: source.trim(),
        destination: destination.trim(),
        rfq_id: selectedRfqId || null,
      });
      toast.success('Route analysis complete!');
      setSelectedReport(res.data);
      await fetchRouteReports();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Route analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const tabLabels: Record<Tab, { label: string; icon: React.ReactNode }> = {
    'overview': { label: 'Overview', icon: <Building2 className="h-4 w-4" /> },
    'route-intelligence': { label: 'Route Intelligence', icon: <Navigation className="h-4 w-4" /> },
    'rfqs': { label: 'My RFQs', icon: <FileText className="h-4 w-4" /> },
    'documents': { label: 'Documents', icon: <Package className="h-4 w-4" /> },
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              Supplier Command Center
            </h1>
            <p className="text-muted-foreground mt-1">AI-powered supply chain intelligence for your business</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-3 py-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse inline-block" />
              Active Supplier
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border border-border rounded-xl p-1 bg-secondary/20 w-fit">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tabLabels[tab].icon}
              {tabLabels[tab].label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── Overview Tab ────────────────────────────────── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Route Reports', value: routeReports.length, icon: <Navigation className="h-5 w-5" />, color: 'text-primary' },
                  { label: 'Active RFQs', value: rfqs.filter(r => r.status === 'Sent' || r.status === 'Draft').length, icon: <FileText className="h-5 w-5" />, color: 'text-amber-400' },
                  { label: 'Avg Route Risk', value: routeReports.length ? `${Math.round(routeReports.reduce((a, r) => a + r.risk_score, 0) / routeReports.length)}` : 'N/A', icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-400' },
                ].map((stat) => (
                  <Card key={stat.label} className="card-base">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>{stat.icon}</div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Route Reports */}
              <Card className="card-base">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" /> Recent Route Intelligence Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingReports ? (
                    <div className="flex justify-center items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : routeReports.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Navigation className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No route reports yet. Run an analysis from the Route Intelligence tab.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {routeReports.slice(0, 5).map(report => (
                        <div key={report.report_id} className="p-4 hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span className="font-semibold text-sm">{report.source} → {report.destination}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-lg font-bold ${RISK_COLOR(report.risk_score)}`}>{Math.round(report.risk_score)}</p>
                                <p className="text-[10px] text-muted-foreground">Risk Score</p>
                              </div>
                              <button
                                onClick={() => { setSelectedReport(report); setActiveTab('route-intelligence'); }}
                                className="text-xs text-primary hover:underline"
                              >
                                View →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── Route Intelligence Tab ──────────────────────── */}
          {activeTab === 'route-intelligence' && (
            <motion.div key="route" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Analysis Form */}
                <Card className="card-base lg:col-span-2">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" /> Analyze Route
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleAnalyzeRoute} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Source Location</Label>
                        <Input
                          placeholder="e.g. Mumbai Port, Thane Warehouse"
                          value={source}
                          onChange={e => setSource(e.target.value)}
                          className="bg-secondary/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Destination</Label>
                        <Input
                          placeholder="e.g. Pune Chakan MIDC, Delhi NCR"
                          value={destination}
                          onChange={e => setDestination(e.target.value)}
                          className="bg-secondary/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Link to RFQ (Optional)</Label>
                        <select
                          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-secondary/40 text-foreground"
                          value={selectedRfqId}
                          onChange={e => setSelectedRfqId(e.target.value)}
                        >
                          <option value="">-- No RFQ --</option>
                          {rfqs.map(rfq => (
                            <option key={rfq.id} value={rfq.id}>{rfq.id} · {rfq.part_sku}</option>
                          ))}
                        </select>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-primary">AI Analysis includes:</p>
                        <p>☁️ Weather (Open-Meteo 7-day forecast)</p>
                        <p>📰 News disruption intelligence (NewsAPI)</p>
                        <p>📊 SLA & delivery history from Supabase</p>
                        <p>🤖 LLM-powered route recommendation</p>
                      </div>
                      <Button type="submit" disabled={analyzing} className="w-full bg-primary hover:bg-primary/90 font-bold">
                        {analyzing ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing Route...</>
                        ) : (
                          <><Navigation className="h-4 w-4 mr-2" />Run AI Route Analysis</>
                        )}
                      </Button>
                    </form>

                    {/* Past Reports List */}
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past Reports</p>
                        <button onClick={fetchRouteReports} className="text-primary hover:text-primary/80">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {routeReports.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No reports yet</p>
                      ) : (
                        routeReports.map(report => (
                          <button
                            key={report.report_id}
                            onClick={() => setSelectedReport(report)}
                            className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                              selectedReport?.report_id === report.report_id
                                ? 'border-primary/50 bg-primary/10'
                                : 'border-border hover:border-primary/30 hover:bg-secondary/40'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-foreground truncate max-w-[150px]">{report.source} → {report.destination}</p>
                                <p className="text-muted-foreground mt-0.5">{new Date(report.created_at).toLocaleDateString()}</p>
                              </div>
                              <span className={`font-bold text-base ${RISK_COLOR(report.risk_score)}`}>{Math.round(report.risk_score)}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Report Detail */}
                <div className="lg:col-span-3">
                  {!selectedReport ? (
                    <Card className="card-base h-full flex items-center justify-center">
                      <div className="text-center text-muted-foreground p-12">
                        <Navigation className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Run an analysis or select a past report</p>
                        <p className="text-sm mt-1">AI will analyze weather, news, and SLA data in real-time</p>
                      </div>
                    </Card>
                  ) : (
                    <motion.div key={selectedReport.report_id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      {/* Score Cards */}
                      <Card className={`card-base border ${RISK_BG(selectedReport.risk_score)}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-base font-bold">{selectedReport.source}</h3>
                              <p className="text-muted-foreground text-sm flex items-center gap-1">
                                <span>→</span> {selectedReport.destination}
                              </p>
                            </div>
                            <Badge variant="outline" className={`${RISK_BG(selectedReport.risk_score)} font-bold`}>
                              {selectedReport.risk_score >= 70 ? 'High Risk' : selectedReport.risk_score >= 40 ? 'Medium Risk' : 'Low Risk'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-around py-4">
                            <ScoreGauge value={selectedReport.risk_score} label="Risk Score" color="#f87171" />
                            <ScoreGauge value={selectedReport.reliability_score} label="Reliability" color="#34d399" />
                            <ScoreGauge value={selectedReport.delay_probability} label="Delay Prob." color="#fbbf24" />
                            {selectedReport.estimated_transit_days && (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center w-20 h-20">
                                  <div className="text-center">
                                    <p className="text-2xl font-bold text-foreground">{selectedReport.estimated_transit_days.toFixed(1)}</p>
                                    <p className="text-[10px] text-muted-foreground">days</p>
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium">Transit Time</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* AI Recommendation */}
                      {selectedReport.recommendation && (
                        <Card className="card-base border border-primary/20 bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Zap className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">AI Recommendation</p>
                                <p className="text-sm text-foreground leading-relaxed">{selectedReport.recommendation}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Analysis Details Grid */}
                      <div className="grid grid-cols-1 gap-4">
                        {/* Weather */}
                        <Card className="card-base">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CloudRain className="h-4 w-4 text-blue-400" />
                              <span className="text-sm font-bold">Weather Intelligence</span>
                              <Badge variant="outline" className={`ml-auto text-[10px] ${
                                selectedReport.weather_analysis?.risk_level === 'High' ? 'text-red-400 border-red-500/30' :
                                selectedReport.weather_analysis?.risk_level === 'Medium' ? 'text-amber-400 border-amber-500/30' :
                                'text-emerald-400 border-emerald-500/30'
                              }`}>
                                {selectedReport.weather_analysis?.risk_level || 'N/A'} Risk
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{selectedReport.weather_analysis?.summary}</p>
                            {selectedReport.weather_analysis?.locations?.map((loc: any, i: number) => (
                              <div key={i} className="mt-2 p-2 bg-secondary/30 rounded-lg text-xs">
                                <span className="font-semibold text-foreground">{loc.location}:</span>{' '}
                                {loc.condition} · Rain: {loc.max_precipitation_mm}mm · Wind: {loc.max_windspeed_kmh}km/h
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        {/* News */}
                        <Card className="card-base">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Newspaper className="h-4 w-4 text-purple-400" />
                              <span className="text-sm font-bold">News Intelligence</span>
                              <Badge variant="outline" className={`ml-auto text-[10px] ${
                                selectedReport.news_analysis?.risk_level === 'High' ? 'text-red-400 border-red-500/30' :
                                selectedReport.news_analysis?.risk_level === 'Medium' ? 'text-amber-400 border-amber-500/30' :
                                'text-emerald-400 border-emerald-500/30'
                              }`}>
                                {selectedReport.news_analysis?.risk_level || 'N/A'} Risk
                              </Badge>
                            </div>
                            {selectedReport.news_analysis?.headlines?.length > 0 ? (
                              <div className="space-y-2">
                                {selectedReport.news_analysis.headlines.slice(0, 3).map((h: any, i: number) => (
                                  <div key={i} className="p-2 bg-secondary/30 rounded-lg text-xs">
                                    <p className="font-medium text-foreground line-clamp-1">{h.title}</p>
                                    <p className="text-muted-foreground mt-0.5">{h.source} · {new Date(h.published_at).toLocaleDateString()}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">{selectedReport.news_analysis?.summary || 'No disruption news found.'}</p>
                            )}
                          </CardContent>
                        </Card>

                        {/* SLA History */}
                        <Card className="card-base">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <TrendingUp className="h-4 w-4 text-emerald-400" />
                              <span className="text-sm font-bold">Historical SLA Performance</span>
                              <Badge variant="outline" className={`ml-auto text-[10px] ${
                                selectedReport.historical_sla_analysis?.risk_level === 'Critical' ? 'text-red-400 border-red-500/30' :
                                selectedReport.historical_sla_analysis?.risk_level === 'High' ? 'text-orange-400 border-orange-500/30' :
                                selectedReport.historical_sla_analysis?.risk_level === 'Medium' ? 'text-amber-400 border-amber-500/30' :
                                'text-emerald-400 border-emerald-500/30'
                              }`}>
                                {selectedReport.historical_sla_analysis?.risk_level || 'N/A'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{selectedReport.historical_sla_analysis?.summary}</p>
                            <div className="flex gap-4 text-xs">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-foreground font-bold">{selectedReport.historical_sla_analysis?.compliant_count ?? 0}</span>
                                <span className="text-muted-foreground">Compliant</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                <span className="text-foreground font-bold">{selectedReport.historical_sla_analysis?.warning_count ?? 0}</span>
                                <span className="text-muted-foreground">Warning</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <XCircle className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-foreground font-bold">{selectedReport.historical_sla_analysis?.breached_count ?? 0}</span>
                                <span className="text-muted-foreground">Breached</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── RFQs Tab ────────────────────────────────────── */}
          {activeTab === 'rfqs' && (
            <motion.div key="rfqs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="card-base">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> My RFQs ({rfqs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingRfqs ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : rfqs.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No RFQs assigned to you yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {rfqs.map(rfq => (
                        <div key={rfq.id} className="p-5 hover:bg-secondary/20 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-primary">{rfq.id}</span>
                                <Badge variant="outline" className={`text-[10px] ${
                                  rfq.status === 'Approved' ? 'text-emerald-400 border-emerald-500/30' :
                                  rfq.status === 'Sent' ? 'text-blue-400 border-blue-500/30' :
                                  rfq.status === 'Bid_Submitted' ? 'text-purple-400 border-purple-500/30' :
                                  'text-muted-foreground border-border'
                                }`}>{rfq.status}</Badge>
                              </div>
                              <p className="font-semibold text-foreground">{rfq.part_sku}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Package className="h-3 w-3" />{rfq.quantity} units</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{rfq.target_delivery_days}d delivery</span>
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{rfq.delivery_location}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                              onClick={() => {
                                setSelectedRfqId(rfq.id);
                                setDestination(rfq.delivery_location);
                                setActiveTab('route-intelligence');
                                toast.info('RFQ linked to Route Intelligence. Enter source to analyze.');
                              }}
                            >
                              <Navigation className="h-3.5 w-3.5 mr-1" /> Analyze Route
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── Documents Tab ──────────────────────────────── */}
          {activeTab === 'documents' && (
            <motion.div key="docs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="card-base">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-foreground">Document Management</p>
                  <p className="text-sm mt-1">Upload compliance certificates, contracts, and audit reports to the AI knowledge base.</p>
                  <Button className="mt-4" variant="outline">
                    Upload Document (Coming Sprint 4b)
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
