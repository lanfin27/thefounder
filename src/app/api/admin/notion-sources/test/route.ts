/**
 * Test Notion Connection API
 * POST /api/admin/notion-sources/test - Test connection to Notion database
 */

import { NextRequest, NextResponse } from 'next/server'
import { NotionSourceService } from '@/lib/services/notionSourceService'

const service = new NotionSourceService()

export const dynamic = 'force-dynamic'

// POST /api/admin/notion-sources/test
export async function POST(request: NextRequest) {
  try {
    const { notion_token, notion_database_id } = await request.json()

    if (!notion_token || !notion_database_id) {
      return NextResponse.json(
        { error: 'Missing token or database ID' },
        { status: 400 }
      )
    }

    const result = await service.testConnection(notion_token, notion_database_id)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API /admin/notion-sources/test] POST Error:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
