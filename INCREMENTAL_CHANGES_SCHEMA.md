# Incremental Changes Table Schema Documentation

## Overview

The `incremental_changes` table tracks all changes to Flippa listings including new listings, price updates, status changes, and deletions. This provides a complete audit trail of all modifications detected during scraping.

## Table Schema

```sql
CREATE TABLE incremental_changes (
  change_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id VARCHAR(255) NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scan_id VARCHAR(255),
  listing_url TEXT,
  listing_title TEXT
);
```

## Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `change_id` | UUID | Unique identifier for each change record |
| `listing_id` | VARCHAR(255) | ID of the listing that changed |
| `change_type` | VARCHAR(50) | Type of change (see valid values below) |
| `field_name` | VARCHAR(100) | Specific field that changed (e.g., 'asking_price') |
| `old_value` | TEXT | Previous value stored as string |
| `new_value` | TEXT | New value stored as string |
| `detected_at` | TIMESTAMP | When the change was detected |
| `created_at` | TIMESTAMP | When this record was created |
| `scan_id` | VARCHAR(255) | ID of the scan that detected this change |
| `listing_url` | TEXT | URL of the listing |
| `listing_title` | TEXT | Title of the listing at time of change |

## Valid Change Types

- `new_listing` - A new listing was discovered
- `price_update` - The asking price changed
- `status_change` - The listing status changed
- `deleted` - The listing was removed
- `updated` - Other fields were updated

## Indexes

```sql
-- Primary indexes for performance
CREATE INDEX idx_incremental_changes_listing_id ON incremental_changes(listing_id);
CREATE INDEX idx_incremental_changes_detected_at ON incremental_changes(detected_at);
CREATE INDEX idx_incremental_changes_change_type ON incremental_changes(change_type);
CREATE INDEX idx_incremental_changes_created_at ON incremental_changes(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_incremental_changes_listing_detected 
  ON incremental_changes(listing_id, detected_at DESC);
```

## Row Level Security

```sql
-- Enable RLS
ALTER TABLE incremental_changes ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to incremental_changes" 
  ON incremental_changes FOR SELECT 
  USING (true);

-- Service role has full access
CREATE POLICY "Service role has full access to incremental_changes" 
  ON incremental_changes FOR ALL 
  USING (true);
```

## Setup Instructions

### Option 1: Create New Table
If the table doesn't exist, run the full schema:
```bash
# Run in Supabase SQL Editor
scripts/create-incremental-changes-table.sql
```

### Option 2: Alter Existing Table
If the table exists but is missing columns:
```bash
# Run in Supabase SQL Editor
scripts/alter-incremental-changes-table.sql
```

## Usage Examples

### Insert a New Listing Change
```javascript
const change = {
  listing_id: 'listing_123',
  change_type: 'new_listing',
  field_name: 'listing',
  old_value: null,
  new_value: JSON.stringify({
    title: 'SaaS Business',
    price: 50000,
    category: 'SaaS'
  }),
  scan_id: 'scan_12345',
  listing_url: 'https://flippa.com/listings/123',
  listing_title: 'SaaS Business'
};

await supabase.from('incremental_changes').insert(change);
```

### Insert a Price Change
```javascript
const priceChange = {
  listing_id: 'listing_123',
  change_type: 'price_update',
  field_name: 'asking_price',
  old_value: '50000',
  new_value: '45000',
  scan_id: 'scan_12346',
  listing_url: 'https://flippa.com/listings/123',
  listing_title: 'SaaS Business'
};

await supabase.from('incremental_changes').insert(priceChange);
```

### Query Recent Changes
```javascript
// Get all changes in last 7 days
const { data } = await supabase
  .from('incremental_changes')
  .select('*')
  .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .order('detected_at', { ascending: false });

// Get price changes only
const { data: priceChanges } = await supabase
  .from('incremental_changes')
  .select('*')
  .eq('change_type', 'price_update')
  .order('detected_at', { ascending: false });

// Get history for specific listing
const { data: history } = await supabase
  .from('incremental_changes')
  .select('*')
  .eq('listing_id', 'listing_123')
  .order('detected_at', { ascending: false });
```

## JSON Backup

If database saves fail, the system automatically creates JSON backups in:
```
backups/incremental_changes/
├── new_listings_2025-08-06T10-30-00-000Z.json
├── price_changes_2025-08-06T10-31-00-000Z.json
└── ...
```

## Monitoring

Use the provided views to monitor changes:
- `recent_changes` - Changes in last 7 days with current listing data
- `change_statistics` - Daily summary of changes by type

## Troubleshooting

### "Column not found" Error
Run the ALTER TABLE script to add missing columns:
```sql
scripts/alter-incremental-changes-table.sql
```

### Cannot Insert Records
1. Check if table exists
2. Verify all columns are present
3. Ensure service role key is used for inserts
4. Check RLS policies are properly configured

### Performance Issues
1. Verify all indexes are created
2. Consider partitioning by `detected_at` for large datasets
3. Archive old records periodically