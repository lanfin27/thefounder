import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Allow up to 30s for the combined Notion API call + S3 image fetch on Vercel.
export const maxDuration = 30;

/**
 * Image Proxy API Route
 *
 * Purpose: Proxy Notion S3 images with automatic fresh-URL recovery
 *
 * How it works:
 * 1. Client requests /api/image-proxy?url=<stale-S3-url>&pageId=<notion-page-id>
 * 2. We try to fetch the provided S3 URL
 * 3. If it's expired (400/403 — Notion S3 URLs live only 1 hour), we use
 *    the pageId to retrieve the page from Notion API, which returns a
 *    freshly-signed S3 URL, and fetch that instead.
 * 4. We serve the image bytes with long-lived cache headers so the CDN /
 *    browser never has to hit this route again for the same stale URL.
 *
 * We keep an in-process cache of (staleUrl → freshUrl) and of
 * (pageId → Notion page payload) so a homepage with N images only makes
 * one Notion API call per unique pageId, not per image.
 */

const notion = new Client({ auth: process.env.NOTION_TOKEN })

// stale-url → fresh-url cache, 50 min TTL (Notion URLs are valid for 60 min)
const FRESH_URL_TTL_MS = 50 * 60 * 1000
const freshUrlCache = new Map<string, { freshUrl: string; expiresAt: number }>()

// pageId → page payload cache, 5 min TTL
const PAGE_CACHE_TTL_MS = 5 * 60 * 1000
const pageCache = new Map<string, { page: any; expiresAt: number }>()

/**
 * Extract a stable Notion file key from any Notion S3 URL.
 * A Notion S3 URL looks like:
 *   https://prod-files-secure.s3.us-west-2.amazonaws.com/<workspace-id>/<file-id>/<filename>?<aws-signature>
 * The `<workspace-id>/<file-id>/<filename>` portion is stable across
 * signature regenerations, so we use it to match the stale URL against
 * freshly-signed URLs returned by the Notion API.
 */
function extractNotionFileKey(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('amazonaws.com') && !u.hostname.includes('notion')) {
      return null
    }
    // Drop the leading slash
    return u.pathname.replace(/^\//, '') || null
  } catch {
    return null
  }
}

async function retrievePage(pageId: string): Promise<any | null> {
  const cached = pageCache.get(pageId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.page
  }
  try {
    const page = await notion.pages.retrieve({ page_id: pageId })
    pageCache.set(pageId, { page, expiresAt: Date.now() + PAGE_CACHE_TTL_MS })
    return page
  } catch (err) {
    console.error('[ImageProxy] Notion pages.retrieve failed:', (err as Error).message)
    return null
  }
}

/**
 * Walk a Notion page (cover + properties + top-level blocks) looking for
 * an image URL whose path matches `fileKey`. Returns the freshly-signed URL
 * if found.
 */
async function findFreshUrl(pageId: string, fileKey: string | null): Promise<string | null> {
  const page = await retrievePage(pageId)
  if (!page) return null

  // Helper to test a candidate URL
  const matchesKey = (url: string | undefined): url is string => {
    if (!url) return false
    if (!fileKey) return true // no key to match, accept first hit
    return url.includes(fileKey)
  }

  // 1. Page cover
  const coverUrl =
    page.cover?.file?.url ||
    page.cover?.external?.url ||
    undefined
  if (matchesKey(coverUrl)) return coverUrl

  // 2. Files-type properties (custom "cover" columns, etc.)
  for (const prop of Object.values(page.properties || {}) as any[]) {
    if (prop?.type === 'files') {
      for (const file of prop.files || []) {
        const u = file?.file?.url || file?.external?.url
        if (matchesKey(u)) return u
      }
    }
  }

  // 3. Image blocks inside the page
  try {
    let cursor: string | undefined
    do {
      const { results, next_cursor } = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      })
      for (const block of results as any[]) {
        if (block.type === 'image') {
          const u = block.image?.file?.url || block.image?.external?.url
          if (matchesKey(u)) return u
        }
      }
      cursor = next_cursor || undefined
    } while (cursor)
  } catch (err) {
    console.error('[ImageProxy] Notion blocks.children.list failed:', (err as Error).message)
  }

  // 4. Fallback: return the cover URL even if key didn't match (better than 403)
  return coverUrl || null
}

