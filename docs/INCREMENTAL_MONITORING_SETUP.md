# Incremental Monitoring System Setup Guide

## Overview

The comprehensive incremental monitoring system for Flippa tracks changes across 5,635 baseline listings with all 31 critical fields.

## Setup Instructions

### 1. Database Setup

First, run the enhanced schema SQL script in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `scripts/create-enhanced-flippa-schema.sql`
5. Run the query

The script creates:
- `flippa_listings_enhanced` table with all 31 monitored fields
- `flippa_change_log` table for tracking changes
- `flippa_monitoring_stats` table for statistics
- Necessary indexes and views
- RLS policies for security

### 2. Migrate Baseline Data

After creating the schema, run the migration script:

```bash
cd the-founder
node scripts/migrate-to-enhanced-schema.js
```

This will:
- Load 5,635 records from the Excel baseline
- Map all 31 fields correctly
- Populate the enhanced table
- Verify the migration

### 3. Access the Dashboard

Navigate to: http://localhost:3000/admin/scraping-status

Then click on the "Incremental Monitoring" tab.

## Features

### Smart Change Detection

The system detects:
- **NEW**: Listings that appear for the first time
- **MODIFIED**: Listings with changed fields (price, status, etc.)
- **DELETED**: Listings no longer found on Flippa

### Change Scoring

Each change is assigned a score (0-100) based on:
- Type of change (new: 50, deleted: 30, modified: 20 base)
- Price changes (up to +40 for >50% change)
- Status changes (+20, +10 extra if sold)
- Value thresholds (higher prices = higher scores)

### Monitored Fields (31 Total)

1. **Basic Info**: id, title, property_name, summary
2. **Categories**: category, property_type, primary_platform
3. **Location**: country_name, currency_label
4. **Pricing**: price, multiple, revenue_multiple
5. **Metrics**: revenue_average, profit_average
6. **Key Data**: 5 pairs of labels/values (key_data_label_0-4, key_data_value_0-4)
7. **Dates**: end_at, established_at, formatted_age_in_years
8. **Status**: status, sale_method, sale_method_title, monetization
9. **URL**: listing_url

### Dashboard Features

1. **Statistics Overview**
   - Total changes by type
   - High-value change alerts
   - Period-based filtering

2. **Advanced Filtering**
   - By change type (new/modified/deleted)
   - By minimum score threshold
   - By time period (1-90 days)
   - Search by title or ID

3. **Change Details View**
   - Side-by-side field comparisons
   - Full listing data
   - Change timestamps
   - Calculated scores

4. **Incremental Scanning**
   - Manual trigger button
   - Configurable page limits
   - Rate limiting (1-3 seconds between requests)
   - Progress tracking

## API Endpoints

### Start Incremental Scan
```
POST /api/monitoring/incremental
{
  "maxPages": 5,
  "checkModified": true,
  "notifyHighValue": true
}
```

### Get Recent Changes
```
GET /api/monitoring/changes?type=new&minScore=60&days=7&limit=50
```

## Performance Optimizations

1. **Batch Processing**: Processes listings in batches of 100
2. **Smart Detection**: Quick ID comparison before detailed checks
3. **Rate Limiting**: Configurable delays between requests
4. **Caching**: Baseline data loaded once per scan
5. **Indexes**: Optimized queries with proper indexes

## Troubleshooting

### "Enhanced table does not exist"
Run the SQL script in Supabase first (step 1 above)

### Excel file not found
Ensure `dataset_flippascraperapi_20250802_051204877.xlsx` is in the project root

### Slow performance
- Reduce `maxPages` parameter
- Increase rate limiting delays
- Check Supabase connection

## Next Steps

After setup:
1. Run initial incremental scan
2. Review detected changes
3. Set up scheduled scans
4. Configure notifications for high-value changes
5. Monitor system performance

## Architecture

```
Flippa Website
     ↓
Smart Scanner (extracts 31 fields)
     ↓
Change Detection (compares with baseline)
     ↓
Supabase Database (stores changes)
     ↓
Dashboard UI (displays & filters)
```

The system is designed for:
- Minimal API calls (incremental only)
- Maximum data retention (full history)
- Quick change detection (ID-based first pass)
- Comprehensive tracking (all 31 fields)