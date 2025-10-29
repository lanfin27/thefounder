# YouTube Industry: Real-time Statistics Testing Guide

## System Overview
This document provides complete testing scenarios for the real-time statistics recalculation system that automatically updates User page statistics when channels are added, deleted, or moved between categories in the Admin panel.

## Pre-Test Checklist

### 1. Server Status
- [ ] Development server is running on `http://localhost:3002`
- [ ] No compilation errors in terminal
- [ ] Database connection is healthy

### 2. Browser Setup
```bash
# Open two browser windows side-by-side:
Window 1: http://localhost:3002/youtube-industry (User Page)
Window 2: http://localhost:3002/admin/youtube-industry/channels (Admin Page)
```

### 3. Developer Console Setup
- [ ] Open DevTools (F12) in both windows
- [ ] Switch to Console tab
- [ ] Filter: Enable "Verbose" logs
- [ ] Clear console before each test

### 4. Initial State Documentation
Before any changes, document the current state:

```bash
# In User Page, check Server Console for:
📊 Category distribution:
  🎵 Y02 음악: X channels, Y.ZM subscribers
  ✈️ Y11 여행: X channels, Y.ZM subscribers
  (etc...)

# Note down for your target category:
- Current channel count
- Current total subscribers
- Current Avg Views/Video
- Current top channels in Treemap
```

---

## Test 1: Channel Addition (빠니보틀 → Y11 여행)

### Step 1: Document Initial State

#### User Page (http://localhost:3002/youtube-industry)
Check 4 locations and document current values:

1. **Category Card (Y11 여행)**
   - [ ] Channel Count: ___
   - [ ] Avg Views/Video: ___
   - [ ] Daily Change Rate: ___

2. **Treemap Visualization**
   - [ ] Y11 box size (visual estimate)
   - [ ] Channels visible in Y11 section: ___

3. **Trend Charts**
   - [ ] Number of data points in Y11 chart

4. **Rankings Table**
   - [ ] Top 5 channels in Y11 category

#### Admin Page
- [ ] Current Y11 channel count in category filter: ___

### Step 2: Add Channel in Admin

1. Go to Admin page: `http://localhost:3002/admin/youtube-industry/channels`
2. Click "Add Channel" button
3. Enter channel info:
   - Input: `https://www.youtube.com/@bbanibottle` (or Channel ID)
   - Category: Select "Y11 - ✈️ 여행"
   - Added By: Your name
   - Notes: "Test addition for real-time stats"
4. Click "Submit"

### Step 3: Check API Response

#### Watch Server Console for:
```
[Add API] Adding channel: { input: '...', categoryCode: 'Y11', ... }
[Add API] 🔄 Revalidating all affected paths and tags...
[Add API] ✅ Revalidated path: /admin/youtube-industry/channels
[Add API] ✅ Revalidated path: /admin/youtube-industry/categories
[Add API] ✅ Revalidated path: /youtube-industry
[Add API] ✅ Revalidated path: /youtube-industry/Y11
[Add API] ✅ Revalidated tag: youtube-channels
[Add API] ✅ Revalidated tag: youtube-categories
[Add API] ✅ Revalidated tag: category-Y11
[Add API] ✅ Revalidated tag: treemap-data
[Add API] ✅ All caches revalidated successfully
[Add API] ✓ Channel added successfully: UCxxxxxxxxxxxxxxxxxx
```

#### Expected API Response:
```json
{
  "success": true,
  "message": "Channel added and all statistics will be recalculated on next page load",
  "channel": {
    "id": "...",
    "channelId": "UCxxxxxxxxxxxxxxxxxx",
    "title": "빠니보틀 bbanibottle",
    "categoryCode": "Y11",
    "subscriberCount": ...,
    "videoCount": ...,
    "viewCount": ...,
    "status": "active",
    "isActive": true
  },
  "revalidated": {
    "paths": [
      "/admin/youtube-industry/channels",
      "/admin/youtube-industry/categories",
      "/youtube-industry",
      "/youtube-industry/Y11"
    ],
    "timestamp": "2025-10-29T..."
  }
}
```

