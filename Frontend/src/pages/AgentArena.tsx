import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Brain, Bot, Shield, ShoppingCart, ChevronRight, Loader2,
  Zap, AlertTriangle, TrendingUp, Users, Send, Clock, Sparkles
} from 'lucide-react';

interface AgentMessage {
  agent: string;
  content: string;
  timestamp: number;
}

interface AgentRunResponse {
  session_id: string;
  query: string;
  executive_summary: string;
  risk_findings?: any;
  procurement_findings?: any;
  agent_trace: string[];
  agents_invoked: string[];
}

const AGENT_CONFIG = {
  supervisor: { icon: <Brain className="h-5 w-5" />, color: '#a78bfa', bg: 'bg-violet-500/10 border-violet-500/30', label: 'Supervisor' },
  risk: { icon: <Shield className="h-5 w-5" />, color: '#f87171', bg: 'bg-red-500/10 border-red-500/30', label: 'Risk Agent' },
  procurement: { icon: <ShoppingCart className="h-5 w-5" />, color: '#34d399', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Procurement Agent' },
  executive_synthesis: { icon: <Sparkles className="h-5 w-5" />, color: '#fbbf24', bg: 'bg-amber-500/10 border-amber-500/30', label: 'Executive Agent' },
};

const PRESET_QUERIES = [
  { label: 'Risk Assessment', query: 'Which suppliers are at highest risk right now and what immediate actions should I take?', icon: <Shield className="h-4 w-4" /> },
  { label: 'Find Alternatives', query: 'Find the best alternative suppliers if our top electronics supplier fails', icon: <Users className="h-4 w-4" /> },
  { label: 'Cost Optimization', query: 'Analyze procurement costs and recommend the top 3 cost optimization opportunities', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Supply Chain Health', query: 'Give me a full supply chain health briefing with risk and procurement insights', icon: <Brain className="h-4 w-4" /> },
];

function AgentOrb({ agentKey, active, done }: { agentKey: string; active: boolean; done: boolean }) {
  const cfg = AGENT_CONFIG[agentKey as keyof typeof AGENT_CONFIG];
  if (!cfg) return null;
  return (
    <motion.div
      className={`relative flex flex-col items-center gap-2`}
      animate={active ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: active ? Infinity : 0, duration: 1.2 }}
    >
      <div className={`
        relative h-16 w-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
        ${done ? cfg.bg + ' opacity-100' : active ? cfg.bg + ' opacity-100' : 'bg-secondary/30 border-border opacity-50'}
      `} style={{ color: cfg.color }}>
        {cfg.icon}
        {active && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ boxShadow: `0 0 20px ${cfg.color}40` }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}
        {done && !active && (
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
            <div className="h-2 w-2 text-white">✓</div>
          </div>
        )}
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{cfg.label}</span>
    </motion.div>
  );
}


