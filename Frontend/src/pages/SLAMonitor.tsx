import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingDown, TrendingUp, Bell, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface SLAMetric {
  id: string;
  supplier_id: string;
  supplier_name: string;
  metric: 'delivery_time' | 'response_time' | 'quality_score' | 'uptime' | 'lead_time' | 'shipping_time' | 'inspection_rate';
  current: number;
  threshold: number;
  target: number;
  unit: string;
  status: 'compliant' | 'warning' | 'breached';
  deviation_percent: number;
  trend: 'up' | 'down' | 'stable';
  proof_document_id?: string;
  proof_filename?: string;
}

export default function SLAMonitor() {
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);
  const [filter, setFilter] = useState<'all' | 'breached' | 'warning' | 'compliant'>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchSLAMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/sla/');
      if (response.data.metrics) {
        setMetrics(response.data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch SLA metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      const response = await api.post('/sla/analyze');
      if (response.data.metrics) {
        setMetrics(response.data.metrics);
        toast.success('AI SLA analysis completed and metrics updated successfully!');
      }
    } catch (error: any) {
      console.error('Failed to run SLA analysis:', error);
      toast.error('Failed to analyze SLAs using AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchSLAMetrics();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSLAMetrics();
      }, 60000); // Refresh every 60 seconds (AI calls are slower)
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const filteredMetrics = metrics.filter(m =>
    filter === 'all' ? true : m.status === filter
  );

  const breachedCount = metrics.filter(m => m.status === 'breached').length;
  const warningCount = metrics.filter(m => m.status === 'warning').length;
  const compliantCount = metrics.filter(m => m.status === 'compliant').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'breached':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'breached':
        return 'destructive';
      case 'warning':
        return 'outline';
      case 'compliant':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4" />;
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'delivery_time':
        return 'Delivery Time';
      case 'response_time':
        return 'Response Time';
      case 'quality_score':
        return 'Quality Score';
      case 'uptime':
        return 'Uptime';
      default:
        return metric;
    }
  };

  const calculateProgress = (metric: SLAMetric) => {
    if (metric.metric === 'delivery_time' || metric.metric === 'response_time' || metric.metric === 'lead_time' || metric.metric === 'shipping_time') {
      // For time metrics, lower is better
      return Math.max(0, Math.min(100, ((metric.threshold - metric.current) / metric.threshold) * 100));
    } else {
      // For percentage metrics, higher is better
      return (metric.current / metric.target) * 100;
    }
  };

  const handleDownloadProof = async (docId: string, filename: string) => {
    try {
      const response = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Failed to download proof document:', error);
      alert('Failed to download proof report document.');
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">SLA Monitoring</h2>
            <p className="text-muted-foreground mt-1">Real-time tracking of supplier service level agreements</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleAIAnalyze}
              disabled={isAnalyzing || isLoading}
              className="gap-2 font-semibold bg-primary hover:bg-primary/95 text-primary-foreground"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing SLAs...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  AI Analyze SLAs
                </>
              )}
            </Button>
            <Button
              onClick={fetchSLAMetrics}
              disabled={isLoading || isAnalyzing}
              variant="outline"
              className="gap-2 font-semibold border border-border text-foreground hover:bg-secondary/40"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 text-primary" />
              )}
              Refresh
            </Button>
            <Badge variant="outline" className="text-sm py-2 px-4 bg-secondary/10">
              <Bell className="w-4 h-4 mr-2" />
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Badge>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-sm text-primary hover:underline"
            >
              Toggle
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilter('all')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.length}</div>
                <p className="text-xs text-muted-foreground mt-1">All SLA metrics</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-red-500/50" onClick={() => setFilter('breached')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Breached</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{breachedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Critical violations</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-yellow-500/50" onClick={() => setFilter('warning')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Warning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">{warningCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Near threshold</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-green-500/50" onClick={() => setFilter('compliant')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{compliantCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Meeting targets</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Active Filter */}
        {filter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtering:</span>
            <Badge variant="outline">{filter.toUpperCase()}</Badge>
            <button
              onClick={() => setFilter('all')}
              className="text-sm text-primary hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* SLA Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMetrics.map((metric, idx) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
            >
              <Card className={`hover:shadow-md transition-shadow ${metric.status === 'breached' ? 'border-red-500/50' :
                metric.status === 'warning' ? 'border-yellow-500/50' :
                  'border-green-500/20'
                }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        {getStatusIcon(metric.status)}
                        {metric.supplier_name}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {getMetricLabel(metric.metric)}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={getStatusColor(metric.status) as any} className="text-xs">
                        {metric.status.toUpperCase()}
                      </Badge>
                      {getTrendIcon(metric.trend)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Current</p>
                      <p className="font-semibold">{metric.current}{metric.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Target</p>
                      <p className="font-semibold text-green-600">{metric.target}{metric.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Threshold</p>
                      <p className="font-semibold text-yellow-600">{metric.threshold}{metric.unit}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Performance</span>
                      <span className="font-medium">{calculateProgress(metric).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={calculateProgress(metric)}
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                    <span>Deviation: {metric.deviation_percent}%</span>
                    <span>Updated: Just now</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredMetrics.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No metrics match the selected filter.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
