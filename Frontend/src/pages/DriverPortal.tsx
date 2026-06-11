import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  MapPin, Navigation, Truck, AlertTriangle, ShieldAlert,
  CheckCircle2, CloudLightning, Play, TriangleAlert, Route,
  ArrowRight, Clock, Package, FileText
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icon path issue in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TripData {
  id: string;
  product_name: string;
  quantity: number;
  driver_id: string;
  supplier_id: string;
  source_location: string;
  source_lat: number;
  source_lng: number;
  destination_location: string;
  destination_lat: number;
  destination_lng: number;
  status: string;
  route_json: string;
  current_progress: number;
  est_arrival: string;
}

interface RouteCoord {
  lat: number;
  lng: number;
  name: string;
}

interface IncidentInfo {
  lat: number;
  lng: number;
  type: string;
  severity: string;
  description: string;
  incident_node: string;
  alert_message: string;
}

// Component to fit map bounds to route
function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const validCoords = coords.filter(c => c && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1]));
    if (validCoords.length > 1) {
      const bounds = L.latLngBounds(validCoords.map(c => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [coords, map]);
  return null;
}

// Custom truck icon
const truckIcon = new L.DivIcon({
  html: `<div style="background:#1e1b4b;border:3px solid #22d3ee;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(34,211,238,0.6)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Incident marker icon
const incidentIcon = new L.DivIcon({
  html: `<div style="background:#ef4444;border:3px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(239,68,68,0.6);animation:pulse 1.5s infinite">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6z"/><rect x="11" y="10" width="2" height="4"/><rect x="11" y="16" width="2" height="2"/></svg>
  </div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function DriverPortal() {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoord[]>([]);
  const [altRouteCoords, setAltRouteCoords] = useState<RouteCoord[]>([]);
  const [incidents, setIncidents] = useState<IncidentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [shipmentTab, setShipmentTab] = useState<'active' | 'history'>('active');

  // Incident form state
  const [incType, setIncType] = useState("Accident");
  const [incSeverity, setIncSeverity] = useState("High");
  const [incDescription, setIncDescription] = useState("");

  const fetchTrips = useCallback(async () => {
    try {
      const res = await api.get('/trips');
      setTrips(res.data);
      if (res.data.length > 0 && !activeTrip) {
        const firstActive = res.data.find((t: TripData) => t.status === "In Transit") || res.data[0];
        setActiveTrip(firstActive);
      }
    } catch {
      // Use fallback demo data
      const fallback: TripData[] = [
        {
          id: "TRIP-0001", product_name: "Industrial Capacitors (Batch-C44)", quantity: 500,
          driver_id: "DRV-001", supplier_id: "SUP001",
          source_location: "Thane Warehouse", source_lat: 19.2183, source_lng: 72.9781,
          destination_location: "Pimpri Chinchwad Plant", destination_lat: 18.6278, destination_lng: 73.8131,
          status: "In Transit",
          route_json: JSON.stringify([
            { lat: 19.2183, lng: 72.9781, name: "Thane Warehouse" },
            { lat: 19.0330, lng: 73.0297, name: "Navi Mumbai Hub" },
            { lat: 18.9894, lng: 73.1175, name: "Panvel Junction" },
            { lat: 18.7860, lng: 73.3414, name: "Khopoli Depot" },
            { lat: 18.7546, lng: 73.4063, name: "Lonavala Junction" },
            { lat: 18.7350, lng: 73.6757, name: "Talegaon Depot" },
            { lat: 18.6278, lng: 73.8131, name: "Pimpri Chinchwad Plant" },
          ]),
          current_progress: 35, est_arrival: "2026-06-11T14:00:00",
        }
      ];
      setTrips(fallback);
      setActiveTrip(fallback[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  useEffect(() => {
    if (activeTrip?.route_json) {
      try {
        const coords: RouteCoord[] = JSON.parse(activeTrip.route_json);
        setRouteCoords(coords);
      } catch {
        setRouteCoords([]);
      }
    } else {
      setRouteCoords([]);
    }
    setAltRouteCoords([]);
    setIncidents([]);
  }, [activeTrip]);

  const handleStartTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.post(`/trips/${activeTrip.id}/start`);
      toast.success("Trip started! GPS tracking active.");
      setActiveTrip({ ...activeTrip, status: "In Transit", current_progress: 5 });
      fetchTrips();
    } catch {
      toast.error("Failed to start trip");
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.post(`/trips/${activeTrip.id}/complete`);
      toast.success("Trip completed! Delivery confirmed.");
      setActiveTrip({ ...activeTrip, status: "Completed", current_progress: 100 });
      fetchTrips();
    } catch {
      toast.error("Failed to complete trip");
    }
  };

  const handleViewInvoice = (trip: TripData) => {
    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - \${trip.id}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #0f172a; padding: 40px; line-height: 1.5; background-color: #f8fafc; }
            .invoice-box { max-width: 800px; margin: auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #06b6d4; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #0f172a; display: flex; align-items: center; gap: 8px; }
            .title { font-size: 28px; font-weight: 800; color: #06b6d4; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
            .section-title { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #64748b; margin-bottom: 8px; tracking-spacing: 0.05em; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 30px; }
            .table th { background-color: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #475569; }
            .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #64748b; }
            .btn-print { margin-top: 20px; padding: 10px 20px; background-color: #06b6d4; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; transition: background-color 0.2s; }
            .btn-print:hover { background-color: #0891b2; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div class="logo">🌐 VendorVerse Logistics</div>
              <div class="title">INVOICE</div>
            </div>
            <div class="grid">
              <div>
                <div class="section-title">Supplier Information</div>
                <strong>ElectroDrive Support</strong><br/>
                Supplier ID: \${trip.supplier_id}<br/>
                Source Hub: \${trip.source_location}
              </div>
              <div style="text-align: right;">
                <div class="section-title">Invoice Metadata</div>
                <strong>Invoice ID:</strong> INV-\${trip.id}<br/>
                <strong>Issued Date:</strong> \${new Date().toLocaleDateString()}<br/>
                <strong>Current Status:</strong> <span style="color: #0891b2; font-weight: 700;">\${trip.status}</span>
              </div>
            </div>
            <div class="grid">
              <div>
                <div class="section-title">Delivery Destination</div>
                <strong>Location:</strong> \${trip.destination_location}<br/>
                <strong>Coordinates:</strong> [\${trip.destination_lat.toFixed(4)}, \${trip.destination_lng.toFixed(4)}]
              </div>
              <div style="text-align: right;">
                <div class="section-title">Carrier & Vehicle</div>
                <strong>Driver Name:</strong> Kunal Wandhare<br/>
                <strong>Carrier ID:</strong> \${trip.driver_id}<br/>
                <strong>License Plate:</strong> MH-12-QW-5678
              </div>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Quantity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>\${trip.product_name}</td>
                  <td style="text-align: right; font-weight: bold;">\${trip.quantity} units</td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
              <p>Thank you for choosing VendorVerse. This is a digitally verified logistics manifest.</p>
              <button onclick="window.print()" class="btn-print">Print / Save as PDF</button>
            </div>
          </div>
        </body>
      </html>
    `;
    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    setReporting(true);

    // Simulate the driver's current position along the route
    const routeParsed: RouteCoord[] = JSON.parse(activeTrip.route_json || "[]");
    const progressIndex = Math.min(
      Math.floor((activeTrip.current_progress / 100) * (routeParsed.length - 1)),
      routeParsed.length - 2
    );
    const currentPos = routeParsed[Math.max(1, progressIndex + 1)]; // next waypoint as incident location

    try {
      const res = await api.post(`/trips/${activeTrip.id}/incident`, {
        type: incType,
        lat: currentPos.lat,
        lng: currentPos.lng,
        severity: incSeverity,
        description: incDescription || `${incType} reported near ${currentPos.name}`,
      });

      const data = res.data;

      // Show incident on map
      setIncidents(prev => [...prev, {
        lat: currentPos.lat,
        lng: currentPos.lng,
        type: incType,
        severity: incSeverity,
        description: incDescription,
        incident_node: data.incident_node,
        alert_message: data.alert_message,
      }]);

      // Show alternative route if available
      if (data.alternative_route?.coordinates) {
        setAltRouteCoords(data.alternative_route.coordinates);
      }

      setActiveTrip({ ...activeTrip, status: "Delayed" });
      toast.warning(data.alert_message || "Incident reported! Route recalculated.");
      setIncDescription("");
    } catch {
      toast.error("Failed to report incident");
    } finally {
      setReporting(false);
    }
  };

  // Calculate truck position along route
  const getTruckPosition = (): [number, number] | null => {
    if (routeCoords.length < 2 || !activeTrip) return null;
    const progress = activeTrip.current_progress / 100;
    const idx = Math.min(Math.floor(progress * (routeCoords.length - 1)), routeCoords.length - 1);
    return [routeCoords[idx].lat, routeCoords[idx].lng];
  };

  const truckPos = getTruckPosition();
  const polylinePath: [number, number][] = routeCoords.map(c => [c.lat, c.lng]);
  const altPolylinePath: [number, number][] = altRouteCoords.map(c => [c.lat, c.lng]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

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
              Real-time route tracking, Dijkstra path optimization, and incident-aware rerouting.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border">
              Driver: Kunal W. (Active)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Map & Trip Panel */}
          <div className="lg:col-span-8 space-y-6">

            {/* Active Trip Header */}
            {activeTrip && (
              <Card className="card-base border border-border bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Navigation className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base font-bold">
                          {activeTrip.source_location} → {activeTrip.destination_location}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activeTrip.product_name} • {activeTrip.quantity} units
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                      activeTrip.status === 'In Transit' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                      activeTrip.status === 'Delayed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                      activeTrip.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {activeTrip.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">

                  {/* OSM Leaflet Map */}
                  <div className="relative h-[450px] w-full">
                    <MapContainer
                      center={(polylinePath.length > 0 ? polylinePath[0] : [19.0760, 72.8777]) as L.LatLngExpression}
                      zoom={9}
                      className="h-full w-full z-0"
                      style={{ height: '450px', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        {...({ attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' } as any)}
                      />
                      {polylinePath.length > 1 && <FitBounds coords={polylinePath} />}

                      {/* Primary route polyline */}
                      {polylinePath.length > 1 && (
                        <Polyline
                          positions={polylinePath}
                          pathOptions={{
                            color: altRouteCoords.length > 0 ? '#ef4444' : '#22d3ee',
                            weight: altRouteCoords.length > 0 ? 3 : 5,
                            opacity: altRouteCoords.length > 0 ? 0.4 : 0.85,
                            dashArray: altRouteCoords.length > 0 ? '8 6' : undefined,
                          }}
                        />
                      )}

                      {/* Alternative route polyline (green) */}
                      {altPolylinePath.length > 1 && (
                        <Polyline
                          positions={altPolylinePath}
                          pathOptions={{ color: '#10b981', weight: 5, opacity: 0.9 }}
                        />
                      )}

                      {/* Waypoint markers */}
                      {routeCoords.length > 0 && routeCoords.map((coord, idx) => (
                        <CircleMarker
                          key={`wp-${idx}`}
                          center={[coord.lat, coord.lng] as L.LatLngExpression}
                          radius={idx === 0 || idx === routeCoords.length - 1 ? 8 : 5}
                          pathOptions={{
                            fillColor: idx === 0 ? '#10b981' : idx === routeCoords.length - 1 ? '#3b82f6' : '#7c3aed',
                            fillOpacity: 0.9,
                            color: '#fff',
                            weight: 2,
                          }}
                        >
                          <Popup>
                            <strong>{coord.name}</strong>
                            <br />
                            {idx === 0 ? '📍 Source' : idx === routeCoords.length - 1 ? '🏁 Destination' : `Waypoint ${idx}`}
                          </Popup>
                        </CircleMarker>
                      ))}

                      {/* Truck marker */}
                      {truckPos && activeTrip.status !== 'Completed' && (
                        <Marker position={truckPos as L.LatLngExpression} {...({ icon: truckIcon } as any)}>
                          <Popup><strong>🚛 Driver: Kunal W.</strong><br />Progress: {activeTrip.current_progress}%</Popup>
                        </Marker>
                      )}

                      {/* Incident markers */}
                      {incidents.map((inc, idx) => (
                        <Marker key={`inc-${idx}`} position={[inc.lat, inc.lng] as L.LatLngExpression} {...({ icon: incidentIcon } as any)}>
                          <Popup>
                            <strong>⚠️ {inc.type}</strong> ({inc.severity})<br />
                            {inc.description}<br />
                            <em className="text-xs">{inc.incident_node}</em>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>

                    {/* Map overlay badge */}
                    <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 border border-border/60 px-3 py-2 rounded-lg backdrop-blur-md flex items-center gap-2">
                      <Route className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Dijkstra Optimized Route (OSM)
                      </span>
                    </div>

                    {altRouteCoords.length > 0 && (
                      <div className="absolute top-4 right-4 z-[1000] bg-emerald-900/90 border border-emerald-500/30 px-3 py-2 rounded-lg backdrop-blur-md flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-200">
                          Alternative Route Active
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar & Actions */}
                  <div className="p-6 space-y-4 border-t border-border">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">Shipment Progress</span>
                      <span className="text-primary">{Math.min(100, Math.round(activeTrip.current_progress))}%</span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          activeTrip.status === 'Delayed'
                            ? 'bg-gradient-to-r from-amber-500 to-red-500'
                            : 'bg-gradient-to-r from-primary to-cyan-400'
                        }`}
                        style={{ width: `${activeTrip.current_progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        <span>ETA: {activeTrip.est_arrival ? `${new Date(activeTrip.est_arrival).toLocaleDateString()} ${new Date(activeTrip.est_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Calculating...'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleViewInvoice(activeTrip)} variant="outline" size="sm" className="border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400">
                          <FileText className="h-4 w-4 mr-2" /> Invoice PDF
                        </Button>
                        {activeTrip.status === 'Scheduled' && (
                          <Button onClick={handleStartTrip} size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold">
                            <Play className="h-4 w-4 mr-2" /> Start Trip
                          </Button>
                        )}
                        {(activeTrip.status === 'In Transit' || activeTrip.status === 'Delayed') && (
                          <Button onClick={handleCompleteTrip} variant="outline" size="sm" className="border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Delivery
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trip List */}
            <Card className="card-base">
              <CardHeader className="py-4 border-b border-border">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Assigned Shipments
                  </CardTitle>
                  <div className="flex bg-secondary/60 p-1 rounded-lg border border-border text-xs">
                    <button
                      onClick={() => setShipmentTab('active')}
                      className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                        shipmentTab === 'active' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setShipmentTab('history')}
                      className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                        shipmentTab === 'history' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      History
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {trips
                    .filter(t => (shipmentTab === 'active' ? t.status !== 'Completed' : t.status === 'Completed'))
                    .map(t => (
                      <div
                        key={t.id}
                        onClick={() => setActiveTrip(t)}
                        className={`p-4 flex justify-between items-center cursor-pointer transition-all hover:bg-secondary/40 ${
                          activeTrip?.id === t.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-primary">{t.id}</span>
                            <span className="text-sm font-semibold text-foreground">
                              {t.source_location} → {t.destination_location}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{t.product_name} • {t.quantity} units</p>
                          {t.status === 'Completed' && t.est_arrival && (
                            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 inline" /> Completed on {new Date(t.est_arrival).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          t.status === 'In Transit' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                          t.status === 'Delayed' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  {trips.filter(t => (shipmentTab === 'active' ? t.status !== 'Completed' : t.status === 'Completed')).length === 0 && (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                      No {shipmentTab === 'active' ? 'active' : 'completed'} trips found.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar – Incident Report */}
          <div className="lg:col-span-4 space-y-6">

            <Card className="card-base border border-amber-500/20 bg-amber-950/5 shadow-xl">
              <CardHeader className="border-b border-border/80">
                <CardTitle className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Report Road Incident
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleReportIncident} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Incident Type</Label>
                    <Select value={incType} onValueChange={setIncType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Accident">Accident (Highway blockage)</SelectItem>
                        <SelectItem value="Weather">Weather (Heavy rain, Storms)</SelectItem>
                        <SelectItem value="Strike">Strike (Labor protest)</SelectItem>
                        <SelectItem value="Natural Disaster">Natural Disaster (Flooding)</SelectItem>
                        <SelectItem value="Traffic">Traffic Congestion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={incSeverity} onValueChange={setIncSeverity}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low (Minor delay)</SelectItem>
                        <SelectItem value="Medium">Medium (1-2 hours delay)</SelectItem>
                        <SelectItem value="High">High (Significant blockage)</SelectItem>
                        <SelectItem value="Critical">Critical (Road fully blocked)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Details</Label>
                    <Textarea
                      placeholder="Describe the incident..."
                      rows={3}
                      value={incDescription}
                      onChange={(e) => setIncDescription(e.target.value)}
                    />
                  </div>

                  <div className="bg-secondary/40 p-3 rounded-lg border border-border text-xs text-muted-foreground">
                    <TriangleAlert className="h-3.5 w-3.5 inline mr-1 text-amber-400" />
                    GPS coordinates will be captured automatically from your current route position.
                    The system will use <strong>Dijkstra's algorithm</strong> to calculate an alternative path in real time.
                  </div>

                  <Button
                    type="submit"
                    disabled={reporting || !activeTrip || activeTrip.status === 'Completed'}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  >
                    {reporting ? "Calculating Route..." : "Report & Reroute"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Active Incidents List */}
            <Card className="card-base">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Active Incidents ({incidents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 border-t border-border">
                <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                  {incidents.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">No incidents reported on this trip.</p>
                  ) : (
                    incidents.map((inc, idx) => (
                      <div key={idx} className="p-4 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            inc.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            inc.severity === 'High' ? 'bg-orange-500/10 text-orange-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {inc.severity}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Near {inc.incident_node}</span>
                        </div>
                        <p className="text-xs font-semibold text-foreground">{inc.type}</p>
                        <p className="text-[11px] text-muted-foreground">{inc.alert_message}</p>
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
