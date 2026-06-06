import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Brain, Zap, Shield, TrendingUp, TrendingDown, AlertTriangle,
  Target, ChevronRight, Loader2, RefreshCw, Activity, BarChart3,
  Lightbulb, FlaskConical, ArrowRight, CheckCircle, Clock, DollarSign,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

// --- Types ---
interface Briefing {
  headline: string;
  health_score: number;
  health_trend: string;
  summary: string;
  critical_items: { title: string; description: string }[];
  top_performers: { name?: string; reason?: string }[];
  at_risk: { name?: string; reason?: string }[];
}

interface RiskForecast {
  supplier_id: string;
  supplier_name: string;
  current_risk: string;
  predicted_risk: string;
  confidence: number;
  trajectory: string;
  risk_score: number;
  key_factors: string[];
  recommendation: string;
}

interface WhatIfResult {
  scenario_title: string;
  severity: string;
  probability: number;
  impact_summary: string;
  affected_suppliers: string[];
  financial_impact: string;
  supply_chain_disruption: number;
  timeline: string;
  mitigation_steps: { action: string; priority: string; cost: string }[];
  alternative_suppliers: string[];
}

interface SmartAction {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  effort: string;
  expected_roi: string;
  target_suppliers: string[];
  deadline: string;
}

// --- Helpers ---
const riskColor = (risk: string) => {
  const r = risk?.toLowerCase();
  if (r === 'low') return 'text-emerald-400';
  if (r === 'medium') return 'text-amber-400';
  return 'text-red-400';
};

