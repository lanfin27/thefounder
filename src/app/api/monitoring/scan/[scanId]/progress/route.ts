import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { scanId: string } }
) {
  try {
    const { scanId } = params
    
    const supabase = createServerClient()
    
    // Get scan session - use 'id' column not 'scan_id'
    const { data: scan, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('id', scanId)
      .single()
    
    if (error || !scan) {
      return NextResponse.json(
        { success: false, error: 'Scan not found' },
        { status: 404 }
      )
    }
    
    // Calculate progress based on scan status
    let progress = 0
    let message = 'Initializing...'
    let stats = {
      pagesScanned: 0,
      listingsFound: scan.listings_found || 0,
      newListings: scan.new_listings || 0
    }
    
    if (scan.status === 'running') {
      // Estimate progress based on time elapsed
      const startTime = new Date(scan.started_at).getTime()
      const now = Date.now()
      const elapsed = (now - startTime) / 1000 // seconds
      const estimatedDuration = 300 // 5 minutes estimate
      
      progress = Math.min(90, (elapsed / estimatedDuration) * 100)
      message = `Scanning Flippa listings... (${Math.round(progress)}%)`
      
      // Estimate pages based on progress
      stats.pagesScanned = Math.floor((progress / 100) * 5)
    } else if (scan.status === 'completed') {
      progress = 100
      message = 'Scan completed successfully'
      stats.pagesScanned = scan.pages_scanned || 5
    } else if (scan.status === 'failed') {
      progress = 0
      message = 'Scan failed: ' + (scan.errors?.[0]?.message || 'Unknown error')
    }
    
    return NextResponse.json({
      success: true,
      data: {
        scanId,
        status: scan.status,
        progress,
        message,
        stats,
        startedAt: scan.started_at,
        completedAt: scan.completed_at
      }
    })
  } catch (error) {
    console.error('Error fetching scan progress:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scan progress' },
      { status: 500 }
    )
  }
}