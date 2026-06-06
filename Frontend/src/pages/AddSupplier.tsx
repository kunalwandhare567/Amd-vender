import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supplierService, ProductRow, Supplier } from '@/services/supplierService';
import { Loader2, Plus, Trash2, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

const DEFAULT_ROW: ProductRow = {
    product_type: 'skincare',
    sku: 'SKU-001',
    price: 49.99,
    availability: 80,
    number_sold: 500,
    revenue: 24995,
    customer_demographics: 'Female',
    stock_level: 60,
    lead_time: 15,
    order_quantity: 500,
    shipping_time: 5,
    shipping_cost: 6.5,
    shipping_carrier: 'Carrier A',
    production_volume: 800,
    manufacturing_lead_time: 12,
    manufacturing_cost: 30,
    defect_rate: 1.8,
    transportation_mode: 'Road',
    route: 'Route B',
    inspection_result: 'Pass',
};

const PRODUCT_TYPES = ['skincare', 'haircare', 'cosmetics'];
const DEMOGRAPHICS = ['Male', 'Female', 'Non-binary'];
const CARRIERS = ['Carrier A', 'Carrier B', 'Carrier C'];
const TRANSPORT_MODES = ['Road', 'Rail', 'Air', 'Sea'];
const ROUTES = ['Route A', 'Route B', 'Route C'];
const INSPECTION_RESULTS = ['Pass', 'Fail', 'Pending'];

function formatCurrency(val: number) {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
}

const AddSupplier = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [products, setProducts] = useState<ProductRow[]>([{ ...DEFAULT_ROW }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<Supplier | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1=info, 2=products, 3=results

    const addRow = () => {
        setProducts(prev => [
            ...prev,
            { ...DEFAULT_ROW, sku: `SKU-${String(prev.length + 1).padStart(3, '0')}` },
        ]);
    };

    const removeRow = (idx: number) => {
        setProducts(prev => prev.filter((_, i) => i !== idx));
    };

    const updateRow = (idx: number, field: keyof ProductRow, value: any) => {
        setProducts(prev =>
            prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
        );
    };

    const handleSubmit = async () => {
        if (!name.trim()) return setError('Supplier name is required');
        if (!location.trim()) return setError('Location is required');
        if (products.length === 0) return setError('At least one product row is required');
        setError(null);
        setIsSubmitting(true);
        try {
            const res = await supplierService.addSupplier({ name, location, products });
            setResult(res.data);
            setStep(3);
        } catch (err: any) {
            setError(err?.response?.data?.detail || err.message || 'Failed to add supplier');
        } finally {
            setIsSubmitting(false);
        }
    };

    const riskColor = (risk: string | null) => {
        switch (risk) {
            case 'Low': return 'text-green-400';
            case 'Medium': return 'text-yellow-400';
            case 'High': return 'text-orange-400';
            case 'Critical': return 'text-red-400';
            default: return 'text-muted-foreground';
        }
    };

    const scoreColor = (score: number) => {
        if (score >= 80) return '#22c55e';
        if (score >= 60) return '#eab308';
        return '#ef4444';
    };

    return (
        <MainLayout>
            <div className="space-y-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Plus className="w-6 h-6 text-primary" />
                            Add New Supplier
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Enter product-level data and let AI evaluate the supplier's performance
                        </p>
                    </div>
                    {/* Step indicator */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center gap-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= s
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                                </div>
                                {s < 3 && <ArrowRight className={`w-4 h-4 ${step > s ? 'text-primary' : 'text-muted-foreground'}`} />}
                            </div>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* Step 1: Supplier Info */}
                {step === 1 && (
                    <div className="card-base p-6 space-y-4 animate-fade-in">
                        <h2 className="text-lg font-semibold text-foreground">Step 1 — Supplier Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Supplier Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Acme Cosmetics Pvt Ltd"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Location *</label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    placeholder="e.g. Mumbai"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => { if (name && location) setStep(2); else setError('Fill both fields'); }}
                                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center gap-2"
                            >
                                Next: Add Products <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Product Rows */}
                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="card-base p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-foreground">
                                    Step 2 — Product Data ({products.length} {products.length === 1 ? 'row' : 'rows'})
                                </h2>
                                <button
                                    onClick={addRow}
                                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Add Row
                                </button>
                            </div>

                            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                                <table className="w-full text-sm" style={{ minWidth: 1400 }}>
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-muted/50">
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Product Type</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">SKU</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Price</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Avail%</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Sold</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Revenue</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Demographics</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Stock</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Lead(d)</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Order Qty</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Ship(d)</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Ship$</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Carrier</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Prod Vol</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Mfg Lead(d)</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Mfg Cost</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Defect%</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Transport</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Route</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Inspection</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((row, idx) => (
                                            <tr key={idx} className="border-b border-border/30 hover:bg-muted/20">
                                                <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                                                <td className="px-1 py-1">
                                                    <select value={row.product_type} onChange={e => updateRow(idx, 'product_type', e.target.value)}
                                                        className="w-24 px-1 py-1 text-xs rounded border border-border bg-background text-foreground">
                                                        {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input value={row.sku} onChange={e => updateRow(idx, 'sku', e.target.value)}
                                                        className="w-20 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.price} onChange={e => updateRow(idx, 'price', +e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.availability} onChange={e => updateRow(idx, 'availability', +e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.number_sold} onChange={e => updateRow(idx, 'number_sold', +e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.revenue} onChange={e => updateRow(idx, 'revenue', +e.target.value)}
                                                        className="w-20 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <select value={row.customer_demographics} onChange={e => updateRow(idx, 'customer_demographics', e.target.value)}
                                                        className="w-20 px-1 py-1 text-xs rounded border border-border bg-background text-foreground">
                                                        {DEMOGRAPHICS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.stock_level} onChange={e => updateRow(idx, 'stock_level', +e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.lead_time} onChange={e => updateRow(idx, 'lead_time', +e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.order_quantity} onChange={e => updateRow(idx, 'order_quantity', +e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.shipping_time} onChange={e => updateRow(idx, 'shipping_time', +e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.shipping_cost} onChange={e => updateRow(idx, 'shipping_cost', +e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <select value={row.shipping_carrier} onChange={e => updateRow(idx, 'shipping_carrier', e.target.value)}
                                                        className="w-22 px-1 py-1 text-xs rounded border border-border bg-background text-foreground">
                                                        {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.production_volume} onChange={e => updateRow(idx, 'production_volume', +e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.manufacturing_lead_time} onChange={e => updateRow(idx, 'manufacturing_lead_time', +e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.manufacturing_cost} onChange={e => updateRow(idx, 'manufacturing_cost', +e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.defect_rate} onChange={e => updateRow(idx, 'defect_rate', +e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <select value={row.transportation_mode} onChange={e => updateRow(idx, 'transportation_mode', e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground">
                                                        {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <select value={row.route} onChange={e => updateRow(idx, 'route', e.target.value)}
                                                        className="w-20 px-1 py-1 text-xs rounded border border-border bg-background text-foreground">
                                                        {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <select value={row.inspection_result} onChange={e => updateRow(idx, 'inspection_result', e.target.value)}
                                                        className="w-20 px-1 py-1 text-xs rounded border border-border bg-background text-foreground">
                                                        {INSPECTION_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    {products.length > 1 && (
                                                        <button onClick={() => removeRow(idx)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition">
                                ← Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        AI is Evaluating…
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Add & Evaluate with AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Results */}
                {step === 3 && result && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Success banner */}
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                            <div>
                                <p className="font-semibold text-foreground">Supplier "{result.name}" created successfully!</p>
                                <p className="text-sm text-muted-foreground">ID: {result.supplier_id} • Location: {result.location}</p>
                            </div>
                        </div>

                        {/* AI-Calculated Metrics */}
                        <div className="card-base p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold text-foreground">AI-Calculated Metrics</h2>
                                <span className="ml-2 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">
                                    ✦ AI Evaluated
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Overall Score */}
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                                    <p className="text-3xl font-bold" style={{ color: scoreColor(result.overall_score ?? 0) }}>
                                        {result.overall_score ?? 'N/A'}
                                    </p>
                                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${result.overall_score ?? 0}%`,
                                                backgroundColor: scoreColor(result.overall_score ?? 0),
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
                                        📊 Computed from defect rate, lead time, inspection pass rate & costs
                                    </p>
                                </div>

                                {/* Risk Level */}
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
                                    <p className={`text-3xl font-bold ${riskColor(result.risk_level)}`}>
                                        {result.risk_level ?? 'N/A'}
                                    </p>
                                    <div className="mt-2 flex gap-1">
                                        {['Low', 'Medium', 'High', 'Critical'].map(level => (
                                            <div
                                                key={level}
                                                className={`h-2 flex-1 rounded-full transition-all duration-500 ${result.risk_level === level
                                                        ? level === 'Low' ? 'bg-green-400' : level === 'Medium' ? 'bg-yellow-400' : level === 'High' ? 'bg-orange-400' : 'bg-red-400'
                                                        : 'bg-muted'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
                                        📊 Based on overall health: defects, availability, lead times
                                    </p>
                                </div>

                                {/* OTD */}
                                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <p className="text-sm text-muted-foreground mb-1">On-Time Delivery</p>
                                    <p className="text-3xl font-bold" style={{ color: scoreColor(result.otd_percentage ?? 0) }}>
                                        {result.otd_percentage != null ? `${result.otd_percentage}%` : 'N/A'}
                                    </p>
                                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${result.otd_percentage ?? 0}%`,
                                                backgroundColor: scoreColor(result.otd_percentage ?? 0),
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
                                        📊 Estimated from avg lead time & shipping time vs benchmarks
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Aggregated Data Summary */}
                        <div className="card-base p-6">
                            <h2 className="text-lg font-semibold text-foreground mb-4">Aggregated Supplier Data</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block">Avg Price</span>
                                    <span className="font-semibold text-foreground">${result.avg_price.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Total Revenue</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(result.total_revenue)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Defect Rate</span>
                                    <span className="font-semibold text-foreground">{result.defect_rate.toFixed(2)}%</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Inspection Pass</span>
                                    <span className="font-semibold text-foreground">{result.inspection_pass_rate.toFixed(1)}%</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Avg Lead Time</span>
                                    <span className="font-semibold text-foreground">{result.avg_lead_time.toFixed(1)} days</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Avg Shipping Time</span>
                                    <span className="font-semibold text-foreground">{result.avg_shipping_time.toFixed(1)} days</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Total SKUs</span>
                                    <span className="font-semibold text-foreground">{result.num_skus}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Total Products Sold</span>
                                    <span className="font-semibold text-foreground">{result.total_products_sold.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/suppliers/${result.supplier_id}`)}
                                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
                            >
                                View Supplier Detail →
                            </button>
                            <button
                                onClick={() => { setResult(null); setStep(1); setName(''); setLocation(''); setProducts([{ ...DEFAULT_ROW }]); }}
                                className="px-5 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition"
                            >
                                + Add Another
                            </button>
                            <button
                                onClick={() => navigate('/suppliers')}
                                className="px-5 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition"
                            >
                                Back to Suppliers
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default AddSupplier;
