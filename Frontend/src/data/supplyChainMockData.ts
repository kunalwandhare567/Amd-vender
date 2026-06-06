// Ports
export const ports = [
  { id: 'PORT_LA', name: 'Port of Los Angeles', location: { lat: 33.7361, lng: -118.2626 } },
  { id: 'PORT_HOU', name: 'Port of Houston', location: { lat: 29.7285, lng: -95.0867 } },
  { id: 'PORT_NJ', name: 'Port of New Jersey', location: { lat: 40.6687, lng: -74.1735 } },
];

// Suppliers
export const suppliers = [
  { id: 'SUP1', name: 'UNFI', location: { lat: 40.7357, lng: -74.1724 } },
  { id: 'SUP2', name: 'Maersk', location: { lat: 55.6761, lng: 12.5683 } },
];

// Carriers
export const carriers = [
  { id: 'CARR1', name: 'CMA CGM' },
  { id: 'CARR2', name: 'Maersk Line' },
];

// Distribution Centers (DCs)
export const dcs = [
  { id: 'DC1', name: 'Houston DC', location: { lat: 29.7604, lng: -95.3698 } },
];

// Customers
export const customers = [
  { id: 'CUST1', name: 'Retailer A', location: { lat: 34.0522, lng: -118.2437 } },
  { id: 'CUST2', name: 'Retailer B', location: { lat: 29.4241, lng: -98.4936 } },
];

// Shipments, POs, Routes, SKUs (simplified)
export const shipments = [
  { id: 'SHIP1', port: 'PORT_LA', supplier: 'SUP1', carrier: 'CARR1', dc: 'DC1', customer: 'CUST1', value: 100000, status: 'In Transit', delay: 12 },
  { id: 'SHIP2', port: 'PORT_HOU', supplier: 'SUP2', carrier: 'CARR2', dc: 'DC1', customer: 'CUST2', value: 50000, status: 'Delayed', delay: 36 },
];

export const pos = [
  { id: 'PO1', supplier: 'SUP1', customer: 'CUST1', value: 60000, status: 'Open' },
  { id: 'PO2', supplier: 'SUP2', customer: 'CUST2', value: 40000, status: 'Open' },
];