### Step 4: Verify Admin Page Updates

#### Without Manual Refresh:
- [ ] Admin channel list shows new channel
- [ ] Category filter count increased by 1
- [ ] Channel appears with correct category tag

### Step 5: Verify User Page Updates

1. Go to User Page: `http://localhost:3002/youtube-industry`
2. **DO NOT manually refresh** - let Next.js handle it

#### Watch Server Console for:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 [YouTube Industry Page] Server-side data fetching
🕐 Timestamp: 2025-10-29T...
✅ Fetched X categories
✅ Fetched Y channels (should be +1)
📊 Category distribution:
  ✈️ Y11 여행: X channels (should be +1), Y.ZM subscribers (should increase)
```

#### Check 4 Locations:

**1. Category Card (Y11 여행)**
- [ ] Channel count increased by +1
- [ ] Avg Views/Video recalculated (may change)
- [ ] Total subscribers increased
- [ ] Card shows updated data immediately

**2. Treemap Visualization**
- [ ] Y11 box size adjusted (larger if subscribers increased)
- [ ] New channel "빠니보틀" appears in Y11 section
- [ ] Hover shows updated channel count
- [ ] Proportions updated relative to other categories

**3. Trend Charts (IndustryChartsGrid)**
- [ ] Y11 chart shows new data point
- [ ] Avg Views/Video line updated
- [ ] Chart legend shows correct channel count

**4. Rankings Table (IndustryRankTable)**
- [ ] "빠니보틀" appears in Y11 section
- [ ] Channels re-sorted by subscribers
- [ ] Total count at bottom increased

#### Client Console Log:
```
🔄 [YouTubeIndustryContent] Props updated - refreshing data
  - timestamp: 2025-10-29T...
  - categories: 15
  - channels: Y (should be +1)
```

### Step 6: Verify Category Detail Page

1. Navigate to: `http://localhost:3002/youtube-industry/Y11`

#### Expected:
- [ ] Page shows updated channel list
- [ ] "빠니보틀" appears in the list
- [ ] Statistics recalculated
- [ ] Charts show new data

---

## Test 2: Channel Deletion (Remove Rina Hashimoto from Y02)

### Step 1: Document Initial State

#### User Page - Y02 Category
- [ ] Current channel count: ___
- [ ] Current Avg Views/Video: ___
- [ ] "Rina Hashimoto 里奈" visible in Treemap: Yes/No
- [ ] Rina's position in rankings: ___

#### Admin Page
- [ ] Find "Rina Hashimoto" in channel list
- [ ] Note her channelId: ___
- [ ] Current category: Y02

### Step 2: Delete Channel in Admin

1. Go to Admin page: `http://localhost:3002/admin/youtube-industry/channels`
2. Find "Rina Hashimoto 里奈" in the list
3. Click the "Delete" or "Remove" button
4. Confirm deletion dialog
   - Choose: "Soft Delete" (status='deleted') or "Hard Delete" (permanent)
   - Deleted By: Your name
   - Reason: "Test deletion for real-time stats"
5. Click "Confirm"

### Step 3: Check API Response

#### Watch Server Console for:
```
[Remove API] Removing channel: {
  channelId: 'UCxxxxxxxxxxxxxxxxxx',
  deletedBy: 'Admin',
  hardDelete: false,
  reason: 'Test deletion...'
}
[Remove API] Channel category: Y02
[Remove API] 🔄 Revalidating all affected paths and tags...
[Remove API] ✅ Revalidated path: /admin/youtube-industry/channels
[Remove API] ✅ Revalidated path: /admin/youtube-industry/categories
[Remove API] ✅ Revalidated path: /youtube-industry
[Remove API] ✅ Revalidated path: /youtube-industry/Y02
[Remove API] ✅ Revalidated tag: youtube-channels
[Remove API] ✅ Revalidated tag: youtube-categories
[Remove API] ✅ Revalidated tag: category-Y02
[Remove API] ✅ Revalidated tag: treemap-data
[Remove API] ✅ All caches revalidated successfully
[Remove API] ✓ Channel removed successfully: UCxxxxxxxxxxxxxxxxxx
```

#### Expected API Response:
```json
{
  "success": true,
  "message": "Channel deactivated and all statistics will be recalculated",
  "channelId": "UCxxxxxxxxxxxxxxxxxx",
  "hardDelete": false,
  "oldCategory": "Y02",
  "revalidated": {
    "paths": [
      "/admin/youtube-industry/channels",
      "/admin/youtube-industry/categories",
      "/youtube-industry",
      "/youtube-industry/Y02"
    ],
    "timestamp": "2025-10-29T..."
  }
}
```

### Step 4: Verify Admin Page Updates

#### Without Manual Refresh:
- [ ] Channel removed from active list (soft delete) or completely removed (hard delete)
- [ ] Y02 category count decreased by 1
- [ ] Status filter shows channel in "Deleted" tab (if soft delete)

### Step 5: Verify User Page Updates

1. Navigate to: `http://localhost:3002/youtube-industry`

#### Watch Server Console for:
```
📊 [YouTube Industry Page] Server-side data fetching
📊 Category distribution:
  🎵 Y02 음악: X channels (should be -1), Y.ZM subscribers (should decrease)
```

#### Check 4 Locations:

**1. Category Card (Y02 음악)**
- [ ] Channel count decreased by -1
- [ ] Avg Views/Video recalculated
- [ ] Total subscribers decreased (Rina's subs removed)
- [ ] Card reflects new totals

**2. Treemap Visualization**
- [ ] Y02 box size adjusted (smaller)
- [ ] "Rina Hashimoto" no longer visible
- [ ] Other Y02 channels redistributed in space
- [ ] Hover shows updated channel count

**3. Trend Charts**
- [ ] Y02 chart updated
- [ ] Avg Views/Video line recalculated
- [ ] Channel count in legend decreased

**4. Rankings Table**
- [ ] "Rina Hashimoto" removed from Y02 section
- [ ] Remaining channels re-ranked
- [ ] Total count decreased

### Step 6: Verify Category Detail Page

1. Navigate to: `http://localhost:3002/youtube-industry/Y02`

#### Expected:
- [ ] "Rina Hashimoto" not in channel list
- [ ] Statistics recalculated without her data
- [ ] Channel count accurate

---

## Test 3: Category Change (Move Channel Between Categories)

This tests the category update API which was also enhanced.

### Step 1: Choose a Channel to Move
- [ ] Pick a channel from Y02 (e.g., "IU 아이유")
- [ ] Target category: Y10 (엔터테인먼트)

### Step 2: Change Category in Admin
1. Go to channel detail or edit page
2. Change category dropdown from Y02 to Y10
3. Click "Save"

### Step 3: Verify Revalidation
#### Server Console Should Show:
```
[Category Update API] Request: {
  channelId: '...',
  categoryCode: 'Y10',
  timestamp: '...'
}
[Category Update API] 🔄 Revalidating all affected paths and tags...
[Category Update API] ✅ Revalidated path: /youtube-industry/Y02 (old)
[Category Update API] ✅ Revalidated path: /youtube-industry/Y10 (new)
```

### Step 4: Verify BOTH Categories Updated
- [ ] Y02 category stats decreased (channel removed)
- [ ] Y10 category stats increased (channel added)
- [ ] Treemap shows channel moved from Y02 to Y10
- [ ] Both category detail pages reflect change

---

## Expected Behavior Summary

### What SHOULD Happen:
1. ✅ Admin operations (add/delete/move) trigger immediate cache invalidation
2. ✅ Next page load fetches fresh data from DB
3. ✅ User sees updated statistics within seconds
4. ✅ All 4 locations updated consistently:
   - Category cards
   - Treemap
   - Trend charts
   - Rankings table
5. ✅ Server console shows revalidation logs
6. ✅ Client console shows props update logs
7. ✅ No manual browser refresh needed

### What Should NOT Happen:
1. ❌ Stale data persists after admin changes
2. ❌ Category statistics outdated
3. ❌ Treemap shows deleted channels
4. ❌ Rankings include removed channels
5. ❌ Need to hard refresh (Ctrl+Shift+R) to see updates

---

## Troubleshooting

### Issue 1: Statistics Not Updating After Admin Change

**Symptoms:**
- Admin shows updated channel list
- User page shows old statistics
- Manual refresh doesn't help

**Debug Steps:**
1. Check Server Console for revalidation logs:
```bash
# Should see these after admin operation:
[Add API] ✅ Revalidated path: /youtube-industry
[Add API] ✅ Revalidated tag: youtube-channels
```

2. Check if paths are correct:
```typescript
// In API route, verify:
const pathsToRevalidate = [
  '/admin/youtube-industry/channels',
  '/admin/youtube-industry/categories',
  '/youtube-industry',
  `/youtube-industry/${categoryCode}`,
]
```

3. Check Next.js cache config:
```typescript
// In page.tsx, verify:
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
```

4. Check timestamp prop is passed:
```typescript
// In page.tsx:
const timestamp = Date.now()
<YouTubeIndustryContent timestamp={timestamp} />
```

**Solution:**
- Ensure all 3 APIs have revalidation logic
- Clear `.next` cache and restart server
- Check browser isn't aggressively caching

### Issue 2: Revalidation Logs Missing

**Symptoms:**
- Admin operation succeeds
- No revalidation logs in console

**Debug Steps:**
1. Check imports in API route:
```typescript
import { revalidatePath, revalidateTag } from 'next/cache'
```

2. Check revalidation code runs:
```typescript
// Should be AFTER successful operation, BEFORE return
console.log('[API] 🔄 Revalidating...')
for (const path of pathsToRevalidate) {
  revalidatePath(path, 'page')
  console.log(`[API] ✅ Revalidated path: ${path}`)
}
```

**Solution:**
- Add console.log before revalidation to ensure code reaches that point
- Check for early returns that skip revalidation
- Verify try-catch doesn't silently fail

### Issue 3: Client Props Not Updating

**Symptoms:**
- Server fetches new data (console shows updated counts)
- Client component doesn't re-render
- useEffect not triggered

**Debug Steps:**
1. Check YouTubeIndustryContent.tsx useEffect:
```typescript
useEffect(() => {
  if (initialCategories && initialChannels) {
    console.log('🔄 Props updated - refreshing data')
    setCategories(initialCategories)
    setChannels(initialChannels)
  }
}, [initialCategories, initialChannels, timestamp])
```

2. Check timestamp prop is changing:
```typescript
// Should see in Client Console:
🔄 [YouTubeIndustryContent] Props updated
  - timestamp: 2025-10-29T16:45:30.123Z (NEW timestamp)
```

**Solution:**
- Ensure timestamp is generated on each render: `Date.now()`
- Check useEffect dependency array includes timestamp
- Verify props are passed correctly through component tree

### Issue 4: Partial Updates (Some Locations Update, Others Don't)

**Symptoms:**
- Admin page updates
- User page partially updates (e.g., cards update but Treemap doesn't)

**Debug Steps:**
1. Check which components use which data sources
2. Verify all components receive props correctly
3. Check for component-level caching/memoization

**Solution:**
- Ensure all child components receive updated props
- Check for React.memo or useMemo that might prevent re-render
- Verify data transformation doesn't filter out updates

---

## Performance Metrics

Track these metrics during testing:

### Latency
- [ ] Admin operation response time: ___ ms
- [ ] Page revalidation time: ___ ms
- [ ] Client re-render time: ___ ms
- [ ] Total user-visible delay: ___ seconds

### Consistency
- [ ] All 4 locations show same data: Yes/No
- [ ] Admin and User counts match: Yes/No
- [ ] Treemap and cards consistent: Yes/No

### Reliability
- [ ] Test 1 passed: ___/___
- [ ] Test 2 passed: ___/___
- [ ] Test 3 passed: ___/___
- [ ] Overall success rate: ___%

---

## Success Criteria

The system is working correctly if:

1. ✅ **Admin Operations Work**
   - Channels can be added, deleted, and moved
   - API returns success with revalidation info
   - Console shows revalidation logs

2. ✅ **User Page Updates Automatically**
   - Category cards show updated counts
   - Treemap reflects changes
   - Charts recalculate
   - Rankings update

3. ✅ **No Manual Refresh Needed**
   - Navigate between pages triggers updates
   - Next.js handles cache invalidation
   - Users see fresh data within seconds

4. ✅ **Data Consistency**
   - All locations show same statistics
   - Admin counts match User counts
   - No orphaned or duplicate data

5. ✅ **Performance**
   - Updates visible within 3-5 seconds
   - No noticeable lag on page navigation
   - Server handles revalidation efficiently

---

## Test Completion Checklist

- [ ] Test 1: Channel Addition - PASSED
- [ ] Test 2: Channel Deletion - PASSED
- [ ] Test 3: Category Change - PASSED
- [ ] All 4 locations verified for each test
- [ ] Server console logs correct
- [ ] Client console logs correct
- [ ] Performance acceptable (< 5 seconds)
- [ ] No errors in any console
- [ ] System stable after multiple operations

**Date Tested:** _______________
**Tested By:** _______________
**Result:** PASS / FAIL
**Notes:**

---

## Additional Test Scenarios

### Batch Operations
1. Add 5 channels to same category
2. Verify statistics reflect all additions
3. Delete 3 channels from different categories
4. Verify all affected categories updated

### Edge Cases
1. Add channel with 0 subscribers
2. Add channel with no videos
3. Move channel between categories multiple times
4. Delete then re-add same channel

### Stress Test
1. Add/delete 20+ channels rapidly
2. Check for race conditions
3. Verify final state is correct
4. Check for memory leaks or performance degradation

---

## Reporting Issues

If tests fail, please provide:

1. **Console Logs:**
   - Server console output (full revalidation section)
   - Client console output (props update section)
   - Browser console errors

2. **Screenshots:**
   - Before state (all 4 locations)
   - After state (all 4 locations)
   - API response in Network tab

3. **Environment:**
   - Node version: `node --version`
   - Next.js version: Check package.json
   - Browser: Chrome/Firefox/Safari + version
   - Operating System

4. **Steps to Reproduce:**
   - Exact sequence of actions
   - Specific channel used
   - Category involved
   - Any error messages

---

## Notes for Developers

### Architecture Overview

```
Admin Operation (Add/Delete/Move Channel)
  ↓
API Route (/api/admin/youtube/.../route.ts)
  ↓
Database Update (Supabase)
  ↓
revalidatePath() + revalidateTag()
  ↓
Next.js Cache Invalidated
  ↓
User Navigation to Page
  ↓
Server Component Re-renders (page.tsx)
  ↓
Fresh DB Query
  ↓
Props Passed to Client Component (timestamp)
  ↓
useEffect Triggers on Timestamp Change
  ↓
Client State Updates (setCategories, setChannels)
  ↓
All Child Components Re-render
  ↓
User Sees Updated Statistics
```

### Key Files
1. `/api/admin/youtube/channels/add/route.ts` - Add API + revalidation
2. `/api/admin/youtube/channels/[channelId]/remove/route.ts` - Delete API + revalidation
3. `/api/admin/youtube-industry/channels/[channelId]/category/route.ts` - Category change API
4. `/app/youtube-industry/page.tsx` - Server Component with timestamp
5. `/components/youtube-industry/YouTubeIndustryContent.tsx` - Client wrapper with props detection

### Revalidation Strategy
- **Path-based:** Invalidates specific page routes
- **Tag-based:** Invalidates grouped cache entries
- **Timestamp:** Forces client re-render even if data looks same

---

## Conclusion

This testing guide ensures the real-time statistics recalculation system works end-to-end. Follow each test scenario carefully and document results. The system should provide a seamless experience where Admin operations immediately reflect on User pages without manual intervention.

Happy testing! 🚀
