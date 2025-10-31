# Problem Diagnosis - YouTube History Generation

## 🔍 Issues Identified

### Issue 1: Video Count Fixed at 200

**Location**: `src/lib/youtube/youtube-service.ts:172-176`

**Current Code**:
```typescript
const videosUntilThisDate = videos.filter(v => {
  return new Date(v.publishedAt) <= date
})
const videoCount = videosUntilThisDate.length
```

**Problem**:
- `fetchAllVideos()` fetches the latest 200 videos (ordered by date, newest first)
- On day 1 (30 days ago), most of these 200 videos were already uploaded
- Result: video_count = ~200 from day 1 to day 30 (almost no change)

**Example**:
```
videos fetched: 200 videos (uploaded from 2023-01-01 to 2025-10-30)
Day 1 (2025-10-01): Filter shows 195 videos already uploaded
Day 30 (2025-10-30): Filter shows 200 videos
Result: Only 5 video increase over 30 days (unrealistic)
```

**Expected Behavior**:
- Should filter based on videos uploaded WITHIN the 30-day window
- Day 1: 355 videos
- Day 10: 362 videos
- Day 30: 370 videos

---

### Issue 2: daily_views_per_video Not Varying

**Location**: `src/lib/youtube/youtube-service.ts:214-216`

**Current Code**:
```typescript
const dailyViewsPerVideo = videoCount > 0
  ? Math.round((currentStats.totalViews * 0.003) / videoCount)
  : 0
```

**Problem**:
- Uses current total views × 0.3% ÷ video count
- This formula is THE SAME for every date
- Doesn't calculate actual daily change
- Result: daily_views_per_video is identical for all 30 days

**Example**:
```
currentStats.totalViews = 657,237,256
0.3% = 1,971,712
Day 1: videoCount = 200 → daily = 9,859
Day 30: videoCount = 200 → daily = 9,859
(No variation)
```

**Expected Behavior**:
- Should calculate based on view accumulation rate for each video
- Should vary based on how many videos exist and their age
- Should reflect realistic daily growth patterns

---

### Issue 3: Graph May Display Wrong Metric

**Status**: Need to verify

**Suspected Files**:
- `src/app/youtube-industry/[category]/page.tsx`
- Components in `src/components/youtube-industry/`

**What to Check**:
1. Does the graph display `subscribers` or `daily_views_per_video`?
2. Is the data properly fetched from the API?
3. Are tooltips showing the correct metrics?

**Expected per Design**:
- Primary metric: `daily_views_per_video` (영상당 조회수)
- Style: Toss Securities format (green ↑, red ↓)
- Tooltip: Show % change

---

## 🎯 Root Causes

### 1. Fetching Strategy
```
❌ Current: Fetch latest 200 videos (any date range)
✅ Should: Fetch videos and properly filter by 30-day window
```

### 2. Date Filtering Logic
```
❌ Current: Filter all videos by date (includes old videos)
✅ Should: Count only videos uploaded within analysis period
```

### 3. Calculation Method
```
❌ Current: Use fixed % of current total views
✅ Should: Calculate based on video age and accumulation pattern
```

---

## 📊 Expected vs Actual Results

### Video Count

**Expected (Realistic)**:
```
Day 1 (30 days ago): 355 videos
Day 10: 358 videos (+3)
Day 20: 365 videos (+7)
Day 30 (today): 370 videos (+5)
```

**Actual (Current)**:
```
Day 1: 200 videos
Day 10: 200 videos (no change ❌)
Day 20: 200 videos (no change ❌)
Day 30: 200 videos (no change ❌)
```

### daily_views_per_video

**Expected (Realistic)**:
```
Day 1: 1,234 views/video/day
Day 10: 1,456 views/video/day (+18%)
Day 20: 1,389 views/video/day (-5%)
Day 30: 1,523 views/video/day (+10%)
(Natural variation)
```

**Actual (Current)**:
```
Day 1: 9,859 views/video/day
Day 10: 9,859 views/video/day (identical ❌)
Day 20: 9,859 views/video/day (identical ❌)
Day 30: 9,859 views/video/day (identical ❌)
```

---

## 🔧 Required Fixes

### Fix 1: Improve Video Filtering
```typescript
// Sort videos by upload date
const sortedVideos = videos.sort((a, b) =>
  new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
);

// For each date, count videos uploaded UP TO that date
// within the last N months (not just any video)
const videosInRange = sortedVideos.filter(v => {
  const uploadDate = new Date(v.publishedAt);
  const monthsAgo = new Date();
  monthsAgo.setMonth(monthsAgo.getMonth() - 6); // Look back 6 months
  return uploadDate >= monthsAgo;
});
```

### Fix 2: Calculate daily_views_per_video Properly
```typescript
// Base calculation on video age and view accumulation
const daysSinceOldest = /* calculate from oldest video in filtered set */;
const estimatedDailyGrowth = viewsPerVideo / Math.max(daysSinceOldest, 1);

// Or calculate change from previous day
const dailyViewsPerVideo = i > 0
  ? Math.abs(viewsPerVideo - previousDayViewsPerVideo)
  : 0;
```

### Fix 3: Verify Graph Display
```typescript
// In graph component
<Line dataKey="daily_views_per_video" stroke={color} />
// NOT
<Line dataKey="subscribers" stroke={color} />
```

---

## 🧪 Verification Steps

1. **Check Console Logs After Fix**:
   ```
   ✅ Expected:
   [YouTubeService]    First: 2,420,000 subs, 355 videos, 1,234 daily views/video
   [YouTubeService]    Last:  2,530,000 subs, 370 videos, 1,523 daily views/video

   ❌ Current:
   [YouTubeService]    First: 2,163,150 subs, 200 videos
   [YouTubeService]    Last:  2,530,000 subs, 200 videos
   ```

2. **Check Database**:
   ```sql
   SELECT date, video_count, daily_views_per_video
   FROM youtube_channel_history
   WHERE channel_id = 'UCNhofiqfw5nl-NeDJkXtPvw'
   ORDER BY date;

   -- Should show:
   -- video_count increasing (355 → 370)
   -- daily_views_per_video varying (not all same)
   ```

3. **Check Graph**:
   - Navigate to http://localhost:3000/youtube-industry/Y05
   - See curved line (not flat)
   - Hover shows "영상당 조회수"
   - Color changes based on trend

---

**Diagnosis Date**: 2025-10-30
**Status**: Problems identified, ready for fixes
**Next**: Implement fixes in STEP 2
