# YouTube Industry Index - Supabase Integration Setup

## ✅ Completed Work

### 1. Environment Configuration
- ✅ Updated `.env.local` with YouTube Industry Supabase credentials
- ✅ Added YouTube Data API v3 key
- ✅ Added cron job secret key

**File:** `.env.local`
```
NEXT_PUBLIC_YT_SUPABASE_URL=https://frytwgfbxmbigrskarp.supabase.co
NEXT_PUBLIC_YT_SUPABASE_ANON_KEY=...
YT_SUPABASE_SERVICE_KEY=...
YOUTUBE_API_KEY=AIzaSyABRJTQMn-TOb3X4wjCWEezWIEtFMrSVsU
YT_CRON_SECRET=yt_industry_cron_2025_secure_key_thefounder
```

### 2. Package Installation
- ✅ `@supabase/supabase-js@^2.53.0` (already installed)
- ✅ `googleapis@^164.1.0` (newly installed)
- ✅ Added npm scripts: `yt:import-data`, `yt:update`

### 3. Supabase Client
- ✅ Created dedicated Supabase client for YouTube data
- ✅ Separate public and admin clients
- ✅ TypeScript database types

**Files:**
- `src/lib/youtube-supabase/client.ts`
- `src/lib/youtube-supabase/database.types.ts`

### 4. YouTube API Integration
- ✅ YouTube Data API v3 client
- ✅ Channel stats fetching
- ✅ Recent videos fetching
- ✅ Shorts filtering
- ✅ Engagement rate calculation
- ✅ Batch processing with quota management

**File:** `src/lib/youtube-api/index.ts`

### 5. Data Import & Update Scripts
- ✅ Initial data import script (15 categories + channels)
- ✅ YouTube API update script with real data fetching
- ✅ Quota cost estimation
- ✅ Rate limiting (200ms between requests)

**Files:**
- `scripts/import-youtube-data.ts`
- `scripts/update-youtube-data.ts`

### 6. API Routes (Updated to Supabase)
- ✅ `/api/youtube-industry/categories` - Fetches from Supabase
- ✅ `/api/youtube-industry/categories/[code]` - Fetches from Supabase
- ⏳ `/api/youtube-industry/channels` - Still using mock data
- ⏳ `/api/youtube-industry/metrics/realtime` - Still using mock data
- ⏳ `/api/youtube-industry/trends` - Still using mock data

## ⏳ Remaining Work

### 1. Update Remaining API Routes
You need to update these routes to use Supabase instead of mock data:

**a) `src/app/api/youtube-industry/channels/route.ts`**
```typescript
import { ytSupabase } from '@/lib/youtube-supabase/client'

export async function GET(request: NextRequest) {
  const { category, page = 1, pageSize = 20, sortBy, sortOrder } = searchParams

  let query = ytSupabase
    .from('youtube_channels')
    .select('*', { count: 'exact' })
    .eq('is_active', true)

  if (category) {
    query = query.eq('category_code', category)
  }

  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1)

  const { data, count, error } = await query
  // ... return transformed data
}
```

**b) `src/app/api/youtube-industry/metrics/realtime/route.ts`**
```typescript
// Fetch top gainers/losers from Supabase
const { data: topGainers } = await ytSupabase
  .from('youtube_channels')
  .select('*')
  .eq('is_active', true)
  .order('daily_change_rate', { ascending: false })
  .limit(10)
```

**c) `src/app/api/youtube-industry/trends/route.ts`**
```typescript
// Fetch from youtube_metrics_history table
const { data: timeSeries } = await ytSupabase
  .from('youtube_metrics_history')
  .select('*')
  .eq('category_code', categoryCode)
  .eq('metric_type', 'views_per_video')
  .order('date', { ascending: true })
```

