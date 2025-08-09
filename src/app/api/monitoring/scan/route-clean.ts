import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { manual = false, options = {} } = body
    
    // Check monitoring mode
    const mode = process.env.MONITORING_MODE || 'auto'
    console.log(`🔧 Monitoring mode: ${mode}`)
    
    // If production mode, use real scraping
    if (mode === 'production') {
      console.log('🚀 Using real Flippa scraping (production mode)')
      
      try {
        const { RealFlippaScraper } = await import('@/lib/scraping/real-flippa-scraper.js')
        const scraper = new RealFlippaScraper()
        
        const result = await scraper.performScan({
          maxPages: options.pages || 2,
          manual
        })
        
        return NextResponse.json(result)
        
      } catch (realError) {
        console.error('Real scraping failed, falling back:', realError.message)
        
        // Fall back to mock data if real scraping fails
        return NextResponse.json({
          success: true,
          scanId: `fallback_scan_${Date.now()}`,
          results: {
            scanId: `fallback_scan_${Date.now()}`,
            duration: 30,
            pagesScanned: 2,
            scannedListings: 0,
            newListings: 0,
            priceChanges: 0,
            deletedListings: 0,
            totalChanges: 0,
            mode: 'fallback',
            message: 'Real scraping failed, using fallback mode',
            error: realError.message
          },
          timestamp: new Date().toISOString()
        })
      }
    }
    
    // Mock mode - return simulated data
    console.log('🎭 Using mock scraping mode')
    
    const scanId = `mock_scan_${Date.now()}`
    const mockResults = {
      scannedListings: 25,
      newListings: Math.floor(Math.random() * 5) + 1,
      priceChanges: Math.floor(Math.random() * 3),
      deletedListings: Math.floor(Math.random() * 2),
      totalChanges: 0
    }
    
    mockResults.totalChanges = mockResults.newListings + mockResults.priceChanges + mockResults.deletedListings
    
    return NextResponse.json({
      success: true,
      scanId,
      results: {
        scanId,
        duration: 45,
        pagesScanned: 3,
        ...mockResults,
        mode: 'mock',
        message: 'Using simulated data (mock mode)'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Monitoring scan error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Monitoring scan failed',
      details: error.message,
      scanId: `error_scan_${Date.now()}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}