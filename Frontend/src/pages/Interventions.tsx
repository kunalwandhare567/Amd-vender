import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  ShieldAlert,
  Zap,
  Target,
  BookOpen,
  DollarSign,
  MessageSquare,
  Calendar,
  BarChart3,
  Send,
  Clock,
  CheckCheck,
  XCircle,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';

interface Intervention {
  id: string;
  type: 'automated' | 'manual' | 'ai_suggested';
  category: 'risk_mitigation' | 'performance_boost' | 'cost_optimization' | 'relationship_building';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  targetSuppliers: string[];
  actions: Action[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  impact: {
    risk_reduction: number;
    cost_savings: number;
    performance_improvement: number;
  };
  estimatedDuration: string;
}

interface Action {
  id: string;
  name: string;
  type: 'email' | 'meeting' | 'audit' | 'contract_review' | 'payment_terms' | 'training';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  automated: boolean;
}

export default function Interventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading interventions...');

  const fetchInterventions = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Fetching interventions...');
      const response = await api.get('/interventions/');
      if (response.data.interventions) {
        setInterventions(response.data.interventions);
      }
    } catch (error) {
      console.error('Failed to fetch interventions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateInterventions = async () => {
    try {
      setIsRegenerating(true);
      setLoadingMessage('AI is generating new interventions from your supplier data...');
      const response = await api.post('/interventions/generate');
      if (response.data.interventions) {
        setInterventions(response.data.interventions);
      }
    } catch (error) {
      console.error('Failed to regenerate interventions:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'risk_mitigation':
        return <ShieldAlert className="w-5 h-5" />;
      case 'performance_boost':
        return <TrendingUp className="w-5 h-5" />;
      case 'cost_optimization':
        return <DollarSign className="w-5 h-5" />;
      case 'relationship_building':
        return <Users className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'risk_mitigation':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'performance_boost':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'cost_optimization':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'relationship_building':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };


  const getPriorityBadge = (priority: string) => {
    const variants: any = {
      critical: 'destructive',
      high: 'outline',
      medium: 'secondary',
      low: 'default',
    };
    return variants[priority] || 'default';
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Send className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'audit':
        return <BarChart3 className="w-4 h-4" />;
      case 'contract_review':
        return <BookOpen className="w-4 h-4" />;
      case 'payment_terms':
        return <DollarSign className="w-4 h-4" />;
      case 'training':
        return <Users className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCheck className="w-4 h-4 text-green-500" />;
      case 'executing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const executeAction = (interventionId: string, actionId: string) => {
    setExecutingActions(prev => new Set([...prev, actionId]));

    // Simulate action execution
    setTimeout(() => {
      setInterventions(prev => prev.map(int => {
        if (int.id === interventionId) {
          return {
            ...int,
            actions: int.actions.map(action =>
              action.id === actionId
                ? { ...action, status: 'executing' as const }
                : action
            ),
          };
        }
        return int;
      }));

      // Complete action after 2 seconds
      setTimeout(() => {
        setInterventions(prev => prev.map(int => {
          if (int.id === interventionId) {
            const updatedActions = int.actions.map(action =>
              action.id === actionId
                ? { ...action, status: 'completed' as const }
                : action
            );
            const allCompleted = updatedActions.every(a => a.status === 'completed');
            return {
              ...int,
              actions: updatedActions,
              status: allCompleted ? 'completed' as const : int.status,
            };
          }
          return int;
        }));
        setExecutingActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(actionId);
          return newSet;
        });
      }, 2000);
    }, 500);
  };

  const executeAllActions = (interventionId: string) => {
    const intervention = interventions.find(i => i.id === interventionId);
    if (!intervention) return;

    const pendingActions = intervention.actions.filter(a => a.status === 'pending' && a.automated);
    pendingActions.forEach((action, index) => {
      setTimeout(() => {
        executeAction(interventionId, action.id);
      }, index * 1000);
    });
  };

  const stats = {
    total: interventions.length,
    critical: interventions.filter(i => i.priority === 'critical').length,
    inProgress: interventions.filter(i => i.status === 'in_progress').length,
    totalRiskReduction: interventions.reduce((sum, i) => sum + i.impact.risk_reduction, 0),
    totalSavings: interventions.reduce((sum, i) => sum + i.impact.cost_savings, 0),
    performanceGain: interventions.reduce((sum, i) => sum + i.impact.performance_improvement, 0),
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary" />
              Strategic Interventions
            </h2>
            <p className="text-muted-foreground mt-1">AI-powered automated actions and strategic initiatives based on your supplier data</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={regenerateInterventions}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate with AI
            </Button>
            <Button className="gap-2">
              <Target className="w-4 h-4" />
              Create Custom
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-red-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Risk ↓</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.totalRiskReduction}%</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">${(stats.totalSavings / 1000).toFixed(0)}K</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="border-blue-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Performance ↑</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">+{stats.performanceGain}%</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Loading / Generating State */}
        {(isLoading || isRegenerating) && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1" />
            </div>
            <p className="text-lg font-medium text-foreground">{loadingMessage}</p>
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              {isLoading
                ? 'If this is your first time, the AI is analysing your supplier data and generating strategic interventions…'
                : 'The AI is analysing all supplier data, risk levels, and alerts to craft fresh interventions…'}
            </p>
          </div>
        )}

        {/* Interventions List */}
        {!isLoading && !isRegenerating && interventions.length > 0 && (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Interventions</TabsTrigger>
              <TabsTrigger value="risk_mitigation">Risk Mitigation</TabsTrigger>
              <TabsTrigger value="performance_boost">Performance</TabsTrigger>
              <TabsTrigger value="cost_optimization">Cost Optimization</TabsTrigger>
              <TabsTrigger value="relationship_building">Relationships</TabsTrigger>
            </TabsList>

            {['all', 'risk_mitigation', 'performance_boost', 'cost_optimization', 'relationship_building'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {interventions
                  .filter(int => tab === 'all' || int.category === tab)
                  .map((intervention, idx) => (
                    <motion.div
                      key={intervention.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="hover:shadow-lg transition-all cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`p-3 rounded-lg border ${getCategoryColor(intervention.category)}`}>
                                {getCategoryIcon(intervention.category)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <CardTitle className="text-lg">{intervention.title}</CardTitle>
                                  <Badge variant={getPriorityBadge(intervention.priority)}>
                                    {intervention.priority.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="gap-1">
                                    {intervention.type === 'ai_suggested' && <Zap className="w-3 h-3" />}
                                    {intervention.type === 'automated' && <CheckCircle className="w-3 h-3" />}
                                    {intervention.type}
                                  </Badge>
                                </div>
                                <CardDescription className="text-sm">{intervention.description}</CardDescription>
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {intervention.targetSuppliers.length} suppliers
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {intervention.estimatedDuration}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Just generated
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => executeAllActions(intervention.id)}
                              disabled={intervention.status === 'completed' || intervention.actions.every(a => !a.automated || a.status !== 'pending')}
                              className="gap-2"
                            >
                              <Zap className="w-4 h-4" />
                              Execute All Automated
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Impact Metrics */}
                          <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground">Risk Reduction</p>
                              <p className="text-lg font-bold text-green-500">-{intervention.impact.risk_reduction}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Cost Savings</p>
                              <p className="text-lg font-bold text-green-500">
                                ${(intervention.impact.cost_savings / 1000).toFixed(0)}K
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Performance Gain</p>
                              <p className="text-lg font-bold text-blue-500">+{intervention.impact.performance_improvement}%</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Action Items ({intervention.actions.filter(a => a.status === 'completed').length}/{intervention.actions.length})</h4>
                            <div className="space-y-2">
                              {intervention.actions.map(action => (
                                <div
                                  key={action.id}
                                  className="flex items-center justify-between p-3 bg-background rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {getActionStatusIcon(action.status)}
                                    <div className="flex items-center gap-2">
                                      {getActionIcon(action.type)}
                                      <span className="text-sm">{action.name}</span>
                                    </div>
                                    {action.automated && (
                                      <Badge variant="secondary" className="text-xs">
                                        Auto
                                      </Badge>
                                    )}
                                  </div>
                                  {action.automated && action.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => executeAction(intervention.id, action.id)}
                                      disabled={executingActions.has(action.id)}
                                      className="gap-2"
                                    >
                                      {executingActions.has(action.id) ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Send className="w-3 h-3" />
                                      )}
                                      Execute
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Target Suppliers */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Target Suppliers</h4>
                            <div className="flex flex-wrap gap-2">
                              {intervention.targetSuppliers.map((supplier, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {supplier}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Empty state */}
        {!isLoading && !isRegenerating && interventions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">No interventions yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Click <strong>Regenerate with AI</strong> to generate AI-powered strategic recommendations based on your supplier data.
            </p>
            <Button onClick={regenerateInterventions} className="gap-2 mt-2">
              <Sparkles className="w-4 h-4" />
              Generate Interventions Now
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

