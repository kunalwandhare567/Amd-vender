import { Link } from 'react-router-dom';
import { Supplier } from '@/data/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';

interface SupplierTableProps {
  suppliers: Supplier[];
  onGenerateReport: (supplierId: string) => void;
}

export function SupplierTable({ suppliers, onGenerateReport }: SupplierTableProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table">
        <thead>
          <tr>
            <th className="table-header rounded-tl-lg">Supplier</th>
            <th className="table-header">Location</th>
            <th className="table-header">Overall Score</th>
            <th className="table-header">Risk Level</th>
            <th className="table-header">OTD %</th>
            <th className="table-header">Defect Rate</th>
            <th className="table-header">Inspection Pass</th>
            <th className="table-header">Revenue</th>
            <th className="table-header rounded-tr-lg">Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier, index) => (
            <tr
              key={supplier.supplier_id}
              className="hover:bg-card-hover transition-colors duration-150 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <td className="table-cell">
                <Link
                  to={`/suppliers/${supplier.supplier_id}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {supplier.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {supplier.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{supplier.supplier_id}</p>
                  </div>
                </Link>
              </td>
              <td className="table-cell">
                <span className="text-muted-foreground">{supplier.location}</span>
              </td>
              <td className="table-cell">
                {supplier.overall_score != null ? (
                  <span className={`text-lg font-bold ${getScoreColor(supplier.overall_score)}`}>
                    {supplier.overall_score}
                  </span>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </td>
              <td className="table-cell">
                {supplier.risk_level ? (
                  <StatusBadge status={supplier.risk_level} />
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </td>
              <td className="table-cell">
                {supplier.otd_percentage != null ? (
                  <span className={getScoreColor(supplier.otd_percentage)}>
                    {supplier.otd_percentage.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </td>
              <td className="table-cell">
                <span className={supplier.defect_rate > 3 ? 'text-destructive' : supplier.defect_rate > 2 ? 'text-warning' : 'text-success'}>
                  {supplier.defect_rate.toFixed(1)}%
                </span>
              </td>
              <td className="table-cell">
                <span className={supplier.inspection_pass_rate >= 60 ? 'text-success' : supplier.inspection_pass_rate >= 30 ? 'text-warning' : 'text-destructive'}>
                  {supplier.inspection_pass_rate.toFixed(1)}%
                </span>
              </td>
              <td className="table-cell">
                <span className="text-foreground font-medium">{formatCurrency(supplier.total_revenue)}</span>
              </td>
              <td className="table-cell">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/suppliers/${supplier.supplier_id}`}
                    className="icon-btn"
                    aria-label={`View details for ${supplier.name}`}
                    title="View Details"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => onGenerateReport(supplier.supplier_id)}
                    className="icon-btn-primary"
                    aria-label={`Generate report for ${supplier.name}`}
                    title="Generate AI Report"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
