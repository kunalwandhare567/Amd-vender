interface DataPoint {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  maxValue?: number;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  height?: number;
}

export function SimpleBarChart({ data, maxValue, color = 'primary', height = 120 }: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value));
  
  const getColorClass = () => {
    switch (color) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'destructive':
        return 'bg-destructive';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((point, index) => {
        const heightPercent = (point.value / max) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col items-center justify-end" style={{ height: height - 24 }}>
              <div
                className={`w-full rounded-t-md ${getColorClass()} transition-all duration-500`}
                style={{ height: `${heightPercent}%`, minHeight: 4 }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-full">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface SimpleLineChartProps {
  data: DataPoint[];
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  height?: number;
}

export function SimpleLineChart({ data, color = 'primary', height = 100 }: SimpleLineChartProps) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  
  const getColorClass = () => {
    switch (color) {
      case 'success':
        return 'stroke-success';
      case 'warning':
        return 'stroke-warning';
      case 'destructive':
        return 'stroke-destructive';
      default:
        return 'stroke-primary';
    }
  };

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((point.value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline
          points={points}
          fill="none"
          className={`${getColorClass()} transition-all duration-500`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((point.value - min) / range) * 80 - 10;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              className={`fill-primary ${getColorClass()}`}
            />
          );
        })}
      </svg>
    </div>
  );
}

interface DonutChartProps {
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function DonutChart({ value, max = 100, color = 'primary', size = 80, strokeWidth = 8, label }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;
  
  const getColorClass = () => {
    switch (color) {
      case 'success':
        return 'stroke-success';
      case 'warning':
        return 'stroke-warning';
      case 'destructive':
        return 'stroke-destructive';
      default:
        return 'stroke-primary';
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`${getColorClass()} transition-all duration-700`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-foreground">{value}%</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
