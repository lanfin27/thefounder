# Flippa Scraper Scheduling System Setup Guide

## Overview

The scheduling system enables automated Flippa scraping at configurable intervals with comprehensive monitoring, history tracking, and notifications.

## Features Implemented

### 1. Schedule Management UI
- **Location**: `/admin/scraping-status` → Schedule Management tab
- **Features**:
  - Create/edit/delete schedules
  - Toggle schedules on/off
  - Set frequency (15min, 30min, 1hr, 2hr, 6hr, 12hr, 24hr, custom)
  - Configure specific times (e.g., 9 AM, 2 PM, 8 PM)
  - Select days of week
  - Real-time countdown to next scan
  - Visual status indicators

### 2. Backend Scheduling System
- **Simple interval-based scheduler** (Next.js compatible)
- **API Endpoints**:
  - `POST /api/schedule/create` - Create new schedule
  - `PUT /api/schedule/update/[id]` - Update schedule
  - `DELETE /api/schedule/delete/[id]` - Delete schedule
  - `PUT /api/schedule/toggle/[id]` - Enable/disable schedule
  - `GET /api/schedule/list` - List all schedules
  - `GET /api/schedule/history` - Get execution history
  - `GET /api/schedule/export` - Export history (CSV/JSON)
  - `POST /api/schedule/test-notification` - Test notifications

### 3. Database Schema
Three new tables need to be created in Supabase:
- `scraping_schedules` - Stores schedule configurations
- `schedule_executions` - Tracks individual runs
- `notification_queue` - Manages notifications

### 4. Notification System
- **Email notifications** (configurable)
- **Webhook support** (Slack, Discord, custom)
- **Threshold settings** (only notify for high-value listings)
- **Failure notifications**
- **Test notification button**

### 5. Execution History
- **Location**: `/admin/scraping-status` → Execution History tab
- **Features**:
  - Sortable table of past executions
  - Success/failure statistics
  - Duration and performance metrics
  - Export to CSV/JSON
  - Filter by status and date range

## Setup Instructions

### Step 1: Create Database Tables

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `scripts/create-schedules-table.sql`
4. Paste and execute in SQL Editor

### Step 2: Access the Scheduling UI

1. Navigate to `/admin/scraping-status`
2. Click on "Schedule Management" tab
3. Click "Create Schedule" to set up your first automated scan

### Step 3: Configure a Schedule

Example configuration for daily monitoring:
```
Name: Daily Morning Scan
Frequency: Every 24 hours
Specific Times: 09:00
Days: Monday-Friday
Email: your@email.com
Webhook: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
Threshold: $100,000
```

### Step 4: Monitor Execution

- The countdown timer shows time until next scan
- Check "Execution History" tab for past results
- Export history for analysis

## Environment Variables

No additional environment variables needed - uses existing Supabase configuration.

## Troubleshooting

### "Schedule tables not yet created" Error
- Run the SQL script in Supabase dashboard
- Tables must be created before using scheduling features

### Schedules Not Running
- Check that schedule is enabled (green "Active" badge)
- Verify Next.js server is running
- Check browser console for errors

### Notifications Not Sending
- Test with "Test Notification" button first
- Verify webhook URLs are accessible
- Check notification threshold settings

## Future Enhancements

The following features are planned but not yet implemented:
1. Schedule conflict prevention
2. Pause/resume functionality
3. Schedule templates
4. Visual calendar view
5. Analytics dashboard with ROI metrics

## API Usage Examples

### Create a Schedule
```javascript
fetch('/api/schedule/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Hourly Scan',
    frequency: '1hour',
    enabled: true,
    notification_settings: {
      email_enabled: true,
      email_address: 'alerts@example.com',
      threshold_amount: 50000
    }
  })
})
```

### Get Execution History
```javascript
fetch('/api/schedule/history?filter=completed&range=week')
  .then(res => res.json())
  .then(data => {
    console.log(`Success rate: ${data.stats.successRate}%`);
    console.log(`New listings found: ${data.stats.totalNewListings}`);
  });
```

### Export History
```javascript
// Export as CSV
window.location.href = '/api/schedule/export?format=csv&range=month';

// Export as JSON
fetch('/api/schedule/export?format=json&range=week')
  .then(res => res.blob())
  .then(blob => {
    // Handle download
  });
```

## Notes

- Schedules run at fixed intervals (not cron-based) for Next.js compatibility
- All times are in the user's local timezone
- Minimum interval is 15 minutes to avoid rate limiting
- Failed scans automatically retry up to 3 times
- Consecutive failures disable the schedule after 5 attempts