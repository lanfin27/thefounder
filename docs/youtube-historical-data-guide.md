# YouTube Historical Data Collection Guide

## 📋 Overview

This guide explains how to collect historical data for YouTube channels using YouTube Data API v3. Since YouTube API only provides current statistics (not historical snapshots), we reconstruct historical trends by analyzing video upload dates and current view counts.

## 🎯 Strategy

### Problem
- Charts need historical data to show trends
- Currently only have 1 data point (today) → shows as a dot
- Need at least 30-90 days of data for meaningful charts

### Solution
1. **Fetch all videos** from each channel
2. **Group by upload date** to create timeline
3. **Calculate cumulative statistics** from upload date forward
4. **Generate daily records** for youtube_channel_history table

### Result
- Transform single-point chart into trend line
- Enable comparison over time
- Calculate accurate change rates

## 🔧 Setup

### Step 1: Get YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
   - APIs & Services → Library
   - Search "YouTube Data API v3"
   - Click Enable
4. Create API Key
   - APIs & Services → Credentials
   - Create Credentials → API Key
   - Copy the generated key

### Step 2: Add to Environment Variables

Edit `.env.local`:

```bash
# Existing variables...
NEXT_PUBLIC_YT_SUPABASE_URL=https://frytwgfbxmbigrskarpt.supabase.co
YT_SUPABASE_SERVICE_KEY=eyJ...

# 🔥 Add YouTube Data API Key
YOUTUBE_DATA_API_KEY=AIzaSy...your_api_key_here
```

**Important**: Never commit `.env.local` to Git!

### Step 3: Verify Setup

```bash
# Check if environment variables are loaded
cat .env.local | grep YOUTUBE_DATA_API_KEY
```

## 📊 API Quota Management

### Daily Quota: 10,000 units

**Quota Usage Per Channel**:
- Channel statistics: 1 unit
- Uploads playlist ID: 1 unit
- Video IDs (50 per page): 1 unit per page
- Video details (50 per request): 1 unit per batch

**Example** (BLACKPINK with 637 videos):
- Channel info: 1 unit
- Uploads playlist: 1 unit
- Video IDs: 13 units (637 / 50 = 13 pages)
- Video details: 13 units (637 / 50 = 13 batches)
- **Total: ~28 units**

**For 41 Channels** (average 300 videos each):
- Average per channel: ~50 units
- Total: 50 × 41 = **2,050 units**
- Daily limit: 10,000 units
- **✅ Well within limits!**

### If Quota Exceeded

**Option 1: Batch Processing**
```bash
# Process 20 channels per day
# Day 1: Channels 1-20
# Day 2: Channels 21-40
# Day 3: Channel 41
```

**Option 2: Limit Video Count**
```typescript
// Fetch only latest 500 videos instead of all
await youtubeAPI.generateChannelHistory(channelId, 500)
```

**Option 3: Request Quota Increase**
- Go to Google Cloud Console
- Request quota increase
- Usually approved within 24-48 hours

## 🚀 Usage

### One-Time: Generate Historical Data

This command fetches all videos and generates historical data from channel creation until now.

```bash
npm run yt:generate-historical
```

**What it does**:
1. Fetches all active channels from database
2. For each channel:
   - Gets uploads playlist ID
   - Fetches all video IDs (up to 500)
   - Gets detailed stats for each video
   - Groups by upload date
   - Calculates cumulative statistics
   - Saves to youtube_channel_history table
3. Shows progress and summary

**Expected Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  YouTube Industry Historical Data Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  This script will use YouTube Data API quota
   Estimated: 50-100 quota units per channel

📊 Step 1: Fetching active channels...
✅ Found 41 active channels

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 [1/41] BLACKPINK
   Channel ID: UCOmHUn--16B90oW2L6FRR3A
   Category: Y10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[YouTube API] 🚀 Generating history for channel: UCOmHUn--16B90oW2L6FRR3A
