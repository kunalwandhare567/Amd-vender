import { Alert } from '@/data/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';

interface AlertCardProps {
  alert: Alert;
  onReview?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
}

export function AlertCard({ alert, onReview, onResolve }: AlertCardProps) {
  const getTypeIcon = () => {
    switch (alert.type) {
      case 'Quality':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'Delivery':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'Contract':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getSeverityBorder = () => {
    switch (alert.severity) {
      case 'Critical':
        return 'border-l-destructive';
      case 'High':
        return 'border-l-warning';
      case 'Medium':
        return 'border-l-primary';
      default:
        return 'border-l-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={`card-base p-4 border-l-4 ${getSeverityBorder()} animate-fade-in`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${
          alert.severity === 'Critical' ? 'bg-destructive/10 text-destructive' :
          alert.severity === 'High' ? 'bg-warning/10 text-warning' :
          'bg-primary/10 text-primary'
        }`}>
          {getTypeIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground">{alert.supplier_name}</span>
            <StatusBadge status={alert.severity} />
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              alert.status === 'New' ? 'bg-primary/10 text-primary' :
              alert.status === 'Reviewed' ? 'bg-warning/10 text-warning' :
              'bg-success/10 text-success'
            }`}>
              {alert.status}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(alert.timestamp)} • {alert.type}
            </span>
            
            <div className="flex items-center gap-2">
              {alert.status === 'New' && onReview && (
                <button
                  onClick={() => onReview(alert.alert_id)}
                  className="btn-secondary text-xs py-1 px-3"
                >
                  Mark Reviewed
                </button>
              )}
              {alert.status !== 'Resolved' && onResolve && (
                <button
                  onClick={() => onResolve(alert.alert_id)}
                  className="btn-primary text-xs py-1 px-3"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
