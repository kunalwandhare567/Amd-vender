import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Supplier } from '@/data/mockData';

interface RiskDonutChartProps {
  suppliers: Supplier[];
}

export const RiskDonutChart = ({ suppliers }: RiskDonutChartProps) => {
  // Calculate risk distribution
  const riskData = suppliers.reduce((acc, supplier) => {
    acc[supplier.risk_level] = (acc[supplier.risk_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          Risk Assessment
        </CardTitle>
        <CardDescription>Current risk level distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-6">
        <div className="relative w-48 h-48">
          {/* Donut Chart */}
          <svg viewBox="0 0 200 200" className="transform -rotate-90">
            {Object.entries(riskData).map(([level, count], idx) => {
              const total = suppliers.length;
              const percentage = (count / total) * 100;
              const circumference = 2 * Math.PI * 70;
              const offset = circumference - (percentage / 100) * circumference;
              const rotation = Object.entries(riskData)
                .slice(0, idx)
                .reduce((sum, [, c]) => sum + (c / total) * 100, 0);

              const colors: Record<string, string> = {
                Low: '#10b981',
                Medium: '#f59e0b',
                High: '#ef4444',
              };

              return (
                <motion.circle
                  key={level}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1, delay: idx * 0.2 }}
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke={colors[level] || '#6b7280'}
                  strokeWidth="30"
                  strokeDasharray={circumference}
                  strokeLinecap="round"
                  style={{
                    transformOrigin: 'center',
                    transform: `rotate(${(rotation * 3.6)}deg)`,
                  }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
        <div className="ml-8 space-y-3">
          {Object.entries(riskData).map(([level, count]) => {
            const colors: Record<string, string> = {
              Low: 'bg-green-500',
              Medium: 'bg-yellow-500',
              High: 'bg-red-500',
            };
            return (
              <div key={level} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${colors[level] || 'bg-gray-500'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{level}</div>
                  <div className="text-xs text-muted-foreground">
                    {count} suppliers ({((count / suppliers.length) * 100).toFixed(0)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
