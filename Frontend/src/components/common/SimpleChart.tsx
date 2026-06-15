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

export function SimpleLineChart({ data, color = 'primary', height = 120 }: SimpleLineChartProps) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  
  const getStrokeColorClass = () => {
    switch (color) {
      case 'success': return 'stroke-success';
      case 'warning': return 'stroke-warning';
      case 'destructive': return 'stroke-destructive';
      default: return 'stroke-primary';
    }
  };

  const getFillColorClass = () => {
    switch (color) {
      case 'success': return 'fill-success';
      case 'warning': return 'fill-warning';
      case 'destructive': return 'fill-destructive';
      default: return 'fill-primary';
    }
  };

  // Fixed coordinate box dimensions inside the SVG
  const chartWidth = 430;
  const chartHeight = 75;
  const startX = 45;
  const startY = 15;

  const points = data.map((point, index) => {
    const x = startX + (index / (data.length - 1)) * chartWidth;
    const y = startY + chartHeight - ((point.value - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full flex flex-col pt-4" style={{ height: height + 40 }}>
      <div className="flex-1 w-full relative">
        <svg viewBox="0 0 520 120" className="w-full h-full overflow-visible">
          {/* Y-Axis Gridlines & Labels */}
          {[0, 0.5, 1].map((ratio) => {
            const y = startY + chartHeight - ratio * chartHeight;
            const val = min + ratio * range;
            return (
              <g key={ratio} className="opacity-30">
                <line
                  x1={startX}
                  y1={y}
                  x2={startX + chartWidth}
                  y2={y}
                  className="stroke-muted"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <text
                  x={startX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground font-medium text-[9px] select-none"
                >
                  {val.toFixed(1)}%
                </text>
              </g>
            );
          })}

          {/* Solid X and Y Axis border lines */}
          <line
            x1={startX}
            y1={startY}
            x2={startX}
            y2={startY + chartHeight}
            className="stroke-muted"
            strokeWidth="1.5"
          />
          <line
            x1={startX}
            y1={startY + chartHeight}
            x2={startX + chartWidth}
            y2={startY + chartHeight}
            className="stroke-muted"
            strokeWidth="1.5"
          />

          {/* Polyline Path */}
          <polyline
            fill="none"
            strokeWidth="3"
            points={points}
            className={`${getStrokeColorClass()} transition-all duration-500`}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {data.map((point, index) => {
            const x = startX + (index / (data.length - 1)) * chartWidth;
            const y = startY + chartHeight - ((point.value - min) / range) * chartHeight;
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="4.5"
                  className={`${getFillColorClass()} stroke-background transition-all hover:r-6 cursor-pointer`}
                  strokeWidth="2"
                />
                {/* Value Label */}
                <text
                  x={x}
                  y={y - 9}
                  textAnchor="middle"
                  className="fill-foreground font-bold text-[10px] select-none pointer-events-none"
                >
                  {point.value.toFixed(1)}%
                </text>
                
                {/* X-Axis month label centered beneath the dot */}
                <text
                  x={x}
                  y={startY + chartHeight + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] font-semibold select-none pointer-events-none"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
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
