import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { MapPin, Navigation, Truck, AlertTriangle, ShieldAlert, CheckCircle2, CloudLightning } from 'lucide-react';

interface ActiveTrip {
  id: string;
  route: string;
  driverName: string;
  truckNo: string;
  origin: string;
  destination: string;
  status: string;
  progress: number;
}

export default function DriverPortal() {
  const [trips, setTrips] = useState<ActiveTrip[]>([
    {
      id: "TRIP-882",
      route: "Pune to Tata Plant, Pimpri",
      driverName: "Kunal W.",
      truckNo: "MH-12-QW-5678",
      origin: "Pune Electronics Pvt Ltd",
      destination: "Tata Motors Plant, Pune",
      status: "In Transit",
      progress: 35
    },
    {
      id: "TRIP-901",
      route: "Chennai to Bangalore Hub",
      driverName: "Rajesh S.",
      truckNo: "TN-07-AL-4321",
      origin: "EcoBeauty Solutions, Chennai",
      destination: "Bangalore Logistics Center",
      status: "Scheduled",
      progress: 0
    }
  ]);

  const [activeTrip, setActiveTrip] = useState<ActiveTrip>(trips[0]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);

  // Form State
  const [incType, setIncType] = useState("Weather");
  const [incLocation, setIncLocation] = useState("");
  const [incSeverity, setIncSeverity] = useState("Medium");
  const [incDescription, setIncDescription] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Canvas Animation loop for the Interactive Map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.parentElement?.clientWidth || 600;
    let height = canvas.height = 350;

    // Route coordinates
    // Origin: Pune (100, 250), Destination: Pimpri (500, 100)
    const p1 = { x: 80, y: 270, label: activeTrip.origin };
    const p2 = { x: 520, y: 80, label: activeTrip.destination };
    
    // Waypoints for curved path
    const controlPoint = { x: 300, y: 220 };

    let step = activeTrip.progress / 100;
    let direction = 1;

    const drawMap = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Main Route Line (Cyan glow path)
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, p2.x, p2.y);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Animate current progress along the bezier curve
      // Bezier formula: B(t) = (1-t)^2 * P0 + 2(1-t)*t * P1 + t^2 * P2
      const t = step;
      const truckX = Math.pow(1 - t, 2) * p1.x + 2 * (1 - t) * t * controlPoint.x + Math.pow(t, 2) * p2.x;
      const truckY = Math.pow(1 - t, 2) * p1.y + 2 * (1 - t) * t * controlPoint.y + Math.pow(t, 2) * p2.y;

      // Draw Origin pin
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981'; // green
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(p1.label, p1.x - 40, p1.y + 25);

      // Draw Destination pin
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6'; // blue
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillText(p2.label, p2.x - 70, p2.y - 15);

      // Draw Active Disruption zones if any
      incidents.forEach((inc) => {
        if (inc.location.toLowerCase().includes("pune") || inc.location.toLowerCase().includes("highway")) {
          // Draw hazard radar circle
          const pulseRadius = 15 + Math.sin(Date.now() / 150) * 8;
          ctx.beginPath();
          ctx.arc(controlPoint.x + 20, controlPoint.y - 30, pulseRadius, 0, Math.PI * 2);
          ctx.fillStyle = inc.severity === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(controlPoint.x + 20, controlPoint.y - 30, 6, 0, Math.PI * 2);
          ctx.fillStyle = inc.severity === 'Critical' ? '#ef4444' : '#f97316';
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px sans-serif';
          ctx.fillText(`Hazard: ${inc.type}`, controlPoint.x - 10, controlPoint.y - 45);
        }
      });

      // Draw Animating Truck
      ctx.beginPath();
      ctx.arc(truckX, truckY, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#1e1b4b'; // dark blue base
      ctx.fill();
      ctx.strokeStyle = '#22d3ee'; // cyan glow border
      ctx.lineWidth = 3;
      ctx.stroke();

      // Pulse ring for truck
      const pulseRing = 14 + Math.sin(Date.now() / 200) * 4;
      ctx.beginPath();
      ctx.arc(truckX, truckY, pulseRing, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Small truck center dot
      ctx.beginPath();
      ctx.arc(truckX, truckY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();

      // Update progress animation
      if (activeTrip.status === "In Transit") {
        step += 0.0003;
        if (step > 1) {
          step = 0;
        }
      }

      animationRef.current = requestAnimationFrame(drawMap);
    };

    drawMap();

    // Handle resize
    const handleResize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || 600;
      height = canvas.height = 350;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [activeTrip, incidents]);

  // Fetch incidents on load
  const fetchIncidents = async () => {
    try {
      const res = await api.get('/incidents');
      setIncidents(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incLocation) {
      toast.error("Please enter a location");
      return;
    }
    setReporting(true);
    try {
      const payload = {
        type: incType,
        location: incLocation,
        severity: incSeverity,
        description: incDescription,
        affected_supplier_id: "SUP004" // Tie to Pune Electronics for flow integration
      };
      
      const res = await api.post('/incidents', payload);
      toast.success("Incident reported successfully! System dashboard notified.");
      setIncLocation("");
      setIncDescription("");
      
      // Update state immediately
      setIncidents(prev => [res.data, ...prev]);
      
      // Trigger trip delay/warning
      setActiveTrip(prev => ({
        ...prev,
        status: "Delayed"
      }));

    } catch (err: any) {
      toast.error("Failed to report incident");
    } finally {
      setReporting(false);
    }
  };

  const completeTrip = () => {
    setActiveTrip(prev => ({
      ...prev,
      progress: 100,
      status: "Completed"
    }));
    toast.success("Trip completed successfully! Delivery log updated.");
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Truck className="h-8 w-8 text-primary animate-bounce" />
              Driver Logistics Command
            </h1>
            <p className="text-muted-foreground mt-1">
              Active shipment tracking, route diagnostics, and real-time disruption reporting interface.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border">
              Driver ID: Kunal W. (Active)
            </span>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Map & Active Trip Panel */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Active Trip Header */}
            <Card className="card-base border border-border bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-border py-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Navigation className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base font-bold">Active Route: {activeTrip.route}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Vehicle: {activeTrip.truckNo}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    activeTrip.status === 'In Transit' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    activeTrip.status === 'Delayed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {activeTrip.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                
                {/* Visual Map Canvas */}
                <div className="relative border border-border/80 rounded-xl bg-slate-950/80 overflow-hidden shadow-inner flex items-center justify-center">
                  <canvas ref={canvasRef} className="w-full block" />
                  <div className="absolute top-4 left-4 bg-slate-900/90 border border-border/60 px-3 py-2 rounded-lg backdrop-blur-md flex items-center gap-2">
                    <CloudLightning className="h-4 w-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-200">GPS Tracker (Live Feed)</span>
                  </div>
                </div>

                {/* Progress Bar & Actions */}
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Shipment Progress</span>
                    <span className="text-primary">{Math.min(100, Math.round(activeTrip.progress))}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border">
                    <div 
                      className="bg-gradient-to-r from-primary to-cyan-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${activeTrip.progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-4 w-4 text-emerald-400" />
                      <span>Next destination ETA: 2 Hours</span>
                    </div>
                    {activeTrip.status !== "Completed" && (
                      <Button onClick={completeTrip} variant="outline" size="sm" className="border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm Delivery
                      </Button>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* List of Active Driver Trips */}
            <Card className="card-base">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-bold">Assigned Shipments</CardTitle>
              </CardHeader>
              <CardContent className="p-0 border-t border-border">
                <div className="divide-y divide-border">
                  {trips.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => {
                        setActiveTrip(t);
                        toast.info(`Switched to active tracker for ${t.id}`);
                      }}
                      className={`p-4 flex justify-between items-center cursor-pointer transition-all hover:bg-secondary/40 ${
                        activeTrip.id === t.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary">{t.id}</span>
                          <span className="text-sm font-semibold text-foreground">{t.route}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Origin: {t.origin} | Dest: {t.destination}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        t.status === 'In Transit' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Form Side - Report Disruption */}
          <div className="lg:col-span-4 space-y-6">
            
            <Card className="card-base border border-amber-500/20 bg-amber-950/5 shadow-xl">
              <CardHeader className="border-b border-border/80">
                <CardTitle className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Report Disruption
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleReportIncident} className="space-y-4">
                  
                  <div className="space-y-2">
                    <Label htmlFor="incType">Incident Type</Label>
                    <Select value={incType} onValueChange={setIncType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weather">Weather (Heavy rain, Storms)</SelectItem>
                        <SelectItem value="Strike">Strike (Drivers, Labor protest)</SelectItem>
                        <SelectItem value="Accident">Accident (Highway blockage)</SelectItem>
                        <SelectItem value="Natural Disaster">Natural Disaster (Flooding, Quakes)</SelectItem>
                        <SelectItem value="Other">Other Disruption</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Exact Location / Highway</Label>
                    <Input 
                      id="location"
                      placeholder="e.g. Pune-Mumbai Expressway KM 45"
                      value={incLocation}
                      onChange={(e) => setIncLocation(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">Impact Severity</Label>
                    <Select value={incSeverity} onValueChange={setIncSeverity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low (Minor delay, alternate routes open)</SelectItem>
                        <SelectItem value="Medium">Medium (1-2 days delay potential)</SelectItem>
                        <SelectItem value="High">High (Significant holdups, key route block)</SelectItem>
                        <SelectItem value="Critical">Critical (Complete standstill, plant shutdown risk)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Details / Driver Comments</Label>
                    <Textarea 
                      id="description"
                      placeholder="Provide live details about the road block, weather condition or delay..."
                      rows={4}
                      value={incDescription}
                      onChange={(e) => setIncDescription(e.target.value)}
                    />
                  </div>

                  <Button type="submit" disabled={reporting} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                    {reporting ? "Submitting Report..." : "Broadcast Logistics Alert"}
                  </Button>

                </form>
              </CardContent>
            </Card>

            {/* List of Recent Incidents */}
            <Card className="card-base">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Live Incidents Stream
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 border-t border-border">
                <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                  {incidents.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">No active incidents reported.</p>
                  ) : (
                    incidents.map((inc) => (
                      <div key={inc.id} className="p-4 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            inc.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            inc.severity === 'High' ? 'bg-orange-500/10 text-orange-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {inc.severity}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{inc.reported_by} reported</span>
                        </div>
                        <p className="text-xs font-semibold text-foreground">{inc.type} - {inc.location}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{inc.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
