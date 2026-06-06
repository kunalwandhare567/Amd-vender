interface StatusBadgeProps {
  status: 'Low' | 'Medium' | 'High' | 'Critical' | 'green' | 'amber' | 'red';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const getStatusClass = () => {
    switch (status) {
      case 'Low':
      case 'green':
        return 'status-green';
      case 'Medium':
      case 'amber':
        return 'status-amber';
      case 'High':
      case 'Critical':
      case 'red':
        return 'status-red';
      default:
        return 'status-green';
    }
  };

  const getDefaultLabel = () => {
    switch (status) {
      case 'green':
        return 'Good';
      case 'amber':
        return 'Warning';
      case 'red':
        return 'Critical';
      default:
        return status;
    }
  };

  return (
    <span className={getStatusClass()}>
      {label || getDefaultLabel()}
    </span>
  );
}
