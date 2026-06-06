import { Link } from 'react-router-dom';
import { Supplier } from '@/data/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DonutChart } from '@/components/common/SimpleChart';
import { useTranslation } from 'react-i18next';

interface TopRiskSuppliersProps {
  suppliers: Supplier[];
}

export function TopRiskSuppliers({ suppliers }: TopRiskSuppliersProps) {
  const { t } = useTranslation();

  const riskSuppliers = suppliers
    .filter(s => s.risk_level !== 'Low')
    .sort((a, b) => a.overall_score - b.overall_score)
    .slice(0, 3);

  const getScoreColor = (score: number): 'success' | 'warning' | 'destructive' => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
    return 'destructive';
  };

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">{t('top_at_risk_suppliers')}</h3>
        <Link to="/suppliers?filter=at-risk" className="text-sm text-primary hover:underline">
          {t('view_all')}
        </Link>
      </div>

      <div className="space-y-4">
        {riskSuppliers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('no_at_risk_suppliers')}</p>
        ) : (
          riskSuppliers.map((supplier, index) => (
            <Link
              key={supplier.supplier_id}
              to={`/suppliers/${supplier.supplier_id}`}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <DonutChart
                value={supplier.overall_score}
                color={getScoreColor(supplier.overall_score)}
                size={56}
                strokeWidth={6}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{supplier.name}</p>
                  <StatusBadge status={supplier.risk_level} />
                </div>
                <p className="text-sm text-muted-foreground">
                  OTD: {supplier.otd_percentage.toFixed(1)}% • Defects: {supplier.defect_rate.toFixed(1)}%
                </p>
              </div>

              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
