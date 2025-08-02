# Complete Flippa Scraping System

## Overview
This comprehensive scraping system provides automated, incremental data collection from Flippa marketplace with advanced page setup, multi-page navigation, and robust error handling.

## System Components

### 1. Complete Scraper (`scripts/scrape-flippa-complete.js`)
- **Page Setup**: Automatically clears filters, enables "Recently Sold", sets sort to "Most Recent"
- **Multi-Page Navigation**: Scrapes all available pages (up to configured limit)
- **Incremental Updates**: Only saves new listings and updates changed data
- **Progress Monitoring**: Real-time console output of scraping progress

### 2. Database Integration (`src/lib/database/flippa-integration.js`)
- **Deduplication**: Prevents duplicate listings in database
- **Change Detection**: Identifies when listing data has changed
- **Batch Operations**: Efficient bulk insert/update operations
- **Statistics**: Tracks scraping performance and results

### 3. Monitoring Dashboard (`src/app/admin/scraping-status/page.tsx`)
- **Real-time Status**: Shows current scraping progress
- **Statistics**: Total listings, recent additions, sold listings
- **Manual Controls**: Trigger scraping from web interface
- **Activity Log**: View recent scraping activities and errors

### 4. Scheduled Worker (`scripts/worker-flippa-scheduler.js`)
- **Automated Runs**: Daily at 2 AM, Weekly deep scrape on Sundays
- **Error Recovery**: Automatic retry with exponential backoff
- **Health Monitoring**: Alerts if scraping fails for 48+ hours
- **Performance Tracking**: Average run time and success rate

### 5. API Endpoints (`src/app/api/scraping/trigger/route.ts`)
- **Manual Triggering**: Start scraping via API call
- **Job Status**: Check progress of running jobs
- **Queue Management**: View pending and completed jobs

## Usage Guide

### Running Complete Scrape Manually
```bash
# Run the complete scraper
node scripts/scrape-flippa-complete.js
```

### Starting the Scheduled Worker
```bash
# Start the automated scheduler
node scripts/worker-flippa-scheduler.js
```

### Testing the System
```bash
# Run comprehensive tests
node scripts/test-complete-scraping.js
```

### Accessing the Dashboard
1. Start your Next.js development server: `npm run dev`
2. Navigate to: `http://localhost:3000/admin/scraping-status`
3. Use admin token for authentication

## Configuration

### Page Setup Options
```javascript
{
  clearFilters: true,        // Clear all existing filters
  enableRecentlySold: true,  // Enable "Recently Sold" filter
  sortBy: 'most_recent',     // Sort order
  itemsPerPage: 100,         // Items per page
  maxPages: 10              // Maximum pages to scrape
}
```

### Schedule Configuration
```javascript
{
  dailyScrape: '0 2 * * *',    // 2 AM daily
  weeklyScrape: '0 3 * * 0',   // 3 AM Sunday
  retryAttempts: 3,
  retryDelay: 300000           // 5 minutes
}
```

## Data Extraction

### Complete Listing Data
- **Pricing**: Current price, original price, discounts
- **Multiples**: Profit multiple, revenue multiple
- **Business Info**: Type, industry, monetization, age
- **Status**: Asking, sold, or auction
- **Metadata**: Verification status, badges, geography

### Incremental Updates
- Compares new data with existing listings
- Updates only changed fields
- Preserves original scraped date
- Tracks price history

## Error Handling

### Retry Logic
1. Page load failures: Retry up to 3 times
2. Network errors: Exponential backoff
3. Missing elements: Continue with available data
4. Rate limiting: Automatic delays

### Monitoring & Alerts
- Health checks every scrape
- Alert if no successful run in 48 hours
- Error logging with full stack traces
- Performance metrics tracking

## Performance Targets

- **Setup Phase**: < 30 seconds
- **Per Page**: < 2 minutes for 100 listings
- **Database Operations**: < 1 minute
- **Total Runtime**: Efficiently handle 500+ listings

## Troubleshooting

### Common Issues

1. **Page Setup Fails**
   - Check if Flippa's UI has changed
   - Verify selectors in browser console
   - Increase wait times

2. **No Listings Found**
   - Verify filters are correctly applied
   - Check if listings are loading
   - Inspect network requests

3. **Database Errors**
   - Check Supabase connection
   - Verify table schema
   - Review error logs

### Debug Mode
Set `headless: false` in scraper configuration to see browser actions.

## API Reference

### Trigger Scraping
```bash
POST /api/scraping/trigger
Headers: { "x-admin-token": "your-token" }
Body: {
  "type": "complete",  // or "quick", "incremental"
  "options": {
    "maxPages": 10
  }
}
```

### Check Job Status
```bash
GET /api/scraping/trigger?jobId=123
Headers: { "x-admin-token": "your-token" }
```

## Database Schema Requirements

Ensure your `flippa_listings` table includes:
- Basic fields: listing_id, title, url, asking_price
- Multiples: profit_multiple, revenue_multiple
- Metadata: is_verified, raw_data (JSON)
- Timestamps: scraped_at, last_updated

## Next Steps

1. **Production Deployment**
   - Set `headless: true` for browsers
   - Configure proper Redis instance
   - Set up monitoring alerts

2. **Enhancements**
   - Add more data points
   - Implement data validation
   - Create data export features

3. **Analytics**
   - Build trending analysis
   - Create price prediction models
   - Generate market reports