import { NextRequest, NextResponse } from 'next/server'

/**
 * Image Proxy API Route
 *
 * Purpose: Proxy Notion S3 images with long-term caching
 * Strategy: Reference version의 검증된 접근 방식 적용
 *
 * Key Features:
 * 1. Long-term caching (1 year TTL)
 * 2. Server-side revalidation (every 1 hour)
 * 3. Strong Cache-Control headers for CDN
 * 4. Node.js runtime (not Edge) for better fetch cache support
 *
 * Note: Notion S3 URLs expire after 1 hour, but Next.js will
 * automatically revalidate and fetch fresh URLs through sync.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  // Validation
  if (!imageUrl) {
    console.error('[ImageProxy] ❌ Missing URL parameter')
    return NextResponse.json(
      { error: 'Missing image URL' },
      { status: 400 }
    )
  }

  // ✅ FIX: searchParams.get() already returns decoded URL
  // No need to decode again - that was corrupting AWS security tokens!
  // const decodedUrl = decodeURIComponent(imageUrl) // ❌ REMOVED

  // Security: Only allow Notion S3 URLs and Notion static URLs
  const allowedDomains = [
    'https://prod-files-secure.s3.us-west-2.amazonaws.com/',
    'https://prod-files-secure.s3.amazonaws.com/',
    'https://s3.us-west-2.amazonaws.com/',
    'https://secure.notion-static.com/',
    'https://www.notion.so/'
  ]

  const isAllowed = allowedDomains.some(domain => imageUrl.startsWith(domain))

  if (!isAllowed) {
    console.error('[ImageProxy] ❌ Unauthorized domain:', imageUrl.substring(0, 100))
    return NextResponse.json(
      { error: 'Unauthorized image source' },
      { status: 403 }
    )
  }

  try {
    console.log('[ImageProxy] 📥 Fetching:', imageUrl.substring(0, 100) + '...')

    // Fetch with revalidation strategy (Reference version approach)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: {
        revalidate: 3600, // ✅ Revalidate every 1 hour
      },
    })

    if (!response.ok) {
      console.error('[ImageProxy] ❌ Failed:', response.status, response.statusText)

      // If URL expired (400/403), suggest sync
      if (response.status === 400 || response.status === 403) {
        return NextResponse.json(
          {
            error: 'Image URL expired. Please sync posts to get fresh URLs.',
            hint: 'Visit /admin/sync and click "🔄 전체 동기화"',
            status: response.status
          },
          { status: response.status }
        )
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Get image buffer
    const imageBuffer = await response.arrayBuffer()

    console.log('[ImageProxy] ✅ Success:', contentType, `${imageBuffer.byteLength} bytes`)

    // Return with strong caching headers (Reference version strategy)
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        // Client-side cache: 1 year, immutable
        'Cache-Control': 'public, max-age=31536000, immutable',
        // CDN cache: 1 year
        'CDN-Cache-Control': 'public, max-age=31536000',
        // Vercel cache: 1 year
        'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
        // CORS
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('[ImageProxy] ❌ Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
