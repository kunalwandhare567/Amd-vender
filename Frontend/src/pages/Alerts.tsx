import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AlertCard } from '@/components/alerts/AlertCard';
import { SearchInput } from '@/components/common/SearchInput';
import { Alert } from '@/data/mockData';
import { supplierService } from '@/services/supplierService';
import { ContactModal } from '@/components/modals/ContactModal';

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<{ supplier_id: string; name: string; phone?: string } | null>(null);
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await supplierService.getAlerts();
        if (response.success) {
          setAlerts(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = alert.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [alerts, searchQuery, statusFilter, severityFilter]);

  const handleNotify = (alert: Alert) => {
    setSelectedSupplier({
      supplier_id: alert.supplier_id,
      name: alert.supplier_name,
    });
    
    const subject = `[Alert Notice] ${alert.type} Alert: ${alert.supplier_name}`;
    const body = `Dear ${alert.supplier_name} Team,\n\nWe are contacting you regarding an alert flagged on our system:\n\n- Alert Type: ${alert.type}\n- Severity: ${alert.severity}\n- Detail: ${alert.message}\n- Logged Time: ${new Date(alert.timestamp).toLocaleString()}\n\nPlease review this issue immediately and reply with your plan of action to resolve it.\n\nBest regards,\nVendorVerse Procurement Team`;
    
    setNotifySubject(subject);
    setNotifyMessage(body);
    setShowContactModal(true);
  };

  const handleReview = (alertId: string) => {
    // In a real app, this would be an API call
    console.log('Marking as reviewed:', alertId);
    setAlerts(prev => prev.map(alert =>
      alert.alert_id === alertId ? { ...alert, status: 'Reviewed' } : alert
    ));
  };

  const handleResolve = (alertId: string) => {
    // In a real app, this would be an API call
    console.log('Marking as resolved:', alertId);
    setAlerts(prev => prev.map(alert =>
      alert.alert_id === alertId ? { ...alert, status: 'Resolved' } : alert
    ));
  };

  const alertCounts = useMemo(() => ({
    total: alerts.length,
    new: alerts.filter(a => a.status === 'New').length,
    reviewed: alerts.filter(a => a.status === 'Reviewed').length,
    resolved: alerts.filter(a => a.status === 'Resolved').length,
    critical: alerts.filter(a => a.severity === 'Critical' && a.status !== 'Resolved').length,
  }), [alerts]);

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Alerts & Notifications</h1>
          <p className="text-muted-foreground">
            Monitor and respond to supplier performance alerts.
          </p>
        </motion.header>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
              }
            }
          }}
        >
          <motion.div
            className="card-base p-4"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <p className="text-2xl font-bold text-foreground">{alertCounts.total}</p>
            <p className="text-sm text-muted-foreground">Total Alerts</p>
          </motion.div>
          <motion.div
            className="card-base p-4 border-l-4 border-l-primary"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <p className="text-2xl font-bold text-primary">{alertCounts.new}</p>
            <p className="text-sm text-muted-foreground">New</p>
          </motion.div>
          <motion.div
            className="card-base p-4 border-l-4 border-l-warning"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <p className="text-2xl font-bold text-warning">{alertCounts.reviewed}</p>
            <p className="text-sm text-muted-foreground">Under Review</p>
          </motion.div>
          <motion.div
            className="card-base p-4 border-l-4 border-l-success"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <p className="text-2xl font-bold text-success">{alertCounts.resolved}</p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </motion.div>
          <motion.div
            className="card-base p-4 border-l-4 border-l-destructive"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <p className="text-2xl font-bold text-destructive">{alertCounts.critical}</p>
            <p className="text-sm text-muted-foreground">Critical Active</p>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div
          className="card-base p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search alerts..."
              />
            </div>

            <div className="flex gap-4">
              <div className="w-36">
                <label htmlFor="status-filter" className="sr-only">Filter by Status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-base"
                >
                  <option value="all">All Status</option>
                  <option value="New">New</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="w-36">
                <label htmlFor="severity-filter" className="sr-only">Filter by Severity</label>
                <select
                  id="severity-filter"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="input-base"
                >
                  <option value="all">All Severity</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Alerts List */}
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
                delayChildren: 0.7
              }
            }
          }}
        >
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <motion.div
              className="card-base p-12 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-foreground mb-1">No alerts found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
            </motion.div>
          ) : (
            filteredAlerts.map((alert) => (
              <motion.div
                key={alert.alert_id}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 }
                }}
              >
                <AlertCard
                  alert={alert}
                  onReview={handleReview}
                  onResolve={handleResolve}
                  onNotify={handleNotify}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      <ContactModal
        supplier={selectedSupplier}
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        initialSubject={notifySubject}
        initialMessage={notifyMessage}
      />
    </MainLayout>
  );
};

export default Alerts;