const riskBg = (risk: string) => {
  const r = risk?.toLowerCase();
  if (r === 'low') return 'bg-emerald-500/10 border-emerald-500/30';
  if (r === 'medium') return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

const priorityBadge = (priority: string) => {
  const p = priority?.toLowerCase();
  if (p === 'critical') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (p === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (p === 'immediate') return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
};

const trajectoryIcon = (t: string) => {
  if (t === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (t === 'worsening') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const categoryIcon = (c: string) => {
  const cat = c?.toLowerCase();
  if (cat === 'risk') return <Shield className="w-4 h-4" />;
  if (cat === 'cost') return <DollarSign className="w-4 h-4" />;
  if (cat === 'quality') return <Target className="w-4 h-4" />;
  if (cat === 'delivery') return <Clock className="w-4 h-4" />;
  return <Lightbulb className="w-4 h-4" />;
};

// --- Scenarios ---
const SCENARIOS = [
  { id: 'lose_supplier', label: 'Lose a Supplier', icon: AlertTriangle, color: 'text-red-400' },
  { id: 'demand_surge', label: 'Demand Surge +40%', icon: TrendingUp, color: 'text-amber-400' },
  { id: 'quality_crisis', label: 'Quality Crisis', icon: Shield, color: 'text-orange-400' },
  { id: 'cost_increase', label: 'Cost Increase +25%', icon: DollarSign, color: 'text-purple-400' },
  { id: 'geopolitical', label: 'Trade Restrictions', icon: Activity, color: 'text-cyan-400' },
];

// --- Main Component ---
const Agent = () => {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [forecasts, setForecasts] = useState<RiskForecast[]>([]);
  const [whatIf, setWhatIf] = useState<WhatIfResult | null>(null);
  const [actions, setActions] = useState<SmartAction[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingWhatIf, setLoadingWhatIf] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);

  const fetchBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const res = await api.post('/ai-command/briefing');
      setBriefing(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingBriefing(false); }
  };

  const fetchForecast = async () => {
    setLoadingForecast(true);
    try {
      const res = await api.post('/ai-command/risk-forecast');
      setForecasts(res.data.forecasts || []);
    } catch (e) { console.error(e); }
    finally { setLoadingForecast(false); }
  };

  const fetchWhatIf = async (scenarioId: string) => {
    setActiveScenario(scenarioId);
    setLoadingWhatIf(true);
    try {
      const res = await api.post('/ai-command/what-if', { scenario: scenarioId });
      setWhatIf(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingWhatIf(false); }
  };

  const fetchActions = async () => {
    setLoadingActions(true);
    try {
      const res = await api.post('/ai-command/smart-actions');
      setActions(res.data.actions || []);
    } catch (e) { console.error(e); }
    finally { setLoadingActions(false); }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.header
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-xl border border-violet-500/30">
              <Brain className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Command Center</h1>
              <p className="text-sm text-muted-foreground">Azure OpenAI-Powered Supply Chain Intelligence</p>
            </div>
          </div>
        </motion.header>

        {/* ===== ROW 1: Briefing + Risk Forecast ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* BRIEFING PANEL */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full border-violet-500/20 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-violet-400" />
                  <CardTitle className="text-lg">Daily Briefing</CardTitle>
                </div>
                <Button size="sm" variant="outline" onClick={fetchBriefing} disabled={loadingBriefing}
                  className="border-violet-500/30 hover:bg-violet-500/10">
                  {loadingBriefing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span className="ml-1.5">{briefing ? 'Refresh' : 'Generate'}</span>
                </Button>
              </CardHeader>
              <CardContent>
                {!briefing && !loadingBriefing && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Zap className="w-12 h-12 text-violet-400/30 mb-3" />
                    <p className="text-muted-foreground">Click Generate to get your AI-powered daily briefing</p>
                  </div>
                )}
                {loadingBriefing && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">AI is analyzing your supply chain...</p>
                  </div>
                )}
                {briefing && !loadingBriefing && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${briefing.health_score >= 75 ? 'text-emerald-400' : briefing.health_score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {briefing.health_score}
                        </div>
                        <div className="text-xs text-muted-foreground">Health Score</div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{briefing.headline}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{briefing.summary}</p>
                      </div>
                    </div>

                    {briefing.critical_items?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-red-400 tracking-wider">Critical Items</h4>
                        {briefing.critical_items.map((item, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                            <div className="font-medium text-sm text-foreground">{item.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-emerald-400 tracking-wider mb-1.5">Top Performers</h4>
                        {briefing.top_performers?.map((s, i) => (
                          <div key={i} className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span>{typeof s === 'string' ? s : s.name}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-red-400 tracking-wider mb-1.5">At Risk</h4>
                        {briefing.at_risk?.map((s, i) => (
                          <div key={i} className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                            <span>{typeof s === 'string' ? s : s.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* RISK FORECAST PANEL */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full border-cyan-500/20 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <CardTitle className="text-lg">30-Day Risk Forecast</CardTitle>
                </div>
                <Button size="sm" variant="outline" onClick={fetchForecast} disabled={loadingForecast}
                  className="border-cyan-500/30 hover:bg-cyan-500/10">
                  {loadingForecast ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span className="ml-1.5">{forecasts.length ? 'Refresh' : 'Predict'}</span>
                </Button>
              </CardHeader>
              <CardContent>
                {!forecasts.length && !loadingForecast && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="w-12 h-12 text-cyan-400/30 mb-3" />
                    <p className="text-muted-foreground">Click Predict to forecast supplier risks</p>
                  </div>
                )}
                {loadingForecast && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">AI is predicting risk trajectories...</p>
                  </div>
                )}
                {forecasts.length > 0 && !loadingForecast && (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {forecasts.map((f) => (
                      <div key={f.supplier_id} className={`p-3 rounded-lg border ${riskBg(f.predicted_risk)}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-sm text-foreground">{f.supplier_name}</span>
                          <div className="flex items-center gap-2">
                            {trajectoryIcon(f.trajectory)}
                            <span className={`text-xs font-medium ${riskColor(f.current_risk)}`}>{f.current_risk}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className={`text-xs font-bold ${riskColor(f.predicted_risk)}`}>{f.predicted_risk}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex-1 bg-muted/50 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${f.risk_score > 60 ? 'bg-red-400' : f.risk_score > 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${f.risk_score}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{f.confidence}% conf</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{f.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ===== ROW 2: What-If Scenarios ===== */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-amber-500/20 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-lg">What-If Scenario Analyzer</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">Select a scenario to see AI-predicted impact on your supply chain</p>
            </CardHeader>
            <CardContent>
              {/* Scenario Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {SCENARIOS.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={activeScenario === s.id ? 'default' : 'outline'}
                    onClick={() => fetchWhatIf(s.id)}
                    disabled={loadingWhatIf}
                    className={activeScenario !== s.id ? 'border-amber-500/20 hover:bg-amber-500/10' : ''}
                  >
                    <s.icon className={`w-4 h-4 mr-1.5 ${activeScenario === s.id ? '' : s.color}`} />
                    {s.label}
                  </Button>
                ))}
              </div>

              {/* What-If Result */}
              <AnimatePresence mode="wait">
                {loadingWhatIf && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">AI is simulating this scenario...</p>
                  </motion.div>
                )}

                {whatIf && !loadingWhatIf && (
                  <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="space-y-4">
                    {/* Top summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className={`p-3 rounded-lg border ${whatIf.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' : whatIf.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                        <div className="text-xs text-muted-foreground">Severity</div>
                        <div className="font-bold text-foreground capitalize">{whatIf.severity}</div>
                      </div>
                      <div className="p-3 rounded-lg border bg-violet-500/10 border-violet-500/30">
                        <div className="text-xs text-muted-foreground">Probability</div>
                        <div className="font-bold text-foreground">{whatIf.probability}%</div>
                      </div>
                      <div className="p-3 rounded-lg border bg-cyan-500/10 border-cyan-500/30">
                        <div className="text-xs text-muted-foreground">Disruption</div>
                        <div className="font-bold text-foreground">{whatIf.supply_chain_disruption}%</div>
                      </div>
                      <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30">
                        <div className="text-xs text-muted-foreground">Financial</div>
                        <div className="font-bold text-foreground text-sm">{whatIf.financial_impact}</div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">{whatIf.impact_summary}</p>

                    {/* Mitigation steps */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-amber-400 tracking-wider mb-2">Mitigation Plan</h4>
                      <div className="space-y-2">
                        {whatIf.mitigation_steps?.map((step, i) => (
                          <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${priorityBadge(step.priority)}`}>
                              {step.priority}
                            </span>
                            <span className="text-sm text-foreground flex-1">{step.action}</span>
                            <span className="text-xs text-muted-foreground">{step.cost} cost</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!whatIf && !loadingWhatIf && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FlaskConical className="w-10 h-10 text-amber-400/30 mb-3" />
                  <p className="text-muted-foreground text-sm">Select a scenario above to run an AI simulation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== ROW 3: Smart Actions ===== */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-emerald-500/20 bg-card/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-emerald-400" />
                <CardTitle className="text-lg">AI Smart Actions</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={fetchActions} disabled={loadingActions}
                className="border-emerald-500/30 hover:bg-emerald-500/10">
                {loadingActions ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-1.5">{actions.length ? 'Refresh' : 'Generate'}</span>
              </Button>
            </CardHeader>
            <CardContent>
              {!actions.length && !loadingActions && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Lightbulb className="w-12 h-12 text-emerald-400/30 mb-3" />
                  <p className="text-muted-foreground">Generate AI-prioritized action recommendations</p>
                </div>
              )}
              {loadingActions && (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">AI is building your action plan...</p>
                </div>
              )}
              {actions.length > 0 && !loadingActions && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {actions.map((a) => (
                    <motion.div key={a.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: a.id * 0.05 }}
                      className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                            {categoryIcon(a.category)}
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${priorityBadge(a.priority)}`}>
                            {a.priority}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="font-semibold text-sm text-foreground mb-1">{a.title}</h4>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{a.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-medium">{a.expected_roi}</span>
                        <span className="text-muted-foreground">{a.deadline}</span>
                      </div>
                      {a.target_suppliers?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.target_suppliers.slice(0, 2).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">{s}</span>
                          ))}
                          {a.target_suppliers.length > 2 && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
                              +{a.target_suppliers.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Agent;
