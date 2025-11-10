# Image 400 Bad Request Fix - Complete Summary

## Problem
All Notion images were showing **400 Bad Request** errors with `InvalidToken` from AWS S3, despite having valid timestamps.

## Root Cause
**Double URL decoding** was corrupting AWS security tokens:

1. **First encoding**: `encodeURIComponent()` in `converter.ts` creates proxied URL
   - Token with `/` becomes `%2F` ✅

2. **Browser encoding**: Browser encodes the URL parameter again when making request
   - `%2F` becomes `%252F` (double-encoded) ✅

3. **Next.js auto-decode**: `searchParams.get('url')` automatically decodes once
   - `%252F` becomes `%2F` (correctly encoded) ✅

4. **Our bug**: We called `decodeURIComponent()` AGAIN in `image-proxy/route.ts`
   - `%2F` becomes `/` (corrupted!) ❌
   - AWS receives decoded token with `/` instead of `%2F`
   - AWS returns: `<Code>InvalidToken</Code>`

## The Fix

### File: `src/app/api/image-proxy/route.ts`

**REMOVED this line**:
```typescript
const decodedUrl = decodeURIComponent(imageUrl) // ❌ REMOVED
```

**Explanation**:
- `searchParams.get('url')` already returns the correctly decoded URL
- No need to decode again - that was corrupting the AWS security token

### Changes Made:
```diff
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 })
  }

- // Decode URL
- const decodedUrl = decodeURIComponent(imageUrl)
+ // ✅ FIX: searchParams.get() already returns decoded URL
+ // No need to decode again - that was corrupting AWS security tokens!

- const isAllowed = allowedDomains.some(domain => decodedUrl.startsWith(domain))
+ const isAllowed = allowedDomains.some(domain => imageUrl.startsWith(domain))

- const response = await fetch(decodedUrl, {
+ const response = await fetch(imageUrl, {
```

## Verification

### Test Results:
```
📊 Step 1: Fresh post from database ✅
📊 Step 2: Extract AWS S3 URL ✅
📊 Step 3: Test through image proxy ✅

📥 Response:
  Status: 200 OK
  Content-Type: image/png
  Bytes received: 1,340,103

🎉 The complete flow works!
```

### Additional Fixes Applied:
1. ✅ Cleaned `.next` cache to fix ChunkLoadError
2. ✅ Removed double-decoding in image-proxy route
3. ✅ Verified fresh URLs from sync work correctly

## Testing
- Server running on: `http://localhost:3002`
- Fresh sync completed: 7 posts from 2 sources
- All image URLs have fresh timestamps (< 5 minutes old)
- Image proxy returns 200 OK with full image data

## Next Steps
1. Open `http://localhost:3002` in browser
2. All images should now load correctly
3. No more 400 Bad Request errors
4. No more ChunkLoadError

## Technical Details

### Why searchParams.get() auto-decodes:
According to the URL API specification, `URLSearchParams.get()` automatically decodes URL-encoded parameters. This is standard browser behavior.

### Why it was hard to find:
- The timestamp was valid (< 1 hour)
- The URL structure looked correct
- The error message was generic: "InvalidToken"
- The corruption only affected special characters in the security token

### Prevention:
Always check if a method auto-decodes before manually decoding. Common culprits:
- `URLSearchParams.get()` - auto-decodes ✓
- `URL.searchParams` - auto-decodes ✓
- `decodeURIComponent()` - manual decode only

## Files Modified
1. `src/app/api/image-proxy/route.ts` - Removed double-decoding
2. `.next/` - Cleaned build cache

## Diagnostic Scripts Created
1. `test-double-decode.ts` - Demonstrates the double-decoding issue
2. `test-complete-flow.ts` - End-to-end test from DB to image load
3. `emergency-db-check.ts` - Checks URL timestamps in database
4. `test-fresh-sync.ts` - Tests sync API

---

**Status**: ✅ **RESOLVED**
**Date**: 2025-11-10
**Time**: 05:11 UTC
