import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Package, Truck, AlertCircle } from 'lucide-react';
import { Supplier, Alert } from '@/data/mockData';

interface PerformanceChartsProps {
  suppliers: Supplier[];
  alerts: Alert[];
}

export const PerformanceCharts = ({ suppliers, alerts }: PerformanceChartsProps) => {
  // Calculate region distribution
  const regionData = suppliers.reduce((acc, supplier) => {
    acc[supplier.region] = (acc[supplier.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const regions = Object.entries(regionData).map(([name, count]) => ({
    name,
    count,
    percentage: (count / suppliers.length) * 100,
  }));

  // Calculate risk distribution
  const riskData = suppliers.reduce((acc, supplier) => {
    acc[supplier.risk_level] = (acc[supplier.risk_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate performance trends
  const avgOTD = suppliers.reduce((sum, s) => sum + s.otd_percentage, 0) / suppliers.length;
  const avgDefect = suppliers.reduce((sum, s) => sum + s.defect_rate, 0) / suppliers.length;
  const avgScore = suppliers.reduce((sum, s) => sum + s.overall_score, 0) / suppliers.length;

  // Alert severity distribution
  const alertSeverity = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top performing categories
  const topPerformers = suppliers
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, 5);

  const lowPerformers = suppliers
    .sort((a, b) => a.overall_score - b.overall_score)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Risk Level Breakdown */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="h-full hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Risk Assessment
            </CardTitle>
            <CardDescription>Current risk level distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="relative w-64 h-64">
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
                <div className="text-3xl font-bold">{suppliers.length}</div>
                <div className="text-sm text-muted-foreground">Total Suppliers</div>
              </div>
            </div>
            <div className="ml-6 space-y-3">
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
      </motion.div>

      {/* Performance Metrics */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="h-full hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Key Performance Indicators
            </CardTitle>
            <CardDescription>Average metrics across all suppliers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* On-Time Delivery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  On-Time Delivery
                </span>
                <span className="text-lg font-bold text-primary">{avgOTD.toFixed(1)}%</span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${avgOTD}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="absolute h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                />
              </div>
            </div>

            {/* Quality Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Overall Quality Score
                </span>
                <span className="text-lg font-bold text-green-500">{avgScore.toFixed(1)}/100</span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${avgScore}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="absolute h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Defect Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Average Defect Rate
                </span>
                <span className="text-lg font-bold text-orange-500">{avgDefect.toFixed(2)}%</span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(avgDefect / 5) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                />
              </div>
            </div>

            {/* Alert Summary */}
            <div className="pt-4 border-t border-border">
              <div className="text-sm font-medium mb-3">Alert Severity Breakdown</div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(alertSeverity).map(([severity, count]) => {
                  const colors: Record<string, string> = {
                    Critical: 'text-red-500 bg-red-500/10',
                    High: 'text-orange-500 bg-orange-500/10',
                    Medium: 'text-yellow-500 bg-yellow-500/10',
                  };
                  return (
                    <div
                      key={severity}
                      className={`p-3 rounded-lg ${colors[severity] || 'bg-gray-500/10'} text-center`}
                    >
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs opacity-80">{severity}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
