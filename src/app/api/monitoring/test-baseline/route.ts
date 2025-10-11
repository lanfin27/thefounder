import { NextResponse } from 'next/server';
import { SmartFlippaScanner } from '@/lib/scraping/smart-flippa-scanner';

export const runtime = 'nodejs';

// GET - Test baseline loading
export async function GET() {
  try {
    console.log('🧪 Testing baseline loading in SmartFlippaScanner...');
    
    // Create scanner instance
    const scanner = new SmartFlippaScanner();
    
    // Access the private method through a test wrapper
    // Since getBaseline is private, we'll test through performIncrementalScan with minimal pages
    const result = await scanner.performIncrementalScan({
      maxPages: 0, // Don't actually scrape Flippa, just test baseline loading
      checkModified: false,
      notifyHighValue: false
    });
    
    return NextResponse.json({
      success: true,
      message: 'Check server logs for baseline loading details',
      scanId: result.scanId,
      stats: result.stats
    });

  } catch (error: any) {
    console.error('❌ Test baseline error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}