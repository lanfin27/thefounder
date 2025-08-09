# The Founder - Complete System Operation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Core Features](#core-features)
5. [API Reference](#api-reference)
6. [Monitoring System](#monitoring-system)
7. [Database Management](#database-management)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## System Overview

The Founder is an automated Flippa marketplace monitoring system that tracks business listings, analyzes trends, and provides real-time insights into online business sales.

### Key Capabilities
- **Automated Monitoring**: Hourly scans of new Flippa listings
- **Data Analysis**: Track price trends, categories, and business metrics
- **Real-time Dashboard**: Live updates and comprehensive analytics
- **Export Features**: CSV export for further analysis
- **Smart Filtering**: Search and filter by multiple criteria

## Architecture

### Technology Stack
- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Monitoring**: Custom scraping system with fallback modes

### System Components
```
the-founder/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── admin/        # Admin dashboard pages
│   │   └── api/          # API routes
│   ├── lib/              # Core libraries
│   │   ├── monitoring/   # Monitoring system
│   │   └── supabase/     # Database client
│   └── components/       # React components
├── scripts/              # Utility scripts
├── data/                 # Local data storage
└── logs/                 # System logs
```

## Getting Started

### 1. Initial Setup
```bash
# Clone the repository
git clone [repository-url]
cd the-founder

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 2. Database Setup
```bash
# Create Supabase tables
# Run in Supabase SQL editor:
# supabase/migrations/001_initial_schema.sql

# Configure RLS policies
# Run in Supabase SQL editor:
# supabase/migrations/002_configure_rls.sql

# Import baseline data (if available)
node scripts/create-migration-session.js
node scripts/migrate-with-session.js
```

### 3. Start Development Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

## Core Features

### 1. Admin Dashboard (`/admin`)
The main control center showing:
- Total listings count
- Recent activity
- Category breakdown
- Quick actions

### 2. Scraping Status (`/admin/scraping-status-v2`)
Real-time monitoring interface:
- Current system status
- Activity logs
- Manual control buttons
- Performance metrics

**Usage:**
```javascript
// Start monitoring
POST /api/monitoring/scan
{
  "manual": true
}

// Check status
GET /api/monitoring/status
```

### 3. Flippa Listings Browser (`/admin/flippa-listings`)
Browse and search all listings:
- Pagination
- Search by title
- Filter by category
- Sort by price/date
- Export to CSV

### 4. Scraping Control Panel (`/admin/scraping`)
Advanced monitoring controls:
- Enhanced scraping mode
- Incremental monitoring
- Custom parameters
- Schedule configuration

## API Reference

### Dashboard APIs

#### Get Dashboard Stats
```http
GET /api/dashboard/stats
```
Returns comprehensive statistics including:
- Total listings
- Category breakdown
- Price distribution
- Revenue analysis
- Traffic metrics

#### Get Dashboard Charts
```http
GET /api/dashboard/charts
```
Returns chart-ready data:
- Listings by category
- Price distribution
- Trend analysis

#### Get Recent Listings
```http
GET /api/dashboard/listings?limit=10&offset=0
```
Query parameters:
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset
- `search`: Search term
- `category`: Filter by category
- `sortBy`: Sort field
- `sortOrder`: asc/desc

### Monitoring APIs

#### Start Monitoring Scan
```http
POST /api/monitoring/scan
{
  "manual": true
}
```

#### Get Monitoring Status
```http
GET /api/monitoring/status
```

#### Get Scan Progress
```http
GET /api/monitoring/scan/[scanId]/progress
```

### Export API

#### Export Listings to CSV
```http
GET /api/dashboard/export?format=csv
```

## Monitoring System

### Operation Modes

1. **Production Mode** (with FlareSolverr)
   - Real Flippa data scraping
   - Cloudflare bypass capability
   - Requires FlareSolverr running

2. **Standalone Mode** (without dependencies)
   - Direct HTTP requests
   - Limited by Cloudflare protection
   - Good for testing

3. **Mock Mode** (for development)
   - Simulated data
   - No external dependencies
   - Consistent testing

### Configuration
Set monitoring mode in `.env.local`:
```env
MONITORING_MODE=production  # or 'standalone' or 'mock'
```

### Automated Scheduling

#### Windows Task Scheduler
```bash
# Run PowerShell as Administrator
cd C:\Users\KIMJAEHEON\the-founder\scripts
.\setup-task-scheduler.ps1
```

#### Linux/Mac Cron
```bash
# Add to crontab
0 * * * * cd /path/to/the-founder && node scripts/automated-monitoring.js
```

#### Vercel Cron (Production)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/monitoring/cron",
    "schedule": "0 * * * *"
  }]
}
```

## Database Management

### Schema Overview

#### flippa_listings
Primary table for all listings:
- `id`: Unique identifier
- `session_id`: Monitoring session reference
- `url`: Listing URL
- `title`: Business title
- `asking_price`: Listed price
- `monthly_revenue`: Monthly revenue
- `monthly_profit`: Monthly profit
- `category`: Business category
- `created_at`: Timestamp

#### scraping_sessions
Monitoring session tracking:
- `session_id`: Unique session ID
- `status`: Session status
- `total_listings`: Listings found
- `started_at`: Start time
- `completed_at`: End time

#### incremental_changes
Track listing changes:
- `listing_id`: Reference to listing
- `change_type`: Type of change
- `old_value`: Previous value
- `new_value`: Updated value

### Common Queries

```sql
-- Get total listings
SELECT COUNT(*) FROM flippa_listings;

-- Get listings by category
SELECT category, COUNT(*) as count 
FROM flippa_listings 
GROUP BY category 
ORDER BY count DESC;

-- Get recent listings
SELECT * FROM flippa_listings 
ORDER BY created_at DESC 
LIMIT 10;

-- Get price changes
SELECT l.title, c.old_value, c.new_value, c.detected_at
FROM incremental_changes c
JOIN flippa_listings l ON l.id = c.listing_id
WHERE c.field_name = 'asking_price'
ORDER BY c.detected_at DESC;
```

## Troubleshooting

### Common Issues

#### 1. No Data Showing in Dashboard
**Cause**: RLS policies blocking access
**Solution**: 
```sql
-- Check RLS status
SELECT tablename, policies 
FROM pg_tables t
LEFT JOIN LATERAL (
  SELECT array_agg(pol.policyname) as policies
  FROM pg_policies pol
  WHERE pol.tablename = t.tablename
) pol ON true
WHERE schemaname = 'public';

-- Temporarily disable RLS (development only)
ALTER TABLE flippa_listings DISABLE ROW LEVEL SECURITY;
```

#### 2. Monitoring Not Running
**Cause**: Server not running or API error
**Solution**:
```bash
# Check if server is running
curl http://localhost:3000/api/monitoring/status

# Check logs
tail -f logs/monitoring-details.log

# Restart monitoring
node scripts/automated-monitoring.js
```

#### 3. Slow Dashboard Performance
**Cause**: Missing database indexes
**Solution**:
```sql
-- Add indexes
CREATE INDEX idx_listings_created_at ON flippa_listings(created_at DESC);
CREATE INDEX idx_listings_category ON flippa_listings(category);
CREATE INDEX idx_listings_price ON flippa_listings(asking_price);
```

#### 4. API Authentication Errors
**Cause**: Missing or incorrect API keys
**Solution**:
- Verify `.env.local` has correct keys
- Check Supabase dashboard for key validity
- Ensure service role key is used for server-side operations

### Debug Mode

Enable debug logging:
```javascript
// In your API route
console.log('DEBUG:', {
  env: process.env.NODE_ENV,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  timestamp: new Date().toISOString()
});
```

## Maintenance

### Daily Tasks
1. **Check Monitoring Logs**
   ```bash
   tail -f logs/monitoring-details.log
   ```

2. **Verify New Listings**
   - Open dashboard: http://localhost:3000/admin
   - Check "Recent Listings" count
   - Verify categories are updating

### Weekly Tasks
1. **Database Optimization**
   ```sql
   -- Vacuum and analyze
   VACUUM ANALYZE flippa_listings;
   
   -- Check table sizes
   SELECT 
     relname AS table_name,
     pg_size_pretty(pg_total_relation_size(relid)) AS size
   FROM pg_catalog.pg_statio_user_tables
   ORDER BY pg_total_relation_size(relid) DESC;
   ```

2. **Clean Old Logs**
   ```bash
   # Archive logs older than 7 days
   find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
   ```

### Monthly Tasks
1. **Update Dependencies**
   ```bash
   npm update
   npm audit fix
   ```

2. **Backup Database**
   ```bash
   # Use Supabase dashboard or pg_dump
   pg_dump -h [host] -U [user] -d [database] > backup.sql
   ```

3. **Performance Review**
   - Check API response times
   - Review error rates
   - Optimize slow queries

### Monitoring Health Checks

```javascript
// scripts/health-check.js
const checks = [
  { name: 'Database Connection', check: checkDatabase },
  { name: 'API Endpoints', check: checkAPIs },
  { name: 'Monitoring Status', check: checkMonitoring },
  { name: 'Disk Space', check: checkDiskSpace }
];

async function runHealthCheck() {
  for (const { name, check } of checks) {
    const result = await check();
    console.log(`${name}: ${result ? '✅' : '❌'}`);
  }
}
```

## Advanced Configuration

### Custom Monitoring Parameters
```javascript
// Modify monitoring behavior
const monitoringConfig = {
  pages: 10,              // Number of pages to scan
  delayMin: 2,            // Minimum delay between requests
  delayMax: 5,            // Maximum delay
  categories: ['all'],    // Categories to monitor
  priceRange: {
    min: 1000,
    max: 1000000
  }
};
```

### Performance Tuning
```javascript
// Next.js config for production
module.exports = {
  images: {
    domains: ['flippa.com'],
  },
  experimental: {
    serverActions: true,
  },
  // Enable SWC minification
  swcMinify: true,
};
```

### Security Hardening
```javascript
// Middleware for API protection
export function middleware(request) {
  // Rate limiting
  const ip = request.ip || 'unknown';
  if (rateLimiter.isLimited(ip)) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  // API key validation for sensitive endpoints
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
}
```

## Support & Resources

### Documentation
- API Documentation: `/docs/api.md`
- Database Schema: `/supabase/migrations/`
- Component Library: `/docs/components.md`

### Useful Commands
```bash
# Development
npm run dev           # Start dev server
npm run build        # Build for production
npm run lint         # Run linter
npm run type-check   # TypeScript check

# Database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:reset     # Reset database

# Monitoring
npm run monitor:test  # Test monitoring
npm run monitor:prod  # Production monitoring
```

### Getting Help
1. Check logs in `/logs` directory
2. Review error messages in browser console
3. Check Supabase logs in dashboard
4. Search codebase for error messages
5. Review this documentation

---

**Last Updated**: 2025-08-06  
**Version**: 1.0.0  
**Maintained By**: The Founder Development Team