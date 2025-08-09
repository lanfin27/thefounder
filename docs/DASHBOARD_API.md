# Dashboard API Documentation

## Overview
The dashboard has been updated to work with the migrated Supabase data containing 5,645+ Flippa listings. All APIs have been optimized for performance with the actual database schema.

## Database Schema
The `flippa_listings` table uses the following columns:
- `id` - Auto-incrementing primary key
- `title` - Listing title
- `url` - Listing URL
- `asking_price` - Asking price in USD
- `monthly_revenue` - Monthly revenue in USD
- `monthly_profit` - Monthly profit in USD
- `category` - Business category
- `description` - Business description
- `age_months` - Business age in months
- `page_views_monthly` - Monthly page views
- `technologies` - Array of technologies used
- `scraped_at` - When the listing was scraped
- `created_at` - Record creation timestamp

## API Endpoints

### 1. Dashboard Statistics
**GET** `/api/dashboard/stats`

Returns comprehensive statistics about the listings dataset.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalListings": 5645,
      "categoriesCount": 42,
      "averageCompletionRate": 85,
      "lastUpdate": "2025-01-05T..."
    },
    "categoryBreakdown": { ... },
    "priceDistribution": { ... },
    "revenueAnalysis": { ... },
    "ageDistribution": { ... },
    "trafficAnalysis": { ... },
    "fieldCompletionRates": { ... }
  }
}
```

### 2. Listings with Search & Filtering
**GET** `/api/dashboard/listings`

Paginated listings with advanced filtering capabilities.

**Query Parameters:**
- `search` - Full-text search on title and description
- `category` - Filter by category
- `priceMin` / `priceMax` - Price range filtering
- `revenueMin` / `revenueMax` - Revenue range filtering
- `ageMin` / `ageMax` - Age range filtering (months)
- `sortBy` - Sort field (price, revenue, age, traffic, created_at)
- `sortOrder` - asc or desc
- `page` - Page number (default: 1)
- `limit` - Results per page (max: 100, default: 20)

**Example:**
```
/api/dashboard/listings?search=ecommerce&category=SaaS&priceMin=10000&page=1&limit=20
```

### 3. Performance Metrics
**GET** `/api/dashboard/metrics`

Real-time performance and quality metrics.

**Query Parameters:**
- `type` - Metric type: overview, performance, quality, realtime

**Response includes:**
- Field completion rates
- Data quality scores
- Recent activity statistics
- Performance indicators

### 4. Chart Data
**GET** `/api/dashboard/charts`

Pre-formatted data for dashboard visualizations.

**Query Parameters:**
- `type` - Chart type: all, category, price, revenue, age, traffic, timeline, profit

**Response includes:**
- Chart.js compatible data format
- Summary statistics
- Trend analysis

### 5. Search API
**GET** `/api/dashboard/search`

Fast autocomplete search with caching.

**Query Parameters:**
- `q` - Search query (min 2 characters)
- `type` - Search scope: all, title, category, description
- `limit` - Max results (default: 10)

**Features:**
- 5-minute result caching
- Relevance scoring
- Category suggestions

### 6. Data Export
**GET** `/api/dashboard/export`

Export filtered data in JSON or CSV format.

**Query Parameters:**
- `format` - Export format: json, csv
- `limit` - Max records (default: 1000, max: 10000)
- All filter parameters from listings endpoint

**Example:**
```
/api/dashboard/export?format=csv&category=SaaS&priceMin=50000
```

## Performance Optimization

### Caching Strategy
- Dashboard stats: 5-minute cache
- Listings: 2-minute cache
- Charts: 10-minute cache
- Search results: 5-minute client-side cache

### Best Practices
1. Use pagination for large datasets
2. Implement debounced search (300ms recommended)
3. Cache static data client-side
4. Use field projections to reduce payload size
5. Batch API calls when possible

### Database Indexes
The following indexes are in place for optimal performance:
- `listing_id` - Unique identifier lookups
- `created_at DESC` - Recent listings
- `asking_price` - Price range queries
- `monthly_revenue` - Revenue filtering
- `category` - Category filtering

## Usage Examples

### React Hook Example
```typescript
import { useState, useEffect } from 'react'

function useDashboardData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [stats, metrics, charts] = await Promise.all([
          fetch('/api/dashboard/stats').then(r => r.json()),
          fetch('/api/dashboard/metrics').then(r => r.json()),
          fetch('/api/dashboard/charts').then(r => r.json())
        ])
        
        setData({ stats, metrics, charts })
      } catch (error) {
        console.error('Dashboard error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  return { data, loading }
}
```

### Filtering Example
```typescript
const params = new URLSearchParams({
  category: 'E-commerce',
  priceMin: '10000',
  priceMax: '100000',
  sortBy: 'revenue',
  sortOrder: 'desc',
  page: '1'
})

const response = await fetch(`/api/dashboard/listings?${params}`)
const { data } = await response.json()
```

## Error Handling
All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

HTTP Status Codes:
- 200: Success
- 400: Bad Request (invalid parameters)
- 500: Internal Server Error

## Rate Limiting
Currently no rate limiting is implemented, but consider adding for production:
- Recommended: 100 requests/minute per IP
- Search endpoint: 30 requests/minute
- Export endpoint: 10 requests/minute