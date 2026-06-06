export interface Supplier {
    supplier_id: string;
    name: string;
    // ── Kaggle CSV fields ──
    location: string;
    product_types: string;
    avg_price: number;
    avg_availability: number;
    total_products_sold: number;
    total_revenue: number;
    avg_stock_level: number;
    avg_lead_time: number;
    total_order_quantity: number;
    avg_shipping_time: number;
    shipping_carriers: string;
    avg_shipping_cost: number;
    total_production_volume: number;
    avg_manufacturing_lead_time: number;
    avg_manufacturing_cost: number;
    defect_rate: number;
    inspection_pass_rate: number;
    transportation_modes: string;
    routes: string;
    avg_total_cost: number;
    customer_demographics: string;
    num_skus: number;
    // ── AI-evaluated fields ──
    overall_score: number | null;
    risk_level: 'Low' | 'Medium' | 'High' | 'Critical' | null;
    otd_percentage: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface GetSuppliersParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
    location?: string;
}

export interface SuppliersResponse {
    success: boolean;
    data: {
        suppliers: Supplier[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            itemsPerPage: number;
        };
    };
}

export interface SupplierResponse {
    success: boolean;
    data: Supplier;
}

export interface ReportResponse {
    success: boolean;
    data: {
        supplier_id: string;
        summary_text: string;
        generated_date: string;
    };
}

export interface ProductRow {
    product_type: string;
    sku: string;
    price: number;
    availability: number;
    number_sold: number;
    revenue: number;
    customer_demographics: string;
    stock_level: number;
    lead_time: number;
    order_quantity: number;
    shipping_time: number;
    shipping_cost: number;
    shipping_carrier: string;
    production_volume: number;
    manufacturing_lead_time: number;
    manufacturing_cost: number;
    defect_rate: number;
    transportation_mode: string;
    route: string;
    inspection_result: string;
}

export interface AddSupplierPayload {
    name: string;
    location: string;
    products: ProductRow[];
}

import { api } from '@/lib/api';

export const supplierService = {
    async getSuppliers(params: GetSuppliersParams = {}): Promise<SuppliersResponse> {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, String(value));
            }
        });

        const response = await api.get(`/suppliers?${queryParams.toString()}`);
        return response.data;
    },

    async getSupplier(supplierId: string): Promise<SupplierResponse> {
        const response = await api.get(`/suppliers/${supplierId}`);
        return response.data;
    },

    async generateReport(supplierId: string): Promise<ReportResponse> {
        const response = await api.post(`/suppliers/${supplierId}/report`);
        return response.data;
    },

    async addSupplier(payload: AddSupplierPayload): Promise<SupplierResponse> {
        const response = await api.post('/suppliers/', payload);
        return response.data;
    },

    async getAlerts(params: { status?: string; severity?: string } = {}): Promise<{ success: boolean; data: any[] }> {
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.severity) queryParams.append('severity', params.severity);

        const response = await api.get(`/alerts?${queryParams.toString()}`);
        return response.data;
    },
};
