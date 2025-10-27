# YouTube Channel Verification System

## Overview

Automatic YouTube channel ID verification and correction system that can:
- ✅ Verify channel IDs using YouTube Data API v3
- 🔍 Resolve channel names, @handles, or custom URLs to actual channel IDs
- 🔧 Auto-fix incorrect channel IDs in database
- 📊 Admin UI for manual corrections
- 📝 Log channels needing manual review

## Components

### 1. ChannelResolver Class
**File:** `src/lib/youtube-api/channel-resolver.ts`

Resolves channels through multiple strategies (cheapest to most expensive):

```typescript
// Strategy 1: Direct channel ID (1 quota unit)
const result = await resolver.resolveChannel('UCOmHUn--16B90oW2L6FRR3A')

// Strategy 2: @handle (1 quota unit)
const result = await resolver.resolveChannel('@BLACKPINK')

// Strategy 3: Channel name search (100 quota units)
const result = await resolver.resolveChannel('BLACKPINK')
```

**Features:**
- Channel ID validation (UC + 24 characters)
- @handle resolution via `forHandle` parameter
- Name-based search with similarity matching
- Levenshtein distance for fuzzy matching
- Automatic fallback from cheapest to most expensive method

**Quota Costs:**
- Direct ID lookup: 1 unit
- @handle lookup: 1 unit
- Name search: 100 units (expensive!)

### 2. Channel Mappings
**File:** `src/data/channel-mappings.ts`

Pre-defined mappings of known channels to avoid expensive search API calls.

```typescript
export const CHANNEL_MAPPINGS: Record<string, ChannelMapping> = {
  'BLACKPINK': {
    names: ['BLACKPINK', '블랙핑크'],
    handle: '@BLACKPINK',
    channel_id: 'UCOmHUn--16B90oW2L6FRR3A'
  },
  // ... 41 Korean channels mapped
}

// Helper functions
findMapping('블랙핑크')           // Returns mapping object
getPreferredQuery('BLACKPINK')   // Returns '@BLACKPINK' (cheapest)
```

**Currently Mapped:** 41 Korean YouTube channels across all 15 categories

**Adding New Mappings:**
Edit `src/data/channel-mappings.ts` and add your channel:

```typescript
'채널명': {
  names: ['채널명', 'Alternative Name', 'English Name'],
  handle: '@handle',          // Optional - preferred
  channel_id: 'UCxxxxxxxxxx'  // Optional - most reliable
}
```

### 3. Verification Script
**File:** `scripts/verify-and-fix-channels.ts`

Automated verification and correction of all channels in database.

**Process Flow:**
```
1. Load all channels from database
2. Check quota availability (minimum 100 units)
3. For each channel:
   a. Verify current channel ID (1 unit)
   b. If invalid, check mappings (0 units)
   c. If still invalid, search by name (100 units)
   d. Auto-fix if found (full mode only)
4. Save results to logs/channel-verification-{timestamp}.json
5. Display channels needing manual review
```

**Verification Result:**
```typescript
interface VerificationResult {
  channel_id: string
  name: string
  category_code: string
  status: 'valid' | 'fixed' | 'not_found' | 'skipped'
  old_channel_id?: string
  new_channel_id?: string
  method?: 'id' | 'handle' | 'search' | 'not_found'
  error?: string
}
```

### 4. Admin UI
**File:** `src/app/admin/youtube-channels/page.tsx`

Web interface for manual channel management.

**Features:**
- ✅ View all channels with validation status
- 🔍 Search by name or channel ID
- 🏷️ Filter by category
- ✏️ Edit channel IDs inline
- ✓ Verify individual channels via API
- 🔗 Direct link to YouTube channel page
- 📊 Statistics dashboard (valid/invalid/unknown counts)

**URL:** `http://localhost:3000/admin/youtube-channels`

### 5. API Routes

#### Verify Channel
**Endpoint:** `POST /api/youtube-industry/verify-channel`

Verifies a single channel ID.

```typescript
// Request
POST /api/youtube-industry/verify-channel
{
  "channel_id": "UCOmHUn--16B90oW2L6FRR3A"
}

// Response (valid)
{
  "valid": true,
  "channel_id": "UCOmHUn--16B90oW2L6FRR3A",
  "name": "BLACKPINK",
  "custom_url": "@BLACKPINK",
  "subscribers": 99000000,
  "thumbnail": "https://..."
}

// Response (invalid)
{
  "valid": false,
  "error": "Channel not found on YouTube"
}
```

#### Update Channel
**Endpoint:** `POST /api/youtube-industry/update-channel`

Updates a channel's ID in the database.

```typescript
// Request
POST /api/youtube-industry/update-channel
{
  "old_channel_id": "UCold...",
  "new_channel_id": "UCnew..."
}

// Response
{
  "success": true,
  "channel_id": "UCnew...",
  "name": "Updated Channel Name",
  "subscribers": 1000000
}
```

**Features:**
- Validates new channel ID format (UC + 24 chars)
- Verifies channel exists on YouTube
- Updates channel data (name, subscribers) from API
- Safe database update with error handling

