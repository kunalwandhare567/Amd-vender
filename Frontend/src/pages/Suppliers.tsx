import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SupplierTable } from '@/components/suppliers/SupplierTable';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { ReportModal } from '@/components/modals/ReportModal';
import { supplierService } from '@/services/supplierService';
import { Loader2, Plus } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

const Suppliers = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [reportSupplierId, setReportSupplierId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', currentPage, searchQuery, riskFilter, regionFilter],
    queryFn: () => supplierService.getSuppliers({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: searchQuery,
      riskLevel: riskFilter === 'all' ? undefined : riskFilter as any,
      region: regionFilter === 'all' ? undefined : regionFilter,
    }),
  });

  const suppliersList = data?.data?.suppliers || [];
  const totalPages = data?.data?.pagination?.totalPages || 1;
  const totalItems = data?.data?.pagination?.totalItems || 0;

  // Extract unique regions for filter (this might need a separate API call later, but for now hardcode or use data)
  const regions = ['all', 'Bangalore', 'Chennai', 'Delhi', 'Kolkata', 'Mumbai'];

  const handleGenerateReport = (supplierId: string) => {
    setReportSupplierId(supplierId);
  };

  const selectedSupplier = reportSupplierId
    ? suppliersList.find(s => s.supplier_id === reportSupplierId) || null
    : null;

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.header
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Supplier Management</h1>
            <p className="text-muted-foreground">
              View and manage all suppliers in your network.
            </p>
          </div>
          <button
            onClick={() => navigate('/add-supplier')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" /> Add Supplier
          </button>
        </motion.header>

        {/* Filters */}
        <motion.div
          className="card-base p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, ID, or region..."
              />
            </div>

            <div className="flex gap-4">
              <div className="w-40">
                <label htmlFor="risk-filter" className="sr-only">Filter by Risk Level</label>
                <select
                  id="risk-filter"
                  value={riskFilter}
                  onChange={(e) => {
                    setRiskFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input-base"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>

              <div className="w-48">
                <label htmlFor="region-filter" className="sr-only">Filter by Region</label>
                <select
                  id="region-filter"
                  value={regionFilter}
                  onChange={(e) => {
                    setRegionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input-base"
                >
                  <option value="all">All Regions</option>
                  {regions.slice(1).map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Supplier Table */}
        <motion.section
          className="card-base overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="p-4 border-b border-border">
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : `Showing ${suppliersList.length} of ${totalItems} supplier${totalItems !== 1 ? 's' : ''}`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <SupplierTable
              suppliers={suppliersList}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </motion.section>
      </div>

      <ReportModal
        supplier={selectedSupplier}
        isOpen={!!reportSupplierId}
        onClose={() => setReportSupplierId(null)}
      />
    </MainLayout>
  );
};

export default Suppliers;
