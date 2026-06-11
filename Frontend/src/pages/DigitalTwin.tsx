import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { 
  ShieldAlert, 
  ArrowRight, 
  Sparkles, 
  TrendingDown, 
  Package, 
  AlertOctagon, 
  DollarSign, 
  Activity
} from 'lucide-react';

interface SimulationMetrics {
  production: string;
  inventory: string;
  orders: string;
  revenue: string;
  opCost: string;
  confidence: number;
}

export default function DigitalTwin() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncId, setSelectedIncId] = useState<string>("");
  const [duration, setDuration] = useState<3 | 7 | 14 | 30>(14);

  // Fetch incidents
  const fetchIncidents = async () => {
    try {
      const res = await api.get('/incidents');
      setIncidents(res.data);
      if (res.data.length > 0) {
        setSelectedIncId(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const currentIncident = incidents.find(i => i.id === selectedIncId) || {
    type: "Natural Disaster",
    location: "Pune electronics hub",
    severity: "Critical",
    description: "Heavy Flooding in Pune electronics hub",
    reported_by: "AI"
  };

  // Simulation parameters depending on the selected duration
  const simData: Record<3 | 7 | 14 | 30, SimulationMetrics> = {
    3: {
      production: "-1,250 Vehicles",
      inventory: "-850 Units",
      orders: "-48 Delayed",
      revenue: "₹1.2 Crore",
      opCost: "₹18 Lakhs",
      confidence: 78
    },
    7: {
      production: "-2,950 Vehicles",
      inventory: "-2,100 Units",
      orders: "-112 Delayed",
      revenue: "₹2.8 Crore",
      opCost: "₹42 Lakhs",
      confidence: 82
    },
    14: {
      production: "-6,800 Vehicles",
      inventory: "-4,900 Units",
      orders: "-248 Delayed",
      revenue: "₹6.4 Crore",
      opCost: "₹96 Lakhs",
      confidence: 88
    },
    30: {
      production: "-12,200 Vehicles",
      inventory: "-9,300 Units",
      orders: "-456 Delayed",
      revenue: "₹11.6 Crore",
      opCost: "₹1.8 Crore",
      confidence: 85
    }
  };

  const metrics = simData[duration];

  const handleExecuteAction = (actionName: string) => {
    toast.success(`Action initiated: ${actionName}`);
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
        
        {/* Header Title */}
        <header className="flex justify-between items-center border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              Disruption-to-Impact Digital Twin
            </h1>
            <p className="text-muted-foreground mt-1">
              From early disruption detection to business impact simulation and recommended actions.
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-bold">
            Live Simulator (Active)
          </div>
        </header>

        {/* Workspace Container */}
        <div className="max-w-4xl mx-auto space-y-6 w-full">
          
          {/* Steps Visual Progress */}
          <div className="grid grid-cols-6 gap-2 text-center text-[9px] font-bold text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-border/60">
            <div className="bg-primary/10 text-primary border border-primary/20 p-1 rounded">1. RISK DETECTION</div>
            <div className="bg-primary/10 text-primary border border-primary/20 p-1 rounded">2. QUALIFICATION</div>
            <div className="bg-primary/20 text-cyan-400 border border-cyan-400/40 p-1 rounded animate-pulse">3. TWIN SIMULATION</div>
            <div className="p-1">4. IMPACT ASSESSMENT</div>
            <div className="p-1">5. RECOMMEND ACTIONS</div>
            <div className="p-1">6. CONTINUOUS LEARN</div>
          </div>

          {/* Impact Simulator Workspace */}
          <Card className="card-base border border-border bg-card/75 backdrop-blur-md shadow-2xl">
            <CardHeader className="border-b border-border/80 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base font-extrabold text-foreground">Digital Twin Live Simulation Workspace</CardTitle>
              
              {/* Selector for logged driver incidents */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Select Event:</span>
                <select 
                  value={selectedIncId} 
                  onChange={(e) => setSelectedIncId(e.target.value)}
                  className="bg-secondary border border-border text-xs rounded p-1 font-semibold text-foreground focus:outline-none"
                >
                  {incidents.map(inc => (
                    <option key={inc.id} value={inc.id}>{inc.type} - {inc.location}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Event Summary */}
              <div className="bg-secondary/40 border border-border p-4 rounded-xl flex items-start gap-4">
                <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Incident Profile: {currentIncident.type} at {currentIncident.location}</h4>
                  <p className="text-xs text-muted-foreground">Description: {currentIncident.description}</p>
                  <div className="flex gap-4 text-[10px] mt-2">
                    <span className="text-amber-400 font-semibold">Risk Probability: 87%</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-slate-300">Expected duration: 10 - 14 Days</span>
                  </div>
                </div>
              </div>

              {/* Duration Slider / Tabs */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase">
                  <span>Simulation Scenarios (Disruption duration)</span>
                  <span className="text-primary">{duration} Days Duration</span>
                </div>
                <div className="grid grid-cols-4 gap-2 bg-secondary/80 p-1.5 rounded-xl border border-border">
                  {[3, 7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d as any)}
                      className={`py-2 text-xs font-extrabold rounded-lg transition-all ${
                        duration === d 
                          ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Cascading Simulated Metrics */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estimated Cascading Impact</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-border/80 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Production Impact</span>
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-lg font-black text-red-400 mt-2">{metrics.production}</p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-border/80 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Inventory Shortage</span>
                      <Package className="h-4 w-4 text-orange-400" />
                    </div>
                    <p className="text-lg font-black text-orange-400 mt-2">{metrics.inventory}</p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-border/80 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Orders Delayed</span>
                      <AlertOctagon className="h-4 w-4 text-yellow-400" />
                    </div>
                    <p className="text-lg font-black text-yellow-400 mt-2">{metrics.orders}</p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-border/80 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Revenue Impact</span>
                      <DollarSign className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-lg font-black text-red-400 mt-2">{metrics.revenue}</p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-border/80 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Operating Cost</span>
                      <Activity className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-lg font-black text-amber-400 mt-2">{metrics.opCost}</p>
                  </div>

                  {/* Confidence score gauge */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-border/80 flex flex-col justify-between items-center text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Confidence Level</span>
                    <div className="relative mt-2 flex items-center justify-center">
                      <svg className="w-16 h-16">
                        <circle className="text-secondary" strokeWidth="4" stroke="currentColor" fill="transparent" r="24" cx="32" cy="32"/>
                        <circle className="text-primary" strokeWidth="4" strokeDasharray="150" strokeDashoffset={150 - (150 * metrics.confidence) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="24" cx="32" cy="32"/>
                      </svg>
                      <span className="absolute text-xs font-extrabold text-slate-100">{metrics.confidence}%</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* AI Recommended Actions */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Recommended Sourcing Actions</h4>
                <div className="divide-y divide-border border border-border/80 rounded-xl overflow-hidden bg-slate-950/50">
                  
                  <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">Activate Alternate Supplier (Autopilot)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Shift 40% volume to alternative supplier (ElectroDrive Pune) | ETA: 5 Days | Confidence: 91%</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => navigate('/supplier-swap')} 
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold shrink-0"
                    >
                      Automate Sourcing
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        <span className="text-xs font-bold text-slate-200">Reroute In-Transit Cargo</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Divert via Mumbai Port | ETA Improvement: 3 Days | Cost: ₹8L</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleExecuteAction("Reroute Cargo")} className="shrink-0 border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400">
                      Execute Reroute
                    </Button>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-400" />
                        <span className="text-xs font-bold text-slate-200">Invoke Force Majeure Clause</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Pune Floods trigger Sec. 12.3 under active contract | Legal rating: Favorable</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleExecuteAction("Force Majeure")} className="shrink-0 border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-400">
                      File Notice
                    </Button>
                  </div>

                </div>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </MainLayout>
  );
}
