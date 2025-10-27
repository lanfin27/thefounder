# YouTube API Quota Management System

## Overview

This system efficiently manages YouTube Data API v3 quota to stay within the free tier limit (10,000 units/day) while keeping channel data fresh and accurate.

## Strategy

### Daily Quota Limit
- **Total Daily Quota**: 10,000 units
- **Safety Buffer**: 1,000 units
- **Usable Quota**: 9,000 units
- **Daily Updates**: ~30 channels (60-90 units)

### Priority-Based Updates
Instead of updating all channels daily, we use a smart priority system:

1. **Top channel per category** (15 channels)
   - Highest subscriber count in each Y-code category
   - Ensures category leaders are always fresh

2. **Trending channels** (5 channels)
   - Channels with daily change rate >5%
   - Captures fast-moving trends

3. **Stale channels** (10 channels)
   - Not updated in 7+ days
   - Prevents data from becoming too old

### Priority Scoring
Each channel gets a priority score (0-100):
- **Subscriber count** (0-40 points)
  - >10M: 40 pts
  - >5M: 30 pts
  - >1M: 20 pts
  - >500K: 10 pts
- **Days since update** (0-30 points)
  - 3 points per day, max 30
- **Change rate** (0-30 points)
  - 2 points per % change, max 30

## API Quota Costs

| Operation | Cost per Call |
|-----------|--------------|
| channels.list | 1 unit |
| videos.list | 1 unit |
| playlistItems.list | 1 unit |
| search.list | 100 units (❌ avoid!) |

## Files Structure

```
src/
├── lib/
│   └── youtube-api/
│       ├── quota-manager.ts       # Quota tracking & limits
│       ├── priority-updater.ts    # Channel priority scoring
│       └── batch-processor.ts     # Efficient batch updates
├── app/
│   └── api/
│       ├── cron/
│       │   └── youtube-smart-update/
│       │       └── route.ts       # Daily cron job
│       └── youtube-industry/
│           └── quota/
│               └── route.ts       # Quota monitoring API

scripts/
├── smart-update.ts                # Manual smart update
├── check-quota.ts                 # Check quota status
└── update-priority-channels.ts    # Preview priorities

supabase/
└── migrations/
    └── youtube_quota_tables.sql   # Database schema
```

## Database Tables

### quota_usage
Tracks daily API quota usage:
```sql
- id: UUID (primary key)
- date: DATE (unique, current date)
- used: INTEGER (units consumed)
- operations: JSONB (operation log)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### channel_priorities
Stores priority scores:
```sql
- channel_id: TEXT (primary key, FK to youtube_channels)
- priority_score: INTEGER (0-100)
- update_frequency: TEXT (daily/weekly/monthly)
- last_calculated: TIMESTAMP
```

## Usage

### 1. Setup Database Tables

Run in Supabase SQL Editor:
```bash
# Execute the SQL file
cat supabase/migrations/youtube_quota_tables.sql
# Then copy/paste into Supabase SQL Editor
```

### 2. Check Quota Status

```bash
npm run yt:quota-check
```

Output:
```
📊 Quota Usage:
   Used: 120 units
   Remaining: 8880 units
   Percentage: 1.33%

✅ Status: SAFE

💡 Recommendations:
   ✓ Quota usage is low. Can safely perform bulk updates.
```

### 3. Preview Priority Channels

```bash
npm run yt:update-priority
```

Shows which channels will be updated without actually updating them.

### 4. Run Smart Update

```bash
npm run yt:smart-update
```

Updates ~30 high-priority channels.

### 5. Automated Daily Updates

The cron job runs automatically at 3 AM UTC daily:
- URL: `/api/cron/youtube-smart-update`
- Schedule: `0 3 * * *` (Vercel Cron)
- Max duration: 60 seconds

## API Endpoints

### GET /api/youtube-industry/quota

Get current quota status:
```json
{
  "date": "2025-01-20",
  "used": 120,
  "remaining": 8880,
  "percentage": 1.33,
  "status": "safe",
  "recommendations": [
    {
      "level": "safe",
      "message": "Quota usage is low..."
    }
  ],
  "operations": {
    "total_count": 15,
    "breakdown": {
      "channels_list": 60,
      "videos_list": 60
    }
  }
}
```

### POST /api/youtube-industry/quota

Reset quota (admin only):
```bash
curl -X POST http://localhost:3000/api/youtube-industry/quota \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### GET/POST /api/cron/youtube-smart-update

Trigger smart update (cron secret required):
```bash
curl http://localhost:3000/api/cron/youtube-smart-update \
  -H "Authorization: Bearer YOUR_YT_CRON_SECRET"
```

## Monitoring

### Quota Status Levels

| Usage | Status | Action |
|-------|--------|--------|
| <40% | 🟢 Safe | Can do bulk updates |
| 40-60% | 🟡 Normal | Priority updates only |
| 60-80% | 🟠 Warning | High-priority only |
| 80-90% | 🔴 Critical | Emergency only |
| >90% | 🛑 Stop | No updates |

### Operation Logging

Every API call is logged:
```typescript
{
  type: "channels_list",
  count: 50,           // number of channels
  cost: 50,            // quota units
  timestamp: "2025-01-20T03:05:00Z"
}
```

## Best Practices

### ✅ Do's
- Check quota before running manual updates
- Use priority-based updates
- Monitor quota status regularly
- Let cron jobs handle daily updates
- Use batch processing (50 channels/request)

### ❌ Don'ts
- Don't use search.list API (100 units each!)
- Don't update all channels daily
- Don't exceed 80% quota usage
- Don't run manual updates during cron job hours
- Don't bypass quota checks

## Troubleshooting

### Quota Exceeded
```bash
Error: Insufficient quota. Required: 100, Remaining: 50
```
**Solution**: Wait until next day (quota resets at midnight PT)

### No Channels Updated
```bash
[SmartUpdate] No channels found to update.
```
**Solution**: Run `npm run yt:import-data` first

### High Quota Usage
```bash
⚠️ Quota usage too high (>80%)
```
**Solution**:
1. Stop all manual updates
2. Wait for quota reset
3. Reduce daily update limit

## Quota Reset Schedule

YouTube API quota resets at:
- **Midnight Pacific Time (PT)**
- **08:00 UTC (winter)**
- **07:00 UTC (summer, PDT)**

Our cron runs at **03:00 UTC** to ensure fresh quota.

## Performance Metrics

### Typical Update Cost
- 30 channels × 2 units average = **60 units**
- Leaves 8,940 units for manual updates/emergencies

### Channel Coverage
With 30 updates/day:
- All categories covered daily (15 top channels)
- Trending channels captured quickly
- Full database refresh every 2-3 weeks

### Quota Efficiency
- **Before**: 3,000 units/day (all channels)
- **After**: 60 units/day (smart selection)
- **Savings**: 98% reduction

## Future Enhancements

1. **Adaptive scheduling**
   - Increase updates for trending categories
   - Reduce updates for stable categories

2. **Machine learning predictions**
   - Predict which channels will change significantly
   - Update proactively

3. **User-triggered updates**
   - Allow users to request specific channel updates
   - Queue system with quota awareness

4. **Historical analysis**
   - Track quota usage patterns
   - Optimize update schedules

## Support

For issues or questions:
1. Check quota status: `npm run yt:quota-check`
2. Review logs in Supabase `quota_usage` table
3. Check Vercel cron logs for automated runs
4. Monitor `/api/youtube-industry/quota` endpoint

## License

Part of The Founder project - Internal documentation
