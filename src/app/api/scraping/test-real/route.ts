import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🧪 Testing real Flippa scraping...')
    
    // Import the scraper
    const { RealFlippaScraper } = await import('@/lib/scraping/real-flippa-scraper.js')
    const scraper = new RealFlippaScraper()
    
    // Test basic HTTP request to Flippa
    const testUrl = 'https://flippa.com/search?page=1'
    console.log(`📡 Making test request to: ${testUrl}`)
    
    const response = await scraper.makeRequest(testUrl)
    
    if (response.statusCode !== 200) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.statusCode}`,
        details: `Failed to fetch Flippa page: ${response.statusCode}`,
        url: testUrl
      }, { status: 500 })
    }
    
    // Parse the HTML response
    console.log(`✅ Response received: ${response.body.length} characters`)
    const listings = scraper.parseListings(response.body)
    
    // Extract some sample data for demonstration
    const htmlSample = response.body.substring(0, 1000)
    const hasFlippaContent = response.body.toLowerCase().includes('flippa')
    const hasListings = response.body.toLowerCase().includes('listing')
    const priceMatches = response.body.match(/\$[\d,]+/g)?.slice(0, 10) || []
    
    return NextResponse.json({
      success: true,
      data: {
        testUrl,
        responseStatus: response.statusCode,
        contentLength: response.body.length,
        hasFlippaContent,
        hasListings,
        priceMatches,
        parsedListings: listings.slice(0, 5), // Show first 5 for testing
        htmlSample: htmlSample.replace(/</g, '&lt;'), // Safe HTML display
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error: any) {
    console.error('Real scraping test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Real scraping test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}