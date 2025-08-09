import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Use monitoring scan as the scraping endpoint
    const scanResponse = await fetch(new URL('/api/monitoring/scan', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manual: true,
        mode: body.mode || 'incremental',
        ...body.options
      })
    })
    
    if (!scanResponse.ok) {
      const errorText = await scanResponse.text()
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to start scraping',
          details: errorText
        },
        { status: scanResponse.status }
      )
    }
    
    const scanResult = await scanResponse.json()
    return NextResponse.json({
      success: true,
      sessionId: scanResult.scanId,
      ...scanResult
    })
    
  } catch (error: any) {
    console.error('Error in /api/scraping/start:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start scraping',
        details: error.message
      },
      { status: 500 }
    )
  }
}