import { NextResponse } from 'next/server'
import { notionCache } from '@/lib/cache/notion-cache'

export async function GET() {
  try {
    const stats = notionCache.getStats()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cache: stats
    })
  } catch (error) {
    console.error('Error fetching cache stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cache stats' },
      { status: 500 }
    )
  }
}

// Clear cache endpoint
export async function DELETE() {
  try {
    notionCache.clear()

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
