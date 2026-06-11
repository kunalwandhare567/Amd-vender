import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Building2, TrendingUp, CheckCircle, Clock, AlertOctagon, Send,
  MapPin, Truck, Package, Route, AlertTriangle, Plus
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DriverData { id: string; name: string; phone: string; truck_no: string; status: string; current_lat: number; current_lng: number; supplier_id: string; }
interface TripData { id: string; product_name: string; quantity: number; driver_id: string; supplier_id: string; source_location: string; source_lat: number; source_lng: number; destination_location: string; destination_lat: number; destination_lng: number; status: string; route_json: string; current_progress: number; est_arrival: string; }
interface RouteCoord { lat: number; lng: number; name: string; }
interface GraphNode { name: string; lat: number; lng: number; }

const truckIcon = new L.DivIcon({
  html: `<div style="background:#1e1b4b;border:3px solid #22d3ee;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(34,211,238,0.5)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`,
  className: '', iconSize: [24, 24], iconAnchor: [12, 12],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points.map(p => L.latLng(p[0], p[1]))), { padding: [40, 40] });
  }, [points, map]);
  return null;
}

export default function SupplierPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'fleet' | 'dispatch' | 'drivers' | 'history' | null;
  const activeTab = tabParam || 'fleet';

  const setActiveTab = (tab: 'fleet' | 'dispatch' | 'drivers' | 'history') => {
    setSearchParams({ tab });
  };
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch form
  const [dispProduct, setDispProduct] = useState('');
  const [dispQty, setDispQty] = useState('100');
  const [dispDriver, setDispDriver] = useState('');
  const [dispSource, setDispSource] = useState('');
  const [dispDest, setDispDest] = useState('');
  const [dispSubmitting, setDispSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [driversRes, tripsRes, nodesRes] = await Promise.all([
        api.get('/drivers'), api.get('/trips'), api.get('/route/nodes'),
      ]);
      setDrivers(driversRes.data);
      setTrips(tripsRes.data);
      setGraphNodes(nodesRes.data.nodes);
    } catch {
      // Fallback demo data
      setDrivers([
        { id: 'DRV-001', name: 'Kunal Wandhare', phone: '+91-9876543210', truck_no: 'MH-12-QW-5678', status: 'On Trip', current_lat: 19.2183, current_lng: 72.9781, supplier_id: 'SUP001' },
        { id: 'DRV-002', name: 'Rajesh Sharma', phone: '+91-9123456789', truck_no: 'MH-04-AB-1234', status: 'Available', current_lat: 18.9388, current_lng: 72.8354, supplier_id: 'SUP001' },
      ]);
      setTrips([{
        id: 'TRIP-0001', product_name: 'Industrial Capacitors', quantity: 500, driver_id: 'DRV-001', supplier_id: 'SUP001',
        source_location: 'Thane Warehouse', source_lat: 19.2183, source_lng: 72.9781,
        destination_location: 'Pimpri Chinchwad Plant', destination_lat: 18.6278, destination_lng: 73.8131,
        status: 'In Transit', route_json: JSON.stringify([
          { lat: 19.2183, lng: 72.9781, name: 'Thane Warehouse' },
          { lat: 19.0330, lng: 73.0297, name: 'Navi Mumbai Hub' },
          { lat: 18.9894, lng: 73.1175, name: 'Panvel Junction' },
          { lat: 18.7860, lng: 73.3414, name: 'Khopoli Depot' },
          { lat: 18.7546, lng: 73.4063, name: 'Lonavala Junction' },
          { lat: 18.7350, lng: 73.6757, name: 'Talegaon Depot' },
          { lat: 18.6278, lng: 73.8131, name: 'Pimpri Chinchwad Plant' },
        ]), current_progress: 35, est_arrival: '2026-06-11T14:00:00',
      }]);
      setGraphNodes([
        { name: 'Mumbai Port', lat: 18.9388, lng: 72.8354 },
        { name: 'Thane Warehouse', lat: 19.2183, lng: 72.9781 },
        { name: 'Navi Mumbai Hub', lat: 19.0330, lng: 73.0297 },
        { name: 'Pimpri Chinchwad Plant', lat: 18.6278, lng: 73.8131 },
        { name: 'Pune Chakan MIDC', lat: 18.7606, lng: 73.8600 },
        { name: 'Pune City Center', lat: 18.5204, lng: 73.8567 },
        { name: 'Bhiwandi Logistics', lat: 19.2967, lng: 73.0631 },
      ]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispProduct || !dispDriver || !dispSource || !dispDest) { toast.error('Fill all fields'); return; }
    setDispSubmitting(true);
    try {
      await api.post('/trips', {
        product_name: dispProduct, quantity: parseInt(dispQty),
        driver_id: dispDriver, source_location: dispSource, destination_location: dispDest,
      });
      toast.success('Trip created! Dijkstra route calculated automatically.');
      setDispProduct(''); setDispQty('100');
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create trip');
    } finally { setDispSubmitting(false); }
  };

  // Build map points from all trips
  const allMapPoints: [number, number][] = [];
  const tripRoutes: { coords: [number, number][]; status: string; id: string }[] = [];
  trips.forEach(t => {
    try {
      const coords: RouteCoord[] = JSON.parse(t.route_json || '[]');
      const path: [number, number][] = coords.map(c => [c.lat, c.lng]);
      tripRoutes.push({ coords: path, status: t.status, id: t.id });
      path.forEach(p => allMapPoints.push(p));
    } catch {}
  });
  drivers.forEach(d => { if (d.current_lat) allMapPoints.push([d.current_lat, d.current_lng]); });

  if (loading) return <MainLayout><div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></MainLayout>;

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Supplier Command Center
            </h1>
            <p className="text-muted-foreground mt-1">Fleet tracking, dispatch management, and route intelligence.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-sm bg-secondary px-3 py-1.5 rounded-lg border border-border font-semibold">{drivers.length} Drivers</span>
            <span className="text-sm bg-secondary px-3 py-1.5 rounded-lg border border-border font-semibold">{trips.filter(t => t.status === 'In Transit').length} Active Trips</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-6">
          {(['fleet', 'dispatch', 'drivers', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all capitalize ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab === 'fleet' ? '🗺️ Fleet Map' : tab === 'dispatch' ? '📦 Dispatch Trip' : tab === 'drivers' ? '🚛 Drivers' : '📜 Delivery History'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Fleet Map Tab */}
          {activeTab === 'fleet' && (
            <motion.div key="fleet" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
              <Card className="card-base overflow-hidden">
                <CardHeader className="py-4 border-b border-border bg-primary/5">
                  <CardTitle className="text-base font-bold flex items-center gap-2"><Route className="h-5 w-5 text-primary" /> Live Fleet & Route Overview (OSM)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[500px] w-full">
                    <MapContainer center={[19.0, 73.2]} zoom={9} className="h-full w-full" style={{ height: '500px' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" {...({ attribution: '&copy; OpenStreetMap' } as any)} />
                      {allMapPoints.length > 1 && <FitBounds points={allMapPoints} />}

                      {tripRoutes.map(tr => (
                        <Polyline key={tr.id} positions={tr.coords} pathOptions={{
                          color: tr.status === 'Delayed' ? '#ef4444' : tr.status === 'In Transit' ? '#22d3ee' : tr.status === 'Completed' ? '#10b981' : '#94a3b8',
                          weight: 4, opacity: 0.8,
                        }} />
                      ))}

                      {drivers.filter(d => d.current_lat).map(d => (
                        <Marker key={d.id} position={[d.current_lat, d.current_lng] as L.LatLngExpression} {...({ icon: truckIcon } as any)}>
                          <Popup><strong>{d.name}</strong><br />{d.truck_no}<br />Status: {d.status}</Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Trip Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trips.map(t => (
                  <Card key={t.id} className={`card-base border ${t.status === 'Delayed' ? 'border-amber-500/30' : 'border-border'}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-primary">{t.id}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          t.status === 'In Transit' ? 'bg-cyan-500/10 text-cyan-400' :
                          t.status === 'Delayed' ? 'bg-amber-500/10 text-amber-400' :
                          t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>{t.status}</span>
                      </div>
                      <p className="text-sm font-semibold">{t.product_name}</p>
                      <div className="text-xs text-muted-foreground">{t.source_location} → {t.destination_location}</div>
                      <div className="flex justify-between text-xs">
                        <span>{t.quantity} units</span>
                        <span>Driver: {t.driver_id}</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${t.current_progress}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Dispatch Tab */}
          {activeTab === 'dispatch' && (
            <motion.div key="dispatch" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <Card className="card-base max-w-2xl">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Create Dispatch Invoice</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleDispatch} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Product Name</Label>
                        <Input placeholder="e.g. Industrial Capacitors" value={dispProduct} onChange={e => setDispProduct(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input type="number" value={dispQty} onChange={e => setDispQty(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign Driver</Label>
                      <Select value={dispDriver} onValueChange={setDispDriver}>
                        <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                        <SelectContent>
                          {drivers.map(d => (
                            <SelectItem key={d.id} value={d.id} disabled={d.status !== 'Available'}>
                              {d.name} ({d.truck_no}) — {d.status === 'Available' ? 'Free' : d.status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Source Location</Label>
                        <Select value={dispSource} onValueChange={setDispSource}>
                          <SelectTrigger><SelectValue placeholder="Pick source" /></SelectTrigger>
                          <SelectContent>{graphNodes.map(n => <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Destination</Label>
                        <Select value={dispDest} onValueChange={setDispDest}>
                          <SelectTrigger><SelectValue placeholder="Pick destination" /></SelectTrigger>
                          <SelectContent>{graphNodes.map(n => <SelectItem key={n.name} value={n.name}>{n.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="bg-secondary/40 p-3 rounded-lg border border-border text-xs text-muted-foreground">
                      <Route className="h-3.5 w-3.5 inline mr-1 text-primary" />
                      The system will automatically calculate the <strong>optimal Dijkstra route</strong> and assign GPS coordinates.
                    </div>
                    <Button type="submit" disabled={dispSubmitting} className="w-full bg-primary hover:bg-primary/90 font-bold">
                      {dispSubmitting ? 'Calculating Route...' : 'Create Trip & Calculate Route'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Drivers Tab */}
          {activeTab === 'drivers' && (
            <motion.div key="drivers" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <Card className="card-base">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Driver Fleet ({drivers.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {drivers.map(d => (
                      <div key={d.id} className="p-4 flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-primary">{d.id}</span>
                            <span className="font-semibold text-foreground">{d.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{d.truck_no} • {d.phone}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          d.status === 'On Trip' ? 'bg-cyan-500/10 text-cyan-400' :
                          d.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>{d.status}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
              <Card className="card-base">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Completed & Historical Deliveries</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                      <thead className="text-xs uppercase bg-secondary/50 text-foreground border-b border-border">
                        <tr>
                          <th className="px-6 py-4 font-bold">Trip ID / Date</th>
                          <th className="px-6 py-4 font-bold">Product Details</th>
                          <th className="px-6 py-4 font-bold">Supplier Company</th>
                          <th className="px-6 py-4 font-bold">Destination Address</th>
                          <th className="px-6 py-4 font-bold">Driver Info</th>
                          <th className="px-6 py-4 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {trips.map(t => {
                          const driver = drivers.find(d => d.id === t.driver_id);
                          return (
                            <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-mono font-bold text-primary">{t.id}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {t.est_arrival ? new Date(t.est_arrival).toLocaleDateString() : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-foreground font-medium">
                                <div>{t.product_name}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{t.quantity} units</div>
                              </td>
                              <td className="px-6 py-4 text-foreground">
                                ElectroDrive Support
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-foreground font-medium">{t.destination_location}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-foreground font-medium">{driver?.name || 'Kunal Wandhare'}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{driver?.phone || '+91-9876543210'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                  t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  t.status === 'In Transit' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                  t.status === 'Delayed' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {trips.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-muted-foreground">No historical records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
