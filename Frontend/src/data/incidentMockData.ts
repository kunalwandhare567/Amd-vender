export interface Incident {
  id: string;
  type: string;
  location: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  startTime: string;
  description: string;
  affectedEntities: string[];
  status: 'Active' | 'Resolved' | 'Monitoring';
  source: 'API' | 'News' | 'Manual';
}

export const incidentMockData: Incident[] = [
  {
    id: 'INC001',
    type: 'Port Closure',
    location: 'Los Angeles, CA',
    severity: 'High',
    startTime: '2025-12-01T08:00:00Z',
    description: 'Port of Los Angeles closed due to labor strike.',
    affectedEntities: ['Port of LA', 'Maersk', 'CMA CGM'],
    status: 'Active',
    source: 'News',
  },
  {
    id: 'INC002',
    type: 'Cyber Incident',
    location: 'New Jersey',
    severity: 'Critical',
    startTime: '2025-12-03T14:30:00Z',
    description: 'UNFI supplier cyberattack impacting order processing.',
    affectedEntities: ['UNFI', 'Retailers'],
    status: 'Active',
    source: 'API',
  },
  {
    id: 'INC003',
    type: 'Labor Strike',
    location: 'Houston, TX',
    severity: 'Medium',
    startTime: '2025-11-28T06:00:00Z',
    description: 'ILA East/Gulf Coast port strike ongoing.',
    affectedEntities: ['Port of Houston', 'Logistics Providers'],
    status: 'Monitoring',
    source: 'Manual',
  }
];
