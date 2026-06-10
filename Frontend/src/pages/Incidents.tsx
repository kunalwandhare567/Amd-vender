import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

interface IncidentRecord {
  id: string;
  type: string;
  location: string;
  severity: string;
  startTime: string;
  description: string;
  affectedEntities: string[];
  status: string;
  source: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchIncidents() {
      setLoading(true);
      try {
        // First try to fetch existing incidents from DB
        const response = await api.get('/incidents');
        if (response.data && response.data.length > 0) {
          setIncidents(response.data);
        } else {
          // If none exist, call the generation endpoint to populate them
          const genResponse = await api.post('/incidents/generate');
          setIncidents(genResponse.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch incidents", e);
        setIncidents([]);
      }
      setLoading(false);
    }
    fetchIncidents();
  }, []);

  return (
    <MainLayout>
      <motion.div
        className="p-6 space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h2
          className="text-xl font-semibold text-foreground mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Incident Detection & Ingestion
        </motion.h2>
        <motion.div
          className="overflow-x-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {loading ? (
            <motion.div
              className="text-center text-muted-foreground py-8"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading incidents from LLM...
            </motion.div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Status</TableHead>

                  <TableHead>Affected Entities</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No incidents found.</TableCell>
                  </TableRow>
                ) : (
                  incidents.map((inc, idx) => (
                    <motion.tr
                      key={inc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{inc.type}</TableCell>
                      <TableCell>{inc.location}</TableCell>
                      <TableCell>{inc.severity}</TableCell>
                      <TableCell>{new Date(inc.startTime || inc.start_time).toLocaleString()}</TableCell>
                      <TableCell>{inc.status}</TableCell>
                      <TableCell>
                        {Array.isArray(inc.affectedEntities) 
                          ? inc.affectedEntities.join(', ') 
                          : inc.affected_supplier_id || 'All Entities'}
                      </TableCell>
                      <TableCell>{inc.description}</TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}
