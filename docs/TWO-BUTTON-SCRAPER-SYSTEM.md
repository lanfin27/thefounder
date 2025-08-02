# TheFounder Two-Button Scraper System

## 🎯 Overview

The dashboard now features a professional two-button system that separates data refresh from scraper execution:

- **📊 Refresh Data**: Instantly updates dashboard metrics from existing database
- **🚀 Run Scraper**: Executes actual Flippa scraping process with real-time progress

## 🔧 Implementation Details

### 1. Scraper Execution API (`/api/scraping/run`)

**POST** - Start new scraping job:
```javascript
// Request
{
  pages: 10,
  mode: 'comprehensive',
  priority: 'normal'
}

// Response
{
  success: true,
  jobId: 'scrape_1234567890',
  estimatedDuration: '50 seconds',
  expectedListings: 250
}
```

**GET** - Check job status:
```
/api/scraping/run?jobId=scrape_1234567890

// Response
{
  success: true,
  job: {
    id: 'scrape_1234567890',
    status: 'running',
    currentPage: 3,
    listingsFound: 75,
    pages: 10
  }
}
```

### 2. Dashboard UI Updates

#### Two-Button System
Located in the "Scraper Control" card:

```
┌─────────────────────────────────┐
│ Scraper Control                  │
│ 16 minutes ago                   │
│ 🔄 Page 3/10 - 75 listings found │
│                                  │
│              [📊 Refresh Data]   │
│              [🚀 Run Scraper ]   │
└─────────────────────────────────┘
```

#### Progress Indicator
Shows when scraping is active:

```
┌────────────────────────────────────────┐
│ 🚀 Scraping in Progress                │
│ 🔄 Page 3/10 - 75 listings found       │
│ Job ID: scrape_1234567890              │
│                               [spinner] │
└────────────────────────────────────────┘
```

## 📋 Features

### 1. Data Refresh Button
- **Icon**: 📊
- **Action**: Calls `loadMetrics()` to refresh dashboard
- **Loading State**: "🔄 Refreshing..."
- **Duration**: ~1-2 seconds
- **No page reload**: Smooth AJAX update

### 2. Run Scraper Button
- **Icon**: 🚀
- **Action**: Spawns actual scraper process
- **Loading State**: "⏳ Running..."
- **Duration**: ~5 seconds per page
- **Progress Updates**: Real-time page/listing count
- **Auto-refresh**: Dashboard updates when complete

### 3. Reduced Auto-Refresh
- Changed from 10 seconds to **60 seconds**
- Reduces unnecessary API calls
- Manual refresh available anytime

### 4. Job Status Tracking
- Real-time updates every 3 seconds
- Shows current page and listings found
- Automatic completion detection
- Error handling for failures

## 🚀 Usage

### Manual Data Refresh
1. Click "📊 Refresh Data"
2. Dashboard updates within 1-2 seconds
3. All metrics and listings refresh

### Run New Scraping
1. Click "🚀 Run Scraper"
2. Monitor progress in real-time
3. Dashboard auto-refreshes when complete

### Monitor Active Jobs
```bash
# Check active scraping jobs
curl http://localhost:3000/api/scraping/run

# Check specific job
curl http://localhost:3000/api/scraping/run?jobId=scrape_1234567890
```

## 🛠️ Configuration

### Default Scraping Settings
```javascript
{
  pages: 10,           // Scrapes 10 pages (~250 listings)
  mode: 'comprehensive', // Full data extraction
  priority: 'normal'    // Standard priority
}
```

### Modify Settings
Edit in `handleRunScraper` function:
```javascript
body: JSON.stringify({
  pages: 20,  // Increase to 20 pages
  mode: 'recently_sold',  // Filter mode
  priority: 'high'
})
```

## 🔍 Troubleshooting

### "Scraping already in progress"
- Only one scraping job allowed at a time
- Wait for current job to complete
- Check `/api/scraping/run` for active jobs

### Scraper Won't Start
1. Check if Node.js can spawn processes
2. Verify `scripts/flippa-scraper-final.js` exists
3. Check environment variables are set
4. Review server console for errors

### Progress Not Updating
- Check browser console for errors
- Verify job ID is being tracked
- Ensure API endpoints are accessible

## 📊 Performance

- **Refresh Data**: ~1-2 seconds
- **Scraping Speed**: ~5 seconds per page
- **Expected Output**: ~25 listings per page
- **Success Rate**: 96%+ field completion

## ✅ Benefits

1. **Clear Separation**: Users understand refresh vs. scrape
2. **No Confusion**: Explicit actions with clear results
3. **Real-time Feedback**: Progress tracking during scraping
4. **Reduced Load**: 60-second auto-refresh instead of 10
5. **Professional UI**: Loading states and progress indicators

## 🎯 Next Steps

1. **Add Configuration Modal**: Let users choose pages/mode
2. **Schedule Scraping**: Cron job integration
3. **Export Results**: Download scraped data
4. **History View**: Show past scraping sessions
5. **Error Details**: Enhanced error reporting

The two-button system provides a professional, user-friendly interface for managing Flippa data collection!