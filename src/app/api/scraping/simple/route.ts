// api/scraping/simple/route.ts
// Simplified scraping API endpoint using fallback browser automation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import SimpleBrowserScraper from '@/lib/browser-simulation/simple-scraper';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Global instance for simple scraping
let simpleScraper: SimpleBrowserScraper | null = null;
let sessionMetrics = {
  startTime: 0,
  listingsScraped: 0,
  errors: 0,
  targetListings: 100,
  status: 'idle' as 'idle' | 'running' | 'completed' | 'error'
};

export async function POST(request: NextRequest) {
  const sessionId = uuidv4();
  
  try {
    const body = await request.json();
    const { 
      targetListings = 100,
      startUrl = 'https://flippa.com/search?filter%5Bproperty_type%5D=website,established_website,starter_site&page%5Bsize%5D=24'
    } = body;

    if (simpleScraper?.getStatus().active) {
      return NextResponse.json(
        { error: 'Simple scraping already in progress' },
        { status: 400 }
      );
    }

    // Reset metrics
    sessionMetrics = {
      startTime: Date.now(),
      listingsScraped: 0,
      errors: 0,
      targetListings,
      status: 'running'
    };

    // Initialize simple scraper
    simpleScraper = new SimpleBrowserScraper({
      headless: true,
      timeout: 30000,
      delays: {
        navigation: 2000,
        interaction: 1000,
        reading: 1500
      }
    });

    // Create scraping session in database (with fallback)
    let session = null;
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('scraping_sessions')
        .insert({
          session_id: sessionId,
          method: 'simple-browser-scraper',
          status: 'running',
          total_listings: 0,
          started_at: new Date().toISOString(),
          configuration: {
            type: 'simple-browser-scraper',
            targetListings,
            approach: 'Simplified Browser Automation',
            delays: '1-3 seconds',
            stealth: 'basic'
          }
        })
        .select()
        .single();

      if (sessionError) {
        console.warn('Database session creation failed, continuing without DB:', sessionError);
      } else {  
        session = sessionData;
      }
    } catch (dbError) {
      console.warn('Database not available, continuing without persistence:', dbError);
    }

    // Set up event listeners
    simpleScraper.on('started', (data) => {
      console.log('Simple scraping started:', data);
    });

    simpleScraper.on('listingScraped', async (data) => {
      sessionMetrics.listingsScraped = data.progress;
      
      // Save to database if available
      if (session) {
        try {
          await supabase
            .from('flippa_listings')
            .insert({
              ...data.listing,
              session_id: sessionId,
              source: 'simple-browser-scraper',
              extraction_method: 'simplified-automation'
            });
        } catch (dbError) {
          console.warn('Failed to save listing to database:', dbError);
        }
      }

      // Update session if available
      if (session) {
        try {
          await supabase
            .from('scraping_sessions')
            .update({
              total_listings: sessionMetrics.listingsScraped,
              last_activity: new Date().toISOString()
            })
            .eq('session_id', sessionId);
        } catch (dbError) {
          console.warn('Failed to update session:', dbError);
        }
      }
    });

    simpleScraper.on('error', (error) => {
      sessionMetrics.errors++;
      sessionMetrics.status = 'error';
      console.error('Simple scraping error:', error);
    });

    simpleScraper.on('completed', async (result) => {
      sessionMetrics.status = 'completed';
      sessionMetrics.listingsScraped = result.listings.length;
      console.log('Simple scraping completed:', result);

      // Final session update
      if (session) {
        try {
          await supabase
            .from('scraping_sessions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              total_listings: result.listings.length,
              processing_time: result.duration
            })
            .eq('session_id', sessionId);
        } catch (dbError) {
          console.warn('Failed to update final session status:', dbError);
        }
      }
    });

    // Start scraping in background
    startSimpleScraping(startUrl, targetListings);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Simple browser scraping started successfully',
      config: {
        approach: 'Simplified Browser Automation',
        targetListings,
        expectedDuration: `${Math.ceil(targetListings / 10)} minutes`,
        features: {
          basicStealth: true,
          humanDelays: true,
          standardNavigation: true,
          simpleExtraction: true
        }
      },
      fallbackMode: true,
      estimatedRate: '~10 listings/minute'
    });

  } catch (error) {
    console.error('Failed to start simple scraping:', error);
    sessionMetrics.status = 'error';
    
    return NextResponse.json({
      error: 'Failed to start simple scraping',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallbackMode: true
    }, { status: 500 });
  }
}

async function startSimpleScraping(startUrl: string, targetListings: number) {
  if (!simpleScraper) return;

  try {
    await simpleScraper.initialize();
    await simpleScraper.scrapeFlippaListings(startUrl, targetListings);
  } catch (error) {
    console.error('Simple scraping process error:', error);
    sessionMetrics.status = 'error';
    sessionMetrics.errors++;
  } finally {
    if (simpleScraper) {
      await simpleScraper.cleanup();
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  try {
    const status = simpleScraper?.getStatus() || {
      active: false,
      initialized: false,
      hasPage: false
    };

    const elapsedTime = (Date.now() - sessionMetrics.startTime) / 1000 / 60; // minutes
    const listingsPerMinute = elapsedTime > 0 ? sessionMetrics.listingsScraped / elapsedTime : 0;

    return NextResponse.json({
      success: true,
      fallbackMode: true,
      session: {
        sessionId: sessionId || `simple_${sessionMetrics.startTime}`,
        status: sessionMetrics.status,
        active: status.active
      },
      progress: {
        listingsScraped: sessionMetrics.listingsScraped,
        errors: sessionMetrics.errors,
        targetListings: sessionMetrics.targetListings,
        progressPercentage: Math.round((sessionMetrics.listingsScraped / sessionMetrics.targetListings) * 100),
        elapsedTime: Math.round(elapsedTime)
      },
      performance: {
        listingsPerMinute: Math.round(listingsPerMinute * 10) / 10,
        successRate: sessionMetrics.listingsScraped > 0 ? 
          Math.round(((sessionMetrics.listingsScraped) / (sessionMetrics.listingsScraped + sessionMetrics.errors)) * 100) : 100,
        scrapeMethod: 'Simple Browser Automation'
      },
      config: {
        approach: 'Simplified Browser Automation',
        stealth: 'Basic',
        delays: '1-3 seconds',
        expectedRate: '~10 listings/minute'
      },
      browserStatus: status
    });

  } catch (error) {
    console.error('Error getting simple scraping status:', error);
    return NextResponse.json({
      error: 'Failed to get status',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallbackMode: true
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (simpleScraper) {
      await simpleScraper.stop();
      await simpleScraper.cleanup();
      simpleScraper = null;
    }

    const finalMetrics = { ...sessionMetrics };
    sessionMetrics.status = 'idle';

    return NextResponse.json({
      success: true,
      message: 'Simple scraping stopped successfully',
      fallbackMode: true,
      finalMetrics: {
        ...finalMetrics,
        duration: Math.round((Date.now() - finalMetrics.startTime) / 1000 / 60), // minutes
        finalRate: finalMetrics.listingsScraped / Math.max(1, (Date.now() - finalMetrics.startTime) / 1000 / 60)
      }
    });

  } catch (error) {
    console.error('Error stopping simple scraping:', error);
    return NextResponse.json({
      error: 'Failed to stop simple scraping',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallbackMode: true
    }, { status: 500 });
  }
}