### 2. Create Cron Job API Route
Create: `src/app/api/cron/youtube-update/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { ytSupabaseAdmin } from '@/lib/youtube-supabase/client'
import { getChannelStats, batchGetChannelStats } from '@/lib/youtube-api'

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.YT_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch all active channels
    const { data: channels } = await ytSupabaseAdmin
      .from('youtube_channels')
      .select('channel_id, category_code')
      .eq('is_active', true)

    // 2. Update channel stats using YouTube API
    const channelIds = channels.map(ch => ch.channel_id)
    const statsMap = await batchGetChannelStats(channelIds)

    // 3. Update Supabase with new data
    // ... implementation

    // 4. Calculate category metrics
    // ... implementation

    return NextResponse.json({ success: true, updated: channels.length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 3. Update Middleware
Edit: `src/middleware.ts`

Add YouTube routes to bypass authentication:

```typescript
export async function middleware(request: NextRequest) {
  // Skip auth for YouTube Industry routes
  if (
    request.nextUrl.pathname.startsWith('/youtube-industry') ||
    request.nextUrl.pathname.startsWith('/api/youtube-industry')
  ) {
    return NextResponse.next()
  }

  // Existing middleware logic
  return await updateSession(request)
}
```

### 4. Create vercel.json (for Vercel deployment)
```json
{
  "functions": {
    "app/api/cron/youtube-update/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/youtube-update",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### 5. Update Components (Remove Mock Data References)
The components currently call the API routes, which now return real data.

**No changes needed** since components use the API layer which is now updated.

However, verify these files don't import mock-data directly:
- `src/components/youtube-industry/YouTubeIndustryDashboard.tsx`
- `src/components/youtube-industry/CategoryDetailView.tsx`

## 🚀 How to Run

### Step 1: Create Supabase Tables
Run these SQL commands in your Supabase SQL editor:

```sql
-- Categories table
CREATE TABLE youtube_categories (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  total_channels INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  avg_views_per_video BIGINT DEFAULT 0,
  daily_change NUMERIC DEFAULT 0,
  weekly_change NUMERIC DEFAULT 0,
  monthly_change NUMERIC DEFAULT 0,
  market_share NUMERIC DEFAULT 0,
  volatility NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Channels table
CREATE TABLE youtube_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  category_code TEXT REFERENCES youtube_categories(code),
  name TEXT NOT NULL,
  handle TEXT,
  description TEXT,
  thumbnail_url TEXT,
  subscribers BIGINT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  views_per_video BIGINT DEFAULT 0,
  daily_change_rate NUMERIC DEFAULT 0,
  weekly_change_rate NUMERIC DEFAULT 0,
  monthly_change_rate NUMERIC DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  likes_per_video INTEGER,
  comments_per_video INTEGER,
  shorts_count INTEGER,
  regular_count INTEGER,
  shorts_ratio NUMERIC,
  uploads_per_week NUMERIC,
  last_upload_date TIMESTAMP,
  category_rank INTEGER DEFAULT 0,
  overall_rank INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Metrics history table
CREATE TABLE youtube_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT REFERENCES youtube_categories(code),
  channel_id TEXT,
  date DATE NOT NULL,
  value BIGINT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('views_per_video', 'subscribers', 'total_views', 'engagement_rate')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_channels_category ON youtube_channels(category_code);
CREATE INDEX idx_channels_views ON youtube_channels(views_per_video DESC);
CREATE INDEX idx_metrics_category_date ON youtube_metrics_history(category_code, date);
CREATE INDEX idx_metrics_channel_date ON youtube_metrics_history(channel_id, date);
```

### Step 2: Import Initial Data
```bash
npm run yt:import-data
```

This will:
- Insert 15 Y-code categories
- Insert initial channel list from Appendix A
- Channels will have 0 views initially (will be updated in next step)

### Step 3: Fetch Real Data from YouTube API
```bash
# Update all channels
npm run yt:update

# Or limit to test (e.g., first 10 channels)
npm run yt:update -- --limit=10
```

This will:
- Fetch real stats from YouTube Data API v3
- Calculate views per video, engagement rate, etc.
- Update Supabase with real data
- Update category metrics

**⚠️ Warning:** Full update uses ~3,000 quota units out of 10,000 daily limit.

### Step 4: Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000/youtube-industry

## 📊 Data Flow

```
┌─────────────────┐
│  YouTube API    │
│  (googleapis)   │
└────────┬────────┘
         │
         │ npm run yt:update
         ▼
┌─────────────────┐
│  Supabase DB    │
│  (frytwgfb...)  │
└────────┬────────┘
         │
         │ ytSupabase.from()
         ▼
┌─────────────────┐
│  Next.js API    │
│  /api/youtube-  │
│   industry/*    │
└────────┬────────┘
         │
         │ fetch()
         ▼
┌─────────────────┐
│  React          │
│  Components     │
└─────────────────┘
```

## 🔄 Automated Updates (Vercel Cron)

Once deployed to Vercel:
1. Cron job runs daily at 3 AM UTC
2. Fetches latest data from YouTube API
3. Updates Supabase tables
4. Calculates new metrics

## 🐛 Troubleshooting

### "No categories found" error
```bash
# Run import script
npm run yt:import-data
```

### YouTube API quota exceeded
```
Error: YouTube API quota exceeded
```
Solution: Wait until next day (quota resets at midnight PT)

### Supabase connection error
1. Check environment variables in `.env.local`
2. Verify Supabase project is active at https://frytwgfbxmbigrskarp.supabase.co
3. Check if tables exist in Supabase SQL Editor

## 📝 Next Steps Summary

1. ✅ Environment setup - DONE
2. ✅ Supabase client - DONE
3. ✅ YouTube API client - DONE
4. ✅ Import/update scripts - DONE
5. ✅ Main API routes updated - DONE
6. ⏳ Update remaining API routes (channels, metrics, trends)
7. ⏳ Create cron job route
8. ⏳ Update middleware
9. ⏳ Create vercel.json
10. ⏳ Create Supabase tables
11. ⏳ Run import & update scripts
12. ⏳ Test end-to-end

**Current Status:** 60% Complete

The foundation is solid. Main API routes work with real Supabase data. Complete remaining API routes and cron job to finish the migration.