## Usage Guide

### Method 1: Automated Verification (Recommended)

Full verification with auto-fix:
```bash
npm run yt:verify-channels
```

**What it does:**
1. ✅ Verifies all 41 channels in database
2. 🔧 Auto-fixes incorrect channel IDs
3. 📝 Saves results to `logs/channel-verification-{timestamp}.json`
4. 📊 Shows statistics and quota usage
5. 📋 Lists channels needing manual review

**Output:**
```
============================================================
YouTube Channel Verification System
============================================================
Mode: 🔧 Full (verify + auto-fix)

📊 Initial Quota Status:
   Used: 15 units
   Remaining: 8985 units
   Percentage: 0.17%

📥 Loading channels from database...
✅ Loaded 41 channels

🔍 Starting verification...
----------------------------------------------------------------------

[1/41] 깡스타일리스트 (Y01)
   Current ID: UCRtgBJLyBFaLBal6Jv1uhvQ
   ✅ Valid - 깡스타일리스트

[2/41] BLACKPINK (Y10)
   Current ID: UCOmHUn--16B90oW2L6FRR3A
   ✅ Valid - BLACKPINK

...

============================================================
✅ Verification Complete
============================================================
Total Channels: 41
✅ Valid: 38
🔧 Fixed: 2
❌ Not Found: 1
⚠️  Skipped: 0

📊 Final Quota Status:
   Used: 67 units (+52)
   Remaining: 8933 units
   Percentage: 0.74%

📄 Results saved to: logs/channel-verification-2025-10-21T12-30-45.json

⚠️  Channels Needing Manual Review:
----------------------------------------------------------------------
   채널명 (Y06)
   ID: UCxxxxxxxxxxxxxxxxxx
   Error: Channel not found via API or mappings
   URL: https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxx

💡 Next Steps:
   1. Manually verify these channels on YouTube
   2. Update channel mappings in src/data/channel-mappings.ts
   3. Or use the admin UI to fix manually
```

### Method 2: Quick Verification (No Auto-Fix)

Verify only, without auto-fixing:
```bash
npm run yt:verify-quick
```

**Use when:**
- You want to check validity without making changes
- Testing the verification system
- Low on quota and want to minimize usage

### Method 3: Manual Correction via Admin UI

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Open admin UI:**
   ```
   http://localhost:3000/admin/youtube-channels
   ```

3. **Verify a channel:**
   - Click "Verify" button next to channel
   - Status updates to "Valid" or "Invalid"
   - Name and subscriber count auto-update if valid

4. **Edit channel ID:**
   - Click "Edit" next to channel ID
   - Enter new channel ID (must be UC + 24 characters)
   - Click "Save"
   - System verifies new ID via YouTube API
   - Auto-updates channel data if valid

5. **Check channel on YouTube:**
   - Click "YouTube" link to open channel page in new tab
   - Verify it's the correct channel
   - Copy channel ID from URL if needed

### Method 4: Programmatic Resolution

Use ChannelResolver in your code:

```typescript
import { QuotaManager } from '@/lib/youtube-api/quota-manager'
import { ChannelResolver } from '@/lib/youtube-api/channel-resolver'

const quotaManager = new QuotaManager()
await quotaManager.loadQuotaUsage()

const resolver = new ChannelResolver(quotaManager)

// Resolve single channel
const result = await resolver.resolveChannel('BLACKPINK')
console.log(result)
// {
//   channel_id: 'UCOmHUn--16B90oW2L6FRR3A',
//   name: 'BLACKPINK',
//   custom_url: '@BLACKPINK',
//   subscribers: 99000000,
//   found: true,
//   method: 'search'
// }

// Resolve multiple channels
const results = await resolver.resolveMultiple([
  'BLACKPINK',
  '@BTS',
  'UCyn-K7rZLXjGl7VXGweIlcA'
])
```

## Quota Management

### Quota Costs by Method

| Method | Quota Cost | Speed | Reliability |
|--------|------------|-------|-------------|
| Direct ID | 1 unit | Fast | Highest |
| @handle | 1 unit | Fast | High |
| Name search | 100 units | Slow | Medium |

### Smart Strategy

The ChannelResolver automatically uses the cheapest method first:

1. **If input is channel ID** (UC + 24 chars):
   - Try direct lookup (1 unit)
   - If found ✅ → Done

2. **If input starts with @**:
   - Try @handle lookup (1 unit)
   - If found ✅ → Done

3. **Otherwise**:
   - Check channel mappings (0 units)
   - If mapping found, use preferred query (1 unit)
   - If found ✅ → Done
   - Last resort: Search by name (100 units)

### Example Quota Usage

Verifying 41 channels with good mappings:
```
✅ 38 valid channels (already correct): 38 × 1 = 38 units
🔍 2 mapped channels resolved: 2 × 1 = 2 units
🔍 1 search needed: 1 × 100 = 100 units
─────────────────────────────────────────────
Total: 140 units (~1.5% of daily quota)
```

## Best Practices

### 1. Keep Mappings Updated

When you discover a channel's @handle or validate its ID:

