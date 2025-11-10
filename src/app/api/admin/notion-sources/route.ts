/**
 * Notion Sources API
 * GET /api/admin/notion-sources - Get all sources
 * POST /api/admin/notion-sources - Create new source
 */

import { NextRequest, NextResponse } from 'next/server'
import { NotionSourceService } from '@/lib/services/notionSourceService'

const service = new NotionSourceService()

export const dynamic = 'force-dynamic'

// GET /api/admin/notion-sources - Get all sources
export async function GET() {
  try {
    const sources = await service.getAll()
    return NextResponse.json(sources)
  } catch (error: any) {
    console.error('[API /admin/notion-sources] GET Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/admin/notion-sources - Create new source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    if (!body.name || !body.notion_token || !body.notion_database_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, notion_token, notion_database_id' },
        { status: 400 }
      )
    }

    const source = await service.create(body)
    return NextResponse.json(source, { status: 201 })
  } catch (error: any) {
    console.error('[API /admin/notion-sources] POST Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
