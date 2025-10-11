import { NextRequest, NextResponse } from 'next/server';
import { SmartFlippaScanner } from '@/lib/scraping/smart-flippa-scanner';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// GET - Get incremental scan status
export async function GET() {
  try {
    // Return current scan status
    return NextResponse.json({
      success: true,
      data: {
        status: 'ready',
        lastScan: null,
        capabilities: [
          'Detect new listings',
          'Track price changes',
          'Monitor status updates',
          'Identify deleted listings',
          'Calculate change scores',
          'Generate notifications'
        ]
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Start incremental scan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      maxPages = 5,
      checkModified = true,
      notifyHighValue = true
    } = body;

    console.log('🚀 Starting incremental scan with options:', {
      maxPages,
      checkModified,
      notifyHighValue
    });

    // Create scanner instance
    const scanner = new SmartFlippaScanner();
    
    // Perform incremental scan
    const result = await scanner.performIncrementalScan({
      maxPages,
      checkModified,
      notifyHighValue
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('❌ Incremental scan error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.stack
      },
      { status: 500 }
    );
  }
}