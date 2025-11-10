/**
 * Individual Notion Source API
 * GET /api/admin/notion-sources/[id] - Get single source
 * PUT /api/admin/notion-sources/[id] - Update source
 * DELETE /api/admin/notion-sources/[id] - Delete source
 */

import { NextRequest, NextResponse } from 'next/server'
import { NotionSourceService } from '@/lib/services/notionSourceService'

const service = new NotionSourceService()

export const dynamic = 'force-dynamic'

// GET /api/admin/notion-sources/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const source = await service.getById(params.id)

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(source)
  } catch (error: any) {
    console.error(`[API /admin/notion-sources/${params.id}] GET Error:`, error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/admin/notion-sources/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const source = await service.update(params.id, body)
    return NextResponse.json(source)
  } catch (error: any) {
    console.error(`[API /admin/notion-sources/${params.id}] PUT Error:`, error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}

// DELETE /api/admin/notion-sources/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await service.delete(params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`[API /admin/notion-sources/${params.id}] DELETE Error:`, error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