[YouTube API] ✅ Uploads playlist ID: UUOmHUn--16B90oW2L6FRR3A
[YouTube API] 📊 Fetched 50 video IDs...
[YouTube API] 📊 Fetched 100 video IDs...
...
[YouTube API] ✅ Found 637 videos
[YouTube API] ✅ Fetched 637 video details
[YouTube API] ✅ Generated 350 daily records

✅ Generated 350 daily records
💾 Saving to database...
✅ Saved 350 records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Successful: 41 channels
❌ Failed: 0 channels
📊 Total records: 8,500
📈 Average records per channel: 207
⏱️  Time elapsed: 15m 30s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Time Estimate**:
- Small channel (50 videos): ~10 seconds
- Medium channel (200 videos): ~30 seconds
- Large channel (500+ videos): ~60 seconds
- **Total for 41 channels: 10-20 minutes**

### Daily: Collect Current Statistics

This command fetches current statistics and adds today's data point.

```bash
npm run yt:collect-history
```

**What it does**:
1. Fetches current stats for all channels from YouTube API
2. Calculates views per video
3. Saves to youtube_channel_history table with today's date

**Expected Output**:
```
═══════════════════════════════════════
  YouTube Daily Data Collector
═══════════════════════════════════════
📅 Date: 2024-10-27

📊 Step 1: Fetching active channels...
✅ Found 41 active channels

📊 Step 2: Collecting current statistics...
[41/41] HYBE LABELS...
✅ Collected 41 channel statistics

📊 Step 3: Saving to database...
✅ Data saved successfully!

📊 Summary:
═══════════════════════════════════════
By Category:
  Y10: 3 channels
  Y01: 5 channels
  ...

Total channels: 41
Date: 2024-10-27
Status: Success ✅
```

**Time Estimate**: 1-2 minutes

### Automate Daily Collection

**Linux/Mac (Cron)**:
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 3 AM)
0 3 * * * cd /path/to/project && npm run yt:collect-history >> /var/log/yt-history.log 2>&1
```

**Windows (Task Scheduler)**:
1. Open Task Scheduler
2. Create Basic Task
3. Name: "YouTube Channel History Collection"
4. Trigger: Daily at 3:00 AM
5. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd C:\path\to\project && npm run yt:collect-history`
6. Save and test

## 📁 File Structure

```
the-founder/
├── lib/
│   └── youtube-api.ts                    ← YouTube API utility
├── scripts/
│   ├── collect-channel-history.ts        ← Daily collection
│   └── generate-historical-data.ts       ← One-time historical generation
├── docs/
│   └── youtube-historical-data-guide.md  ← This file
└── .env.local                             ← Add YOUTUBE_DATA_API_KEY here
```

## 🔍 How It Works

### Data Flow

```
1. YouTube API
   ↓
2. Get all videos from channel
   ↓
3. Group videos by upload date
   ↓
4. Calculate cumulative stats
   Date       Videos  Total Views  Avg Views/Video
   2023-01-15    100   100,000,000      1,000,000
   2023-02-20    105   150,000,000      1,428,571
   2023-03-10    110   180,000,000      1,636,364
   ↓
5. Save to youtube_channel_history table
   ↓
6. Charts display trend lines
```

### Example Calculation

**BLACKPINK Channel**:
- First video: 2016-08-08
- Latest video: 2024-10-20
- Total videos: 637
- Current total views: 108.4B

**Generated History**:
```
Date         Videos  Total Views    Views/Video
2016-08-08       1     5,000,000     5,000,000
2016-08-22       2    12,000,000     6,000,000
2016-11-01       3    25,000,000     8,333,333
...
2024-10-20     637   108,400,000,000 170,172,527
```

## 📈 Chart Transformation

### Before (No Historical Data)
```
영상당 조회수

28.0M  •  (single dot)

─────────────────
    10/27
```

