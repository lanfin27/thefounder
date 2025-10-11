import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json({
      error: 'Query must be at least 2 characters long',
      results: []
    })
  }

  // For now, return empty results since we don't have a search implementation
  return NextResponse.json({
    results: [],
    query: query
  })
}