async function resolveFreshUrl(staleUrl: string, pageId: string | null): Promise<string | null> {
  if (!pageId) return null

  const cached = freshUrlCache.get(staleUrl)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.freshUrl
  }

  const fileKey = extractNotionFileKey(staleUrl)
  const freshUrl = await findFreshUrl(pageId, fileKey)
  if (freshUrl) {
    freshUrlCache.set(staleUrl, {
      freshUrl,
      expiresAt: Date.now() + FRESH_URL_TTL_MS,
    })
  }
  return freshUrl
}

async function fetchImage(url: string) {
  return fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    // Bypass Next's fetch cache — the URL changes across calls anyway
    cache: 'no-store',
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  const pageId = searchParams.get('pageId')

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 })
  }

  // Security: only allow Notion/S3 sources
  const allowedPrefixes = [
    'https://prod-files-secure.s3.us-west-2.amazonaws.com/',
    'https://prod-files-secure.s3.amazonaws.com/',
    'https://s3.us-west-2.amazonaws.com/',
    'https://secure.notion-static.com/',
    'https://www.notion.so/',
  ]
  if (!allowedPrefixes.some((p) => imageUrl.startsWith(p))) {
    return NextResponse.json(
      { error: 'Unauthorized image source' },
      { status: 403 },
    )
  }

  // Strategy:
  // - If we have a pageId, skip the stale URL entirely and go straight to
  //   Notion for a fresh one. Stale URLs are almost always expired in this
  //   codebase because Supabase stores the sync-time URL, and syncs happen
  //   days or weeks apart.
  // - If we don't have a pageId, attempt the original URL as-is.
  let targetUrl = imageUrl
  let usedFresh = false

  if (pageId) {
    const fresh = await resolveFreshUrl(imageUrl, pageId)
    if (fresh) {
      targetUrl = fresh
      usedFresh = true
    }
  }

  try {
    let response = await fetchImage(targetUrl)

    // If fresh URL wasn't used and the stale URL is expired, try to recover.
    if (!response.ok && !usedFresh && pageId && (response.status === 400 || response.status === 403)) {
      console.warn(
        `[ImageProxy] ⚠️ Stale URL returned ${response.status}, attempting Notion refresh for pageId=${pageId.substring(0, 8)}`,
      )
      const fresh = await resolveFreshUrl(imageUrl, pageId)
      if (fresh) {
        response = await fetchImage(fresh)
        usedFresh = true
      }
    }

    if (!response.ok) {
      console.error(
        `[ImageProxy] ❌ ${response.status} ${response.statusText} for ${targetUrl.substring(0, 100)}`,
      )
      return NextResponse.json(
        {
          error: 'Image fetch failed',
          status: response.status,
          usedFresh,
          hint: pageId
            ? 'Notion refresh did not yield a usable URL — check NOTION_TOKEN and page permissions.'
            : 'No pageId supplied; stale Notion URLs cannot be recovered.',
        },
        { status: response.status },
      )
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const imageBuffer = await response.arrayBuffer()

    console.log(
      `[ImageProxy] ✅ ${usedFresh ? 'fresh' : 'direct'} ${contentType} ${imageBuffer.byteLength}B`,
    )

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        // Cache for 1 hour (not 1 year!) because the upstream signature
        // rotates and we want a chance to re-fetch a fresh URL periodically.
        // Still long enough that repeat views are near-instant.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, max-age=3600',
        'Vercel-CDN-Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[ImageProxy] ❌ Exception:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