### After (With Historical Data)
```
영상당 조회수

     ╱╲        ╱╲
    ╱  ╲      ╱  ╲     ← Trend line!
   ╱    ╲    ╱    ╲
  ╱      ╲  ╱      ╲
 ╱        ╲╱        ╲
─────────────────────────
1월  4월  7월  10월
```

## ⚠️ Limitations & Considerations

### 1. Not True Historical Data

**What we get**:
- Current view count for each video
- Upload date for each video

**What we don't get**:
- Actual view count on historical dates
- Views gained over time per video

**Impact**:
- Data is cumulative approximation
- Shows growth trend, not exact historical values
- Good enough for trend analysis and comparison

### 2. Deleted/Private Videos

- Private videos not accessible via API
- Deleted videos missing from history
- May cause slight discrepancies with actual channel stats

### 3. API Rate Limits

- Daily quota: 10,000 units
- Enough for ~200 channels
- May need batch processing for larger datasets

## 🐛 Troubleshooting

### Issue 1: "YouTube API Key is required"

**Solution**: Check environment variable

```bash
# Verify .env.local
cat .env.local | grep YOUTUBE_DATA_API_KEY

# Should output:
# YOUTUBE_DATA_API_KEY=AIzaSy...
```

### Issue 2: "Quota exceeded"

**Solution**: Wait until next day or request increase

```bash
# Check your quota usage:
# https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

# Options:
# 1. Wait 24 hours (quota resets daily)
# 2. Request quota increase (usually approved)
# 3. Process fewer channels per run
```

### Issue 3: Charts still show single dot

**Solution**: Generate historical data first

```bash
# 1. Generate historical data
npm run yt:generate-historical

# 2. Wait for completion (10-20 minutes)

# 3. Refresh browser
# http://localhost:3001/youtube-industry/Y10
```

### Issue 4: Some channels failed

**Check logs for specific errors**:
- Channel ID may be incorrect
- Channel may be deleted or private
- API quota may have been exceeded mid-run

**Solution**: Re-run the script for failed channels only

## 📊 Expected Results

After running `npm run yt:generate-historical`:

**Database**:
- youtube_channel_history table populated
- ~8,500 total records
- Average ~200 days per channel

**Charts**:
- ✅ Industry index: Trend line (not single dot)
- ✅ Channel comparison: Multiple trend lines
- ✅ Change rates: Accurate calculations
- ✅ Time ranges: 1m, 3m, 6m, 1y, all working

**Test URL**: `http://localhost:3001/youtube-industry/Y10`

## 🎯 Best Practices

### 1. Run Historical Generation Once

```bash
# Only needed once
npm run yt:generate-historical

# Takes 10-20 minutes
# Generates months/years of data
```

### 2. Automate Daily Collection

```bash
# Set up cron job
# Runs every day at 3 AM
# Takes 1-2 minutes
# Adds today's data point
```

### 3. Monitor API Quota

```bash
# Check quota usage regularly
# https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

# Stay well under 10,000 daily limit
```

### 4. Backup Environment Variables

```bash
# Never commit .env.local to Git
# Keep backup in secure location
# Rotate API keys periodically
```

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review error messages in console
3. Check YouTube API quota in Google Cloud Console
4. Verify environment variables in .env.local

## 🎉 Summary

✅ **Setup**: Add YOUTUBE_DATA_API_KEY to .env.local
✅ **One-Time**: Run `npm run yt:generate-historical`
✅ **Daily**: Run `npm run yt:collect-history` (automate with cron)
✅ **Result**: Beautiful trend charts instead of single-point dots!

**Time Investment**:
- Setup: 5 minutes
- Historical generation: 10-20 minutes (one time)
- Daily collection: 1-2 minutes (automated)

**Value**:
- Complete historical data
- Trend analysis capability
- Accurate change rate calculations
- Professional-looking charts

🚀 **Ready to generate historical data!**
