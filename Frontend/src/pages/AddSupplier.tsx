import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supplierService, ProductRow, Supplier } from '@/services/supplierService';
import { Loader2, Plus, Trash2, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Upload, Settings } from 'lucide-react';
import { toast } from 'sonner';

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
    const [isExtracting, setIsExtracting] = useState(false);
    const [result, setResult] = useState<Supplier | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1=info, 2=products, 3=results
    const [userApiKey, setUserApiKey] = useState(localStorage.getItem('user_openrouter_api_key') || '');
    const [userModel, setUserModel] = useState(localStorage.getItem('user_openrouter_model') || 'google/gemini-2.5-flash');
    const [showSettings, setShowSettings] = useState(false);

    const handleApiKeyChange = (val: string) => {
        setUserApiKey(val);
        if (val.trim()) {
            localStorage.setItem('user_openrouter_api_key', val.trim());
        } else {
            localStorage.removeItem('user_openrouter_api_key');
        }
    };

    const handleModelChange = (val: string) => {
        setUserModel(val);
        localStorage.setItem('user_openrouter_model', val);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        const headers: Record<string, string> = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const apiKey = localStorage.getItem('user_openrouter_api_key');
        if (apiKey) {
            headers['X-User-API-Key'] = apiKey;
        }
        const apiModel = localStorage.getItem('user_openrouter_model') || 'google/gemini-2.5-flash';
        headers['X-User-Model'] = apiModel;

        try {
            const response = await fetch('http://localhost:8000/api/suppliers/extract-document', {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData?.detail || 'Extraction failed');
            }

            const resData = await response.json();
            const extracted = resData.data;

            if (resData.warning) {
                toast.warning('Extraction Notice', {
                    description: resData.warning,
                    duration: 6000,
                });
            }

            if (extracted.name) setName(extracted.name);
            if (extracted.location) setLocation(extracted.location);
            if (extracted.products && extracted.products.length > 0) {
                setProducts(extracted.products);
                setStep(2);
                toast.success(`Successfully extracted ${extracted.products.length} products!`, {
                    description: `Loaded supplier "${extracted.name}" from ${extracted.location}`,
                });
            } else {
                toast.warning(`Extracted supplier info, but no products were found.`, {
                    description: `Loaded supplier "${extracted.name}" from ${extracted.location}`,
                });
            }
        } catch (err: any) {
            let msg = err.message || 'Failed to extract document. Make sure it is a valid PDF, Excel, or CSV.';
            if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
                msg = 'OpenRouter Rate limit exceeded (429). Please add credits to your account, provide your own custom API key in API Settings, or try again later.';
            }
            setError(msg);
            toast.error('AI Extraction Failed', {
                description: msg,
                duration: 8000,
            });
        } finally {
            setIsExtracting(false);
            e.target.value = '';
        }
    };

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
            const parsedProducts = products.map(r => ({
                ...r,
                price: Number(r.price) || 0,
                availability: Number(r.availability) || 0,
                number_sold: Number(r.number_sold) || 0,
                revenue: Number(r.revenue) || 0,
                stock_level: Number(r.stock_level) || 0,
                lead_time: Number(r.lead_time) || 0,
                order_quantity: Number(r.order_quantity) || 0,
                shipping_time: Number(r.shipping_time) || 0,
                shipping_cost: Number(r.shipping_cost) || 0,
                production_volume: Number(r.production_volume) || 0,
                manufacturing_lead_time: Number(r.manufacturing_lead_time) || 0,
                manufacturing_cost: Number(r.manufacturing_cost) || 0,
                defect_rate: Number(r.defect_rate) || 0,
            }));
            const res = await supplierService.addSupplier({ name, location, products: parsedProducts });
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
                    <div className="card-base p-6 space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">Step 1 — Supplier Information</h2>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${showSettings
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'border-border text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                <Settings className={`w-3.5 h-3.5 ${showSettings ? 'animate-spin' : ''}`} />
                                API Settings {userApiKey ? '• Key Set' : '(Optional)'}
                            </button>
                        </div>

                        {showSettings && (
                            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-4 animate-slide-down">
                                <p className="text-xs text-muted-foreground font-medium">
                                    🔧 Configure your custom OpenRouter details to avoid rate limits (429 errors). Settings are saved in your browser.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">OpenRouter API Key</label>
                                        <input
                                            type="password"
                                            value={userApiKey}
                                            onChange={e => handleApiKeyChange(e.target.value)}
                                            placeholder="Paste your sk-or-... key"
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Extraction LLM Model</label>
                                        <select
                                            value={userModel}
                                            onChange={e => handleModelChange(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        >
                                            <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fast & Large Window)</option>
                                            <option value="openai/gpt-4o-mini">GPT-4o Mini (High schema precision)</option>
                                            <option value="google/gemini-2.5-flash:free">Gemini 2.5 Flash (Free - 50 req/day)</option>
                                            <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B Free (50 req/day)</option>
                                            <option value="google/gemma-2-9b-it:free">Gemma 2 9B Free (50 req/day)</option>
                                            <option value="deepseek/deepseek-chat:free">DeepSeek Chat Free (50 req/day)</option>
                                        </select>
                                    </div>
                                </div>
                                {userApiKey && (
                                    <p className="text-[10px] text-green-400 flex items-center gap-1 font-semibold">
                                        ✓ Key active and saved locally.
                                    </p>
                                )}
                            </div>
                        )}
                        
                        {/* File Upload Zone */}
                        <div className="border-2 border-dashed border-primary/20 hover:border-primary/45 rounded-xl p-6 bg-muted/20 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden group">
                            <Upload className="w-10 h-10 text-primary mb-2 group-hover:scale-110 transition-transform duration-300" />
                            <p className="font-semibold text-sm text-foreground mb-1">Upload Supplier Document (PDF, Excel, CSV)</p>
                            <p className="text-xs text-muted-foreground max-w-sm mb-4">
                                Drag & drop or click to upload a catalog, invoice, or supplier list. AI will automatically extract the supplier name, location, and all product rows.
                            </p>
                            <input
                                type="file"
                                accept=".pdf,.csv,.xlsx,.xls"
                                onChange={handleFileUpload}
                                disabled={isExtracting}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {isExtracting ? (
                                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    AI is Extracting Data...
                                </div>
                            ) : (
                                <button className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold transition">
                                    Browse Files
                                </button>
                            )}
                        </div>

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
                                                    <input value={row.product_type} onChange={e => updateRow(idx, 'product_type', e.target.value)}
                                                        placeholder="e.g. skincare"
                                                        className="w-24 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input value={row.sku} onChange={e => updateRow(idx, 'sku', e.target.value)}
                                                        className="w-20 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.price} onChange={e => updateRow(idx, 'price', e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.availability} onChange={e => updateRow(idx, 'availability', e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.number_sold} onChange={e => updateRow(idx, 'number_sold', e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.revenue} onChange={e => updateRow(idx, 'revenue', e.target.value)}
                                                        className="w-20 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <select value={row.customer_demographics} onChange={e => updateRow(idx, 'customer_demographics', e.target.value)}
                                                        className="w-20 px-1 py-1 text-xs rounded border border-border bg-background text-foreground">
                                                        {DEMOGRAPHICS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.stock_level} onChange={e => updateRow(idx, 'stock_level', e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.lead_time} onChange={e => updateRow(idx, 'lead_time', e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.order_quantity} onChange={e => updateRow(idx, 'order_quantity', e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.shipping_time} onChange={e => updateRow(idx, 'shipping_time', e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.shipping_cost} onChange={e => updateRow(idx, 'shipping_cost', e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <select value={row.shipping_carrier} onChange={e => updateRow(idx, 'shipping_carrier', e.target.value)}
                                                        className="w-22 px-1 py-1 text-xs rounded border border-border bg-background text-foreground">
                                                        {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.production_volume} onChange={e => updateRow(idx, 'production_volume', e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.manufacturing_lead_time} onChange={e => updateRow(idx, 'manufacturing_lead_time', e.target.value)}
                                                        className="w-14 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.manufacturing_cost} onChange={e => updateRow(idx, 'manufacturing_cost', e.target.value)}
                                                        className="w-16 px-1 py-1 text-xs rounded border border-border bg-background text-foreground" />
                                                </td>
                                                <td className="px-1 py-1">
                                                    <input type="number" value={row.defect_rate} onChange={e => updateRow(idx, 'defect_rate', e.target.value)}
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
