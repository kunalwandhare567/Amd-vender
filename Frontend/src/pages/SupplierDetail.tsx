import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MetricCard } from '@/components/common/MetricCard';
import { SimpleBarChart, SimpleLineChart, DonutChart } from '@/components/common/SimpleChart';
import { ReportModal } from '@/components/modals/ReportModal';
import { supplierService } from '@/services/supplierService';
import { api } from '@/lib/api';
import { purchaseOrders, qualityReports, deliveryLogs } from '@/data/mockData';

const SupplierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [showReportModal, setShowReportModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const response = await supplierService.getSupplier(id!);
      return response;
    },
    enabled: !!id,
  });

  const supplier = data?.data;

  // Fetch AI-generated summary from backend
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['supplier-summary', id],
    queryFn: async () => {
      const response = await api.get(`/suppliers/${id}/summary`);
      return response.data;
    },
    enabled: !!id && !!supplier,
  });

  const summary = summaryData?.data || null;
  const supplierPOs = purchaseOrders.filter(po => po.supplier_id === id);
  const supplierQR = qualityReports.filter(qr => qr.supplier_id === id);
  const supplierDL = deliveryLogs.filter(dl => dl.supplier_id === id);


  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center p-8 h-[60vh] items-center">
          <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!supplier) {
    return (
      <MainLayout>
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold text-foreground mb-4">Supplier Not Found</h1>
          <Link to="/suppliers" className="btn-primary">
            Back to Suppliers
          </Link>
        </div>
      </MainLayout>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'quality', label: 'Quality' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'contracts', label: 'Contracts' },
  ];

  // Mock historical data
  const monthlyOTD = [
    { label: 'Jul', value: 88 },
    { label: 'Aug', value: 91 },
    { label: 'Sep', value: 89 },
    { label: 'Oct', value: 93 },
    { label: 'Nov', value: 92 },
    { label: 'Dec', value: supplier.otd_percentage },
  ];

  const monthlyDefects = [
    { label: 'Jul', value: 2.1 },
    { label: 'Aug', value: 1.8 },
    { label: 'Sep', value: 2.4 },
    { label: 'Oct', value: 1.5 },
    { label: 'Nov', value: 1.3 },
    { label: 'Dec', value: supplier.defect_rate },
  ];

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
          <Link to="/" className="hover:text-foreground transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link to="/suppliers" className="hover:text-foreground transition-colors">Suppliers</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-foreground">{supplier.name}</span>
        </nav>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {supplier.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
                {supplier.risk_level && <StatusBadge status={supplier.risk_level} />}
              </div>
              <p className="text-muted-foreground">{supplier.location} • {supplier.supplier_id}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Products: {JSON.parse(supplier.product_types).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contact
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Report
            </button>
          </div>
        </header>

        {/* AI Summary */}
        {summary && (
          <div className="ai-summary-box animate-slide-in">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-semibold text-foreground">AI Performance Summary</span>
              <span className="text-xs text-muted-foreground ml-auto">
                Updated {new Date(summary.generated_date).toLocaleDateString()}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">{summary.summary_text}</p>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Overall Score"
            value={supplier.overall_score ?? 'N/A'}
            trend={{ direction: 'up', value: supplier.overall_score != null ? 'AI Evaluated' : 'Pending' }}
            source="AI computed from defect rate, lead time, inspection pass rate & costs"
          />
          <MetricCard
            label="On-Time Delivery"
            value={supplier.otd_percentage != null ? `${supplier.otd_percentage.toFixed(1)}%` : 'N/A'}
            trend={{ direction: (supplier.otd_percentage ?? 0) > 90 ? 'up' : 'down', value: (supplier.otd_percentage ?? 0) > 90 ? 'Above target' : 'Below target' }}
            source="AI estimated from avg lead time & shipping time vs benchmarks"
          />
          <MetricCard
            label="Defect Rate"
            value={`${supplier.defect_rate.toFixed(1)}%`}
            trend={{ direction: supplier.defect_rate < 2 ? 'down' : 'up', value: supplier.defect_rate < 2 ? 'Good' : 'Needs attention' }}
            source="Avg defect rate across all products (from Kaggle CSV)"
          />
          <MetricCard
            label="Total Revenue"
            value={formatCurrency(supplier.total_revenue)}
            trend={{ direction: 'neutral', value: 'YTD' }}
            source="Sum of revenue generated across all products (from Kaggle CSV)"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-4" role="tablist">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Score */}
              <div className="card-base p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Performance Score Breakdown</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    ✦ AI Calculated
                  </span>
                </div>
                <div className="flex items-center justify-center gap-8">
                  <DonutChart
                    value={supplier.overall_score ?? 0}
                    color={(supplier.overall_score ?? 0) >= 85 ? 'success' : (supplier.overall_score ?? 0) >= 70 ? 'warning' : 'destructive'}
                    size={120}
                    strokeWidth={10}
                  />
                  <div className="space-y-4 flex-1 max-w-[240px]">
                    {/* Quality Score */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Quality</span>
                        <span className="text-sm font-bold text-success">
                          {Math.round(100 - supplier.defect_rate * 10)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-success transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min(100, Math.round(100 - supplier.defect_rate * 10))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">= 100 − (defect_rate × 10)</span>
                    </div>

                    {/* Delivery Score */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Delivery</span>
                        <span className={`text-sm font-bold ${(supplier.otd_percentage ?? 0) >= 90 ? 'text-success' : (supplier.otd_percentage ?? 0) >= 80 ? 'text-warning' : 'text-destructive'}`}>
                          {supplier.otd_percentage != null ? `${supplier.otd_percentage}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${(supplier.otd_percentage ?? 0) >= 90 ? 'bg-success' : (supplier.otd_percentage ?? 0) >= 80 ? 'bg-warning' : 'bg-destructive'}`}
                          style={{ width: `${supplier.otd_percentage ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">AI estimated on-time delivery</span>
                    </div>

                    {/* Inspection Pass */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">Inspection Pass</span>
                        <span className={`text-sm font-bold ${supplier.inspection_pass_rate >= 60 ? 'text-success' : supplier.inspection_pass_rate >= 30 ? 'text-warning' : 'text-destructive'}`}>
                          {supplier.inspection_pass_rate}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${supplier.inspection_pass_rate >= 60 ? 'bg-success' : supplier.inspection_pass_rate >= 30 ? 'bg-warning' : 'bg-destructive'}`}
                          style={{ width: `${supplier.inspection_pass_rate}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">Pass / (Pass + Fail) from inspections</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* OTD Trend */}
              <div className="card-base p-6">
                <h3 className="font-semibold text-foreground mb-4">On-Time Delivery Trend</h3>
                <SimpleBarChart data={monthlyOTD} maxValue={100} color="primary" height={160} />
              </div>

              {/* Key Insights */}
              {summary && (
                <div className="card-base p-6">
                  <h3 className="font-semibold text-foreground mb-4">Key Insights</h3>
                  <ul className="space-y-3">
                    {summary.key_insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Flags */}
              {summary && (
                <div className="card-base p-6">
                  <h3 className="font-semibold text-foreground mb-4">Risk Flags</h3>
                  <ul className="space-y-3">
                    {summary.risk_flags.map((flag, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-warning">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quality' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-base p-6">
                <h3 className="font-semibold text-foreground mb-4">Defect Rate Trend</h3>
                <SimpleLineChart data={monthlyDefects} color="warning" height={160} />
              </div>

              <div className="card-base p-6">
                <h3 className="font-semibold text-foreground mb-4">Recent Quality Reports</h3>
                {supplierQR.length > 0 ? (
                  <div className="space-y-3">
                    {supplierQR.map(qr => (
                      <div key={qr.report_id} className="p-3 rounded-lg bg-muted">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{qr.report_id}</span>
                          <StatusBadge status={qr.severity} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {qr.defect_count} defects in {qr.total_inspected_quantity} items ({((qr.defect_count / qr.total_inspected_quantity) * 100).toFixed(1)}%)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {qr.defect_type} • {new Date(qr.inspection_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No quality reports available</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-base p-6">
                <h3 className="font-semibold text-foreground mb-4">Delivery Performance</h3>
                <SimpleBarChart data={monthlyOTD} maxValue={100} color="success" height={160} />
              </div>

              <div className="card-base p-6">
                <h3 className="font-semibold text-foreground mb-4">Recent Deliveries</h3>
                {supplierDL.length > 0 ? (
                  <div className="space-y-3">
                    {supplierDL.map(dl => (
                      <div key={dl.delivery_id} className="p-3 rounded-lg bg-muted">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{dl.delivery_id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${dl.delivery_status === 'OnTime'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                            }`}>
                            {dl.delivery_status === 'OnTime' ? 'On Time' : `Delayed ${dl.delay_days}d`}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {dl.transport_mode} • Received {new Date(dl.received_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No delivery logs available</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="card-base p-6">
              <h3 className="font-semibold text-foreground mb-4">Contract Compliance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <DonutChart
                    value={supplier.inspection_pass_rate}
                    color={supplier.inspection_pass_rate >= 60 ? 'success' : supplier.inspection_pass_rate >= 30 ? 'warning' : 'destructive'}
                    size={100}
                    strokeWidth={8}
                  />
                  <p className="text-sm text-muted-foreground mt-2">Inspection Pass Rate</p>
                </div>
                <div className="col-span-2">
                  <h4 className="font-medium text-foreground mb-3">SLA Terms</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <span className="text-sm text-muted-foreground">Max Delay Days</span>
                      <span className="font-medium text-foreground">5 days</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <span className="text-sm text-muted-foreground">Min Quality %</span>
                      <span className="font-medium text-foreground">98%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <span className="text-sm text-muted-foreground">Contract End Date</span>
                      <span className="font-medium text-foreground">Dec 31, 2025</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReportModal
        supplier={supplier}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </MainLayout>
  );
};

export default SupplierDetail;
