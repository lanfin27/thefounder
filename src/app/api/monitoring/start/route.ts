import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Redirect to the actual scan endpoint
    const scanResponse = await fetch(new URL('/api/monitoring/scan', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manual: body.manual || true,
        ...body
      })
    })
    
    if (!scanResponse.ok) {
      const errorText = await scanResponse.text()
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to start monitoring',
          details: errorText
        },
        { status: scanResponse.status }
      )
    }
    
    const scanResult = await scanResponse.json()
    return NextResponse.json(scanResult)
    
  } catch (error: any) {
    console.error('Error in /api/monitoring/start:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start monitoring',
        details: error.message
      },
      { status: 500 }
    )
  }
}