```typescript
// Add to src/data/channel-mappings.ts
'새채널': {
  names: ['새채널', 'New Channel'],
  handle: '@newchannel',        // Preferred
  channel_id: 'UCxxxxxxxxxx'    // Most reliable
}
```

### 2. Use Quick Mode First

Before running full auto-fix:
```bash
npm run yt:verify-quick
```

This shows what would be fixed without using quota.

### 3. Monitor Quota

Check before large operations:
```bash
npm run yt:quota-check
```

Ensure you have enough quota remaining.

### 4. Review Logs

Verification results are saved to `logs/`:
```bash
logs/
  channel-verification-2025-10-21T12-30-45.json
  channel-verification-2025-10-20T09-15-22.json
```

Each log contains detailed verification results for audit trail.

### 5. Batch Manual Fixes

Use admin UI for small corrections (1-5 channels).
Use verification script for large-scale fixes (10+ channels).

## Troubleshooting

### Channel Not Found

```
❌ Not found - needs manual review
```

**Solutions:**
1. Check channel exists: `https://www.youtube.com/channel/{ID}`
2. Try finding @handle on YouTube
3. Search for channel name on YouTube
4. Copy correct channel ID from URL
5. Update via admin UI or add to mappings

### Invalid Channel ID Format

```
⚠️  Invalid ID: ABC123 (wrong format)
```

**Solution:** Channel IDs must:
- Start with "UC"
- Be exactly 24 characters
- Example: `UCOmHUn--16B90oW2L6FRR3A`

### Insufficient Quota

```
⚠️  Insufficient quota for search (need 100 units)
```

**Solutions:**
1. Wait until next day (quota resets midnight PT)
2. Add channel to mappings to avoid search
3. Use admin UI to update manually (doesn't use quota)

### Database Update Failed

```
❌ Failed to update: {error}
```

**Check:**
1. Supabase credentials in `.env.local`
2. Service key has write permissions
3. New channel_id doesn't already exist (unique constraint)

## File Structure

```
YouTube Channel Verification System
├── Core Libraries
│   └── src/lib/youtube-api/
│       └── channel-resolver.ts          # ChannelResolver class
│
├── Data Files
│   └── src/data/
│       └── channel-mappings.ts          # Channel mappings (41 channels)
│
├── Scripts
│   └── scripts/
│       └── verify-and-fix-channels.ts   # Verification script
│
├── Admin UI
│   └── src/app/admin/youtube-channels/
│       └── page.tsx                     # Admin interface
│
├── API Routes
│   └── src/app/api/youtube-industry/
│       ├── verify-channel/route.ts      # Single verification
│       └── update-channel/route.ts      # Update channel ID
│
├── Logs (auto-created)
│   └── logs/
│       └── channel-verification-*.json  # Verification results
│
└── Documentation
    └── YOUTUBE_CHANNEL_VERIFICATION.md  # This file
```

## npm Scripts

```json
{
  "yt:verify-channels": "Full verification with auto-fix",
  "yt:verify-quick": "Quick verification without auto-fix"
}
```

## Integration with Existing System

This verification system integrates with:

### 1. Real Channels Integration
- Uses channel IDs from `src/data/real-youtube-channels.ts`
- Validates all 41 real Korean channels
- Auto-corrects any invalid IDs

### 2. Quota Management
- Integrates with `QuotaManager` class
- Tracks verification quota usage
- Respects daily limits (9,000 units)

### 3. Smart Update System
- Can be run before `npm run yt:smart-update`
- Ensures all channel IDs are valid before API calls
- Prevents wasted quota on invalid channels

### 4. Database
- Updates `youtube_channels` table in Supabase
- Maintains referential integrity with categories
- Auto-updates last_updated timestamp

## Recommended Workflow

### Initial Setup (One-Time)
```bash
# 1. Update database with real channels
npm run yt:update-real-channels

# 2. Verify all channel IDs
npm run yt:verify-channels

# 3. Fix any issues in admin UI
npm run dev
# Open http://localhost:3000/admin/youtube-channels
```

### Regular Maintenance (Monthly)
```bash
# Verify channels are still valid
npm run yt:verify-quick

# If issues found, run full fix
npm run yt:verify-channels
```

### Before Major Updates
```bash
# Ensure data is clean
npm run yt:verify-channels

# Then run smart update
npm run yt:smart-update
```

## Summary

✅ **Automated** - Verifies all channels automatically
✅ **Smart** - Uses cheapest methods first (1 unit vs 100 units)
✅ **Safe** - Validates before updating database
✅ **Auditable** - Saves detailed logs of all changes
✅ **User-Friendly** - Admin UI for manual corrections
✅ **Quota-Efficient** - Minimizes API costs with mappings
✅ **Integrated** - Works with existing quota and update systems

## Support

For issues or questions:
1. Check quota: `npm run yt:quota-check`
2. Review logs in `logs/` directory
3. Use admin UI for manual verification
4. Update channel mappings as needed

---

**Status:** ✅ Complete and Ready for Use
**Total Channels:** 41
**Mapped Channels:** 41
**Last Updated:** 2025-10-21
