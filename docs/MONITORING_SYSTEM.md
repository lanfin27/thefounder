# Flippa Monitoring System Documentation

## Overview
The Flippa Monitoring System provides automated tracking of changes across 5,645+ marketplace listings, with real-time notifications for high-value discoveries.

## Quick Start

### Option 1: Web Interface (Recommended)
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: http://localhost:3000/admin/scraping

3. Click on "Incremental Monitoring" tab

4. Click "Manual Scan" to trigger a monitoring run

### Option 2: Command Line
```bash
# Simple monitoring (no TypeScript)
npm run monitoring

# Direct simulation mode
npm run monitoring:simple

# With TypeScript (if tsx works)
npm run monitoring:tsx
```

### Option 3: Automated Scheduling (Windows)
```bash
# Set up Windows Task Scheduler
npm run monitoring:schedule
```

## Features

### 1. Incremental Change Detection
- Tracks new listings
- Monitors price drops (>20%)
- Detects revenue changes (>$5K)
- Identifies deleted listings
- Tracks category changes

### 2. High-Value Discovery Alerts
- Listings over $100K
- Monthly revenue over $10K
- Trending categories (3+ new listings)

### 3. Real-time Dashboard
- Live scan progress
- Recent changes feed
- Priority notifications
- System status monitoring

## Architecture

### Components
1. **Scanner** (`flippa-scanner.ts`): Extracts listing data using FlareSolverr
2. **Comparison Engine** (`baseline-comparison.ts`): Compares against baseline
3. **Processor** (`listing-processor.ts`): Extracts details for new listings
4. **Monitoring System** (`monitoring-system.ts`): Orchestrates the workflow
5. **Dashboard** (`MonitoringDashboard.tsx`): Real-time UI

### Fallback System
If the main TypeScript system fails, a simplified JavaScript fallback is available:
- Uses mock data for testing
- Accessible via `/api/monitoring/fallback`
- Automatically activated when main API fails

## API Endpoints

### Main APIs
- `GET /api/monitoring/status` - System status
- `POST /api/monitoring/scan` - Trigger scan
- `GET /api/monitoring/changes` - Recent changes
- `GET /api/monitoring/notifications` - Notifications
- `GET /api/monitoring/scan/[scanId]/progress` - Scan progress

### Fallback API
- `GET /api/monitoring/fallback` - Fallback status
- `POST /api/monitoring/fallback` - Fallback scan trigger

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FLARESOLVERR_ENDPOINT=http://localhost:8191/v1
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
```

### Monitoring Settings
- Pages to scan: 5 (default)
- Delay between pages: 60-120 seconds
- Price threshold: $100,000
- Revenue threshold: $10,000
- Price drop threshold: 20%

## Troubleshooting

### Common Issues

1. **"Cannot find module 'tsx'" error**
   - Solution: Use `npm run monitoring` instead
   - Alternative: `npm run monitoring:simple`
   - Pure Node.js: `npm run monitoring:pure`

2. **"Undici compatibility" error**
   - FIXED: System now uses axios and node-html-parser
   - No longer depends on undici or cheerio
   - All APIs have fallback support

3. **"Failed to start scan" error**
   - Ensure Next.js is running: `npm run dev`
   - Check if FlareSolverr is running (optional)
   - Try the fallback API through dashboard

4. **No data showing in dashboard**
   - Fallback system provides mock data
   - Check browser console for errors
   - Verify API endpoints are accessible

### Dependency Changes
- Replaced `cheerio` with `node-html-parser`
- Replaced `undici` with `axios`
- Added pure Node.js fallback with no external dependencies
- All monitoring routes now have error handling and fallbacks

### Testing Commands
```bash
# Test web interface
node scripts/test-monitoring-web.js

# Test direct monitoring
node scripts/run-monitoring.js

# Simple simulation
node scripts/simple-monitoring.js
```

## Database Schema

### Tables
- `flippa_listings` - Main listings table (5,645 records)
- `incremental_changes` - Tracks all changes
- `scan_sessions` - Scan history and status
- `notification_queue` - Pending notifications
- `monitoring_config` - System configuration

## Production Deployment

1. Set up FlareSolverr for Cloudflare bypass
2. Configure environment variables
3. Set up automated scheduling (cron/Task Scheduler)
4. Configure notification webhooks (optional)
5. Monitor system logs for errors

## Support

For issues or questions:
1. Check browser console for errors
2. Review API response in Network tab
3. Check server logs: `logs/monitoring.log`
4. Use fallback mode for testing