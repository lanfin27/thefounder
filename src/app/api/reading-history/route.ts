import { NextResponse } from 'next/server'
import { getReadingHistory } from '@/lib/supabase/queries/reading-history'

export async function GET() {
    console.log('[API /reading-history] 🔍 Fetching reading history')

    try {
        const history = await getReadingHistory()
        console.log(`[API /reading-history] ✅ Returning ${history.length} items`)
        return NextResponse.json(history)
    } catch (error) {
        console.error('[API /reading-history] ❌ Error fetching history:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