function formatInlineText(text: string) {
  // Split on **bold** text to render it cleanly without asterisks
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function parseMarkdown(text: string) {
  if (!text) return null;

  // Split content by paragraph blocks
  const blocks = text.split(/\n\n+/);

  return blocks.map((block, blockIdx) => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return null;

    // Check if the block is a markdown table
    if (trimmedBlock.startsWith('|') && trimmedBlock.includes('\n|')) {
      const lines = trimmedBlock.split('\n').map(l => l.trim()).filter(Boolean);
      // Skip markdown divider lines like |---|---|
      const tableLines = lines.filter(line => !/^[|\s-:]+$/.test(line));
      
      const rows = tableLines.map(line => {
        return line
          .split('|')
          .map(cell => cell.trim())
          .filter((_, i, arr) => i > 0 && i < arr.length - 1);
      });

      if (rows.length > 0) {
        const headers = rows[0];
        const bodyRows = rows.slice(1);

        return (
          <div key={blockIdx} className="overflow-x-auto my-3 border border-border/60 rounded-lg">
            <table className="min-w-full divide-y divide-border/60 text-xs">
              <thead className="bg-secondary/40 font-bold text-muted-foreground uppercase">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card/10">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-secondary/20 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2 text-foreground leading-normal">{formatInlineText(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // Check if block is a bullet list (lines starting with -, *, or numbered lists)
    const lines = trimmedBlock.split('\n');
    const isBulletList = lines.every(line => /^\s*[-*•]\s+/.test(line));
    const isNumberedList = lines.every(line => /^\s*\d+\.\s+/.test(line));

    if (isBulletList) {
      return (
        <ul key={blockIdx} className="list-disc list-inside space-y-1.5 my-2.5 pl-2 text-sm text-foreground/90">
          {lines.map((line, lIdx) => {
            const content = line.replace(/^\s*[-*•]\s+/, '');
            return <li key={lIdx} className="leading-relaxed">{formatInlineText(content)}</li>;
          })}
        </ul>
      );
    }

    if (isNumberedList) {
      return (
        <ol key={blockIdx} className="list-decimal list-inside space-y-1.5 my-2.5 pl-2 text-sm text-foreground/90">
          {lines.map((line, lIdx) => {
            const content = line.replace(/^\s*\d+\.\s+/, '');
            return <li key={lIdx} className="leading-relaxed">{formatInlineText(content)}</li>;
          })}
        </ol>
      );
    }

    // Check if the line is a markdown heading
    if (trimmedBlock.startsWith('#')) {
      const match = trimmedBlock.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        const headingClass = 
          level === 1 ? "text-lg font-extrabold text-foreground mt-5 mb-2.5 border-b border-border/40 pb-1" :
          level === 2 ? "text-base font-bold text-foreground mt-4.5 mb-2" :
          "text-xs font-bold text-primary mt-3.5 mb-1.5 uppercase tracking-wider";
        
        return <div key={blockIdx} className={headingClass}>{formatInlineText(headingText)}</div>;
      }
    }

    // Default paragraph
    return (
      <p key={blockIdx} className="text-sm text-foreground/90 leading-relaxed my-2.5">
        {formatInlineText(trimmedBlock)}
      </p>
    );
  });
}

export default function MultiAgentArena() {
  const [query, setQuery] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentRunResponse | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [doneAgents, setDoneAgents] = useState<Set<string>>(new Set());
  const [activeRiskTab, setActiveRiskTab] = useState<'summary' | 'suppliers' | 'actions'>('summary');
  const [activeProcTab, setActiveProcTab] = useState<'summary' | 'suppliers' | 'actions'>('summary');

  const runAgents = async (q: string) => {
    if (!q.trim()) { toast.error('Enter a query'); return; }
    setRunning(true);
    setResult(null);
    setAgentMessages([]);
    setDoneAgents(new Set());
    setActiveAgent('supervisor');

    const addMsg = (agent: string, content: string) => {
      setAgentMessages(prev => [...prev, { agent, content, timestamp: Date.now() }]);
    };

    try {
      addMsg('supervisor', 'Analyzing query and routing to specialist agents...');
      await new Promise(r => setTimeout(r, 800));

      const res = await api.post('/agents/run', {
        query: q,
        supplier_id: supplierId || null,
      });

      const data: AgentRunResponse = res.data;
      const invoked = data.agents_invoked || [];

      // Simulate agent activation sequence
      for (const agent of invoked) {
        setActiveAgent(agent);
        if (agent === 'risk') addMsg('risk', 'Scanning supplier risk levels, SLA breaches, and active alerts...');
        if (agent === 'procurement') addMsg('procurement', 'Discovering alternative suppliers and analyzing procurement options...');
        if (agent === 'supervisor') addMsg('supervisor', 'Routing complete. Collecting all findings...');
        await new Promise(r => setTimeout(r, 600));
        setDoneAgents(prev => new Set([...prev, agent]));
      }

      setActiveAgent('executive_synthesis');
      addMsg('executive_synthesis', 'Synthesizing all findings into executive intelligence...');
      await new Promise(r => setTimeout(r, 1000));
      setDoneAgents(prev => new Set([...prev, 'executive_synthesis']));
      setActiveAgent(null);

      setResult(data);
      toast.success(`Analysis complete — ${invoked.length} agents invoked`);

    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Agent execution failed');
      setActiveAgent(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Brain className="h-5 w-5 text-violet-400" />
              </div>
              Multi-Agent Decision Arena
            </h1>
            <p className="text-muted-foreground mt-1">Watch AI agents collaborate in real-time to answer your supply chain questions</p>
          </div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30 px-3 py-1.5">
            <Bot className="h-3.5 w-3.5 mr-1.5" /> Powered by LangGraph Multi-Agent
          </Badge>
        </div>

        {/* Agent Network Visualizer */}
        <Card className="card-base border border-violet-500/20 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500/5 via-transparent to-transparent p-6">
            <div className="flex items-center justify-center gap-8 py-4">
              {['supervisor', 'risk', 'procurement', 'executive_synthesis'].map((agent, i) => (
                <div key={agent} className="flex items-center gap-4">
                  <AgentOrb
                    agentKey={agent}
                    active={activeAgent === agent}
                    done={doneAgents.has(agent)}
                  />
                  {i < 3 && (
                    <motion.div
                      animate={running ? { opacity: [0.2, 1, 0.2] } : { opacity: 0.3 }}
                      transition={{ repeat: running ? Infinity : 0, duration: 1.5, delay: i * 0.3 }}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Query Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="card-base">
              <CardHeader className="border-b border-border py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" /> Ask the Agent Network
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <textarea
                    className="w-full min-h-[100px] border border-border rounded-lg px-3 py-2 text-sm bg-secondary/40 text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="Ask anything about your supply chain..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAgents(query); }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Ctrl+Enter to run</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Target Supplier ID (optional)</label>
                  <Input
                    className="mt-1 bg-secondary/40 text-sm"
                    placeholder="e.g. SUP001"
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => runAgents(query)}
                  disabled={running || !query.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-700 font-bold"
                >
                  {running ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Agents Running...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" />Run Agent Network</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preset Queries */}
            <Card className="card-base">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Queries</p>
                {PRESET_QUERIES.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => { setQuery(preset.query); }}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-sm group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-violet-400 group-hover:scale-110 transition-transform">{preset.icon}</span>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{preset.label}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{preset.query}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Agent Activity Log */}
            {agentMessages.length > 0 && (
              <Card className="card-base">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Agent Activity</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <AnimatePresence>
                      {agentMessages.map((msg, i) => {
                        const cfg = AGENT_CONFIG[msg.agent as keyof typeof AGENT_CONFIG];
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-2 rounded-lg border text-xs ${cfg?.bg || 'bg-secondary/30 border-border'}`}
                          >
                            <span className="font-bold" style={{ color: cfg?.color || '#fff' }}>[{cfg?.label || msg.agent}]</span>{' '}
                            <span className="text-muted-foreground">{msg.content}</span>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {running && (
                      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }}
                        className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Processing...
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3 space-y-4">
            {!result && !running && (
              <Card className="card-base h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground px-12">
                  <Brain className="h-16 w-16 mx-auto mb-4 opacity-10" />
                  <p className="font-semibold text-lg">The Agent Network is Ready</p>
                  <p className="text-sm mt-2">Ask a question and watch the Supervisor route tasks to specialist agents in real-time</p>
                </div>
              </Card>
            )}

            {running && !result && (
              <Card className="card-base flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    className="h-16 w-16 mx-auto rounded-full border-2 border-violet-500/30 border-t-violet-500 flex items-center justify-center"
                  >
                    <Brain className="h-7 w-7 text-violet-400" />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-foreground">Agents are collaborating...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeAgent ? `${AGENT_CONFIG[activeAgent as keyof typeof AGENT_CONFIG]?.label || activeAgent} is working` : 'Routing...'}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {result && (
              <AnimatePresence>
                <motion.div key={result.session_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Executive Summary */}
                  <Card className="card-base border border-amber-500/20 bg-amber-500/5">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-0.5">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Executive Intelligence Summary</p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Session #{result.session_id}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm text-foreground/90 leading-relaxed">
                            {parseMarkdown(result.executive_summary)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Agents Invoked */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Agents invoked:</span>
                    {result.agents_invoked.map(a => {
                      const cfg = AGENT_CONFIG[a as keyof typeof AGENT_CONFIG];
                      return cfg ? (
                        <Badge key={a} variant="outline" className={`text-[10px] ${cfg.bg}`} style={{ color: cfg.color }}>
                          {cfg.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>

                  {/* Risk Findings */}
                  {result.risk_findings && (
                    <Card className="card-base border border-red-500/20">
                      <CardHeader className="border-b border-border py-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-400">
                          <Shield className="h-4 w-4" /> Risk Agent Findings
                          <Badge variant="outline" className="ml-auto text-[10px] text-red-400 border-red-500/30">
                            Portfolio Risk: {result.risk_findings.overall_risk_level} ({result.risk_findings.portfolio_risk_score}/100)
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {/* Tabs */}
                        <div className="flex gap-1 mb-4">
                          {(['summary', 'suppliers', 'actions'] as const).map(t => (
                            <button key={t} onClick={() => setActiveRiskTab(t)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all capitalize ${activeRiskTab === t ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-muted-foreground hover:text-foreground'}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                        {activeRiskTab === 'summary' && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{result.risk_findings.risk_summary}</p>
                        )}
                        {activeRiskTab === 'suppliers' && (
                          <div className="space-y-2">
                            {(result.risk_findings.critical_suppliers || []).slice(0, 4).map((s: any, i: number) => (
                              <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold">{s.supplier_name}</span>
                                  <Badge variant="outline" className={`text-[10px] ${
                                    s.risk_level === 'Critical' ? 'text-red-400 border-red-500/30' :
                                    s.risk_level === 'High' ? 'text-orange-400 border-orange-500/30' :
                                    s.risk_level === 'Medium' ? 'text-amber-400 border-amber-500/30' : 'text-emerald-400 border-emerald-500/30'
                                  }`}>{s.risk_level} ({s.risk_score})</Badge>
                                </div>
                                <div className="flex gap-3 text-[10px] text-muted-foreground">
                                  <span>SLA Breaches: {s.sla_breaches}</span>
                                  <span>Alerts: {s.active_alerts}</span>
                                </div>
                                {s.key_risks?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {s.key_risks.map((r: string, j: number) => (
                                      <span key={j} className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded">{r}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {activeRiskTab === 'actions' && (
                          <div className="space-y-2">
                            {(result.risk_findings.immediate_actions || []).map((a: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">{a}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Procurement Findings */}
                  {result.procurement_findings && (
                    <Card className="card-base border border-emerald-500/20">
                      <CardHeader className="border-b border-border py-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                          <ShoppingCart className="h-4 w-4" /> Procurement Agent Findings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex gap-1 mb-4">
                          {(['summary', 'suppliers', 'actions'] as const).map(t => (
                            <button key={t} onClick={() => setActiveProcTab(t)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all capitalize ${activeProcTab === t ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-muted-foreground hover:text-foreground'}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                        {activeProcTab === 'summary' && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{result.procurement_findings.procurement_summary}</p>
                        )}
                        {activeProcTab === 'suppliers' && (
                          <div className="space-y-2">
                            {(result.procurement_findings.recommended_suppliers || []).slice(0, 4).map((s: any, i: number) => (
                              <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-emerald-400">#{s.rank}</span>
                                    <span className="text-sm font-semibold">{s.supplier_name}</span>
                                  </div>
                                  <Badge variant="outline" className={`text-[10px] ${
                                    s.swap_recommendation === 'Strongly Recommended' ? 'text-emerald-400 border-emerald-500/30' :
                                    s.swap_recommendation === 'Recommended' ? 'text-blue-400 border-blue-500/30' :
                                    'text-muted-foreground border-border'
                                  }`}>{s.swap_recommendation}</Badge>
                                </div>
                                <div className="flex gap-3 text-[10px] text-muted-foreground">
                                  <span>Score: {s.overall_score}</span>
                                  <span>Risk: {s.risk_level}</span>
                                  <span>OTD: {s.otd_percentage}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {activeProcTab === 'actions' && (
                          <div className="space-y-2">
                            {(result.procurement_findings.immediate_actions || []).map((a: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">{a}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
