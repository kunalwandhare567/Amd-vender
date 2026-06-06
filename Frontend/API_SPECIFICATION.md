# Supplier Sentinel - API Specification

## SupplierTable Component - Data Requirements

The `SupplierTable` component renders supplier data and requires the following fields:

### Data Structure

```typescript
interface Supplier {
  supplier_id: string;          // Unique identifier (e.g., "SUP001")
  name: string;                 // Supplier company name
  region: string;               // Geographic region (e.g., "North America", "Asia Pacific")
  contact_person: string;       // Contact person name
  email: string;                // Contact email
  overall_score: number;        // Score 0-100 (displayed with color coding)
  risk_level: 'Low' | 'Medium' | 'High';  // Risk badge
  last_summary_date: string;    // ISO date string
  otd_percentage: number;       // On-Time Delivery percentage (0-100)
  defect_rate: number;          // Defect rate percentage (0-100)
  contract_adherence: number;   // Contract adherence percentage (0-100)
  total_spend: number;          // Total spend in USD (displayed as currency)
}
```

### Fields Displayed in Table

The component displays these fields in the table:

1. **Supplier** - Shows `name` (with initials avatar) and `supplier_id`
2. **Region** - Shows `region`
3. **Overall Score** - Shows `overall_score` (color-coded: ≥85 green, ≥70 yellow, <70 red)
4. **Risk Level** - Shows `risk_level` as a badge
5. **OTD %** - Shows `otd_percentage` (color-coded)
6. **Defect Rate** - Shows `defect_rate` (color-coded: >3% red, >2% yellow, ≤2% green)
7. **Spend** - Shows `total_spend` formatted as USD currency
8. **Actions** - Provides view and report generation buttons

---

## Recommended Backend Endpoints

### 1. Get All Suppliers (with pagination & search)

**Endpoint:** `GET /api/suppliers`

**Query Parameters:**
```typescript
{
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 10)
  search?: string;      // Search in name, region, supplier_id
  sortBy?: string;      // Field to sort by
  sortOrder?: 'asc' | 'desc';
  riskLevel?: 'Low' | 'Medium' | 'High';  // Filter by risk level
  region?: string;      // Filter by region
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suppliers": [
      {
        "supplier_id": "SUP001",
        "name": "Alpha Components Ltd.",
        "region": "North America",
        "contact_person": "John Mitchell",
        "email": "j.m****@alpha.com",
        "overall_score": 87,
        "risk_level": "Low",
        "last_summary_date": "2024-12-01T00:00:00Z",
        "otd_percentage": 94.5,
        "defect_rate": 1.2,
        "contract_adherence": 98,
        "total_spend": 2450000
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10
    }
  }
}
```

### 2. Get Single Supplier Details

**Endpoint:** `GET /api/suppliers/:supplierId`

**Response:**
```json
{
  "success": true,
  "data": {
    "supplier_id": "SUP001",
    "name": "Alpha Components Ltd.",
    "region": "North America",
    "contact_person": "John Mitchell",
    "email": "j.mitchell@alpha.com",
    "overall_score": 87,
    "risk_level": "Low",
    "last_summary_date": "2024-12-01T00:00:00Z",
    "otd_percentage": 94.5,
    "defect_rate": 1.2,
    "contract_adherence": 98,
    "total_spend": 2450000
  }
}
```

### 3. Generate Supplier Report (AI-based)

**Endpoint:** `POST /api/suppliers/:supplierId/report`

**Response:**
```json
{
  "success": true,
  "data": {
    "summary_id": "SUM_SUP001_20241206",
    "supplier_id": "SUP001",
    "summary_text": "Alpha Components Ltd. shows low risk profile...",
    "generated_date": "2024-12-06T10:30:00Z",
    "key_insights": [
      "Overall performance score: 87/100",
      "On-time delivery rate: 94.5%"
    ],
    "risk_flags": [
      "No critical risks identified"
    ],
    "data_sources_used": [
      "PurchaseOrders",
      "QualityReports",
      "DeliveryLogs"
    ]
  }
}
```

---

## Database Schema Recommendation

### Suppliers Table
```sql
CREATE TABLE suppliers (
    supplier_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    overall_score DECIMAL(5,2),
    risk_level ENUM('Low', 'Medium', 'High'),
    last_summary_date TIMESTAMP,
    otd_percentage DECIMAL(5,2),
    defect_rate DECIMAL(5,2),
    contract_adherence DECIMAL(5,2),
    total_spend DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_risk_level ON suppliers(risk_level);
CREATE INDEX idx_region ON suppliers(region);
CREATE INDEX idx_overall_score ON suppliers(overall_score);
CREATE INDEX idx_name ON suppliers(name);
```

---

## Frontend Integration

### Example API Service (to replace mock data)

Create `src/services/supplierService.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface GetSuppliersParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  riskLevel?: 'Low' | 'Medium' | 'High';
  region?: string;
}

export const supplierService = {
  // Get all suppliers with filters
  async getSuppliers(params: GetSuppliersParams = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const response = await fetch(`${API_BASE_URL}/suppliers?${queryString}`);
    if (!response.ok) throw new Error('Failed to fetch suppliers');
    return response.json();
  },

  // Get single supplier
  async getSupplier(supplierId: string) {
    const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}`);
    if (!response.ok) throw new Error('Failed to fetch supplier');
    return response.json();
  },

  // Generate report
  async generateReport(supplierId: string) {
    const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/report`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to generate report');
    return response.json();
  },
};
```

### Update Index.tsx to use API

```typescript
import { useQuery } from '@tanstack/react-query';
import { supplierService } from '@/services/supplierService';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['suppliers', searchQuery, currentPage],
    queryFn: () => supplierService.getSuppliers({
      page: currentPage,
      limit: 5,
      search: searchQuery,
    }),
  });

  const suppliers = data?.data?.suppliers || [];
  const totalPages = data?.data?.pagination?.totalPages || 1;

  // ... rest of component
};
```

---

## Color Coding Logic

The component uses these thresholds:

### Overall Score
- **Green (success)**: score ≥ 85
- **Yellow (warning)**: 70 ≤ score < 85
- **Red (destructive)**: score < 70

### OTD Percentage (same as overall score)
- **Green**: ≥ 85%
- **Yellow**: 70-84%
- **Red**: < 70%

### Defect Rate
- **Green (success)**: ≤ 2%
- **Yellow (warning)**: 2-3%
- **Red (destructive)**: > 3%

---

## Notes for Backend Implementation

1. **Calculated Fields**: `overall_score`, `otd_percentage`, and `defect_rate` can be calculated from related tables (purchase_orders, quality_reports, delivery_logs)

2. **Performance**: Add database indexes on frequently filtered/sorted fields

3. **Search**: Implement full-text search on `name`, `region`, and `supplier_id`

4. **Pagination**: Default to 10-20 items per page for performance

5. **Caching**: Consider caching calculated metrics to avoid expensive joins on every request

6. **Real-time Updates**: Use WebSockets or polling if you need real-time risk level updates
