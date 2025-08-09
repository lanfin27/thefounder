// api/scraping/enhanced/route.ts
// Enhanced scraping API endpoint using the rebuilt browser simulation system

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Note: These imports will need to be adjusted based on actual build setup
// For now, using dynamic imports with error handling

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Global enhanced scraper instance
let enhancedScraper: any = null;
let sessionMetrics = {
  startTime: 0,
  itemsScraped: 0,
  errors: 0,
  targetItems: 100,
  status: 'idle' as 'idle' | 'initializing' | 'running' | 'completed' | 'error',
  browserLibrary: 'unknown',
  stealthLevel: 'basic'
};

export async function POST(request: NextRequest) {
  const sessionId = uuidv4();
  
  try {
    const body = await request.json();
    const { 
      targetItems = 100,
      stealthLevel = 'basic',
      runTests = false,
      timeout = 30000,
      startUrl = 'https://example.com'
    } = body;

    if (enhancedScraper?.getStatus().initialized) {
      return NextResponse.json(
        { error: 'Enhanced scraping already in progress' },
        { status: 400 }
      );
    }

    // Reset metrics
    sessionMetrics = {
      startTime: Date.now(),
      itemsScraped: 0,
      errors: 0,
      targetItems,
      status: 'initializing',
      browserLibrary: 'unknown',
      stealthLevel
    };

    // Initialize enhanced scraper with progressive enhancement
    try {
      const { EnhancedBrowserScraper } = await import('@/lib/browser-automation/enhanced-scraper');
      
      enhancedScraper = new EnhancedBrowserScraper({
        headless: true,
        timeout,
        viewport: { width: 1366, height: 768 },
        stealth: {
          level: stealthLevel as any,
          features: {
            webdriver: stealthLevel !== 'none',
            userAgent: ['basic', 'enhanced', 'advanced', 'maximum'].includes(stealthLevel),
            navigator: ['enhanced', 'advanced', 'maximum'].includes(stealthLevel),
            webgl: ['advanced', 'maximum'].includes(stealthLevel),
            canvas: ['advanced', 'maximum'].includes(stealthLevel),
            plugins: ['enhanced', 'advanced', 'maximum'].includes(stealthLevel)
          },
          fallbackStrategies: true
        },
        delays: {
          navigation: stealthLevel === 'maximum' ? 3000 : 2000,
          interaction: 1000,
          reading: 1500
        },
        validation: {
          runTests,
          testSuites: runTests ? ['basic', 'stealth'] : []
        }
      });

      // Set up event listeners
      enhancedScraper.on('initialized', (data: any) => {
        sessionMetrics.browserLibrary = data.browserAPI?.library || 'unknown';
        sessionMetrics.status = 'running';
        console.log('Enhanced scraper initialized:', data);
      });

      enhancedScraper.on('progress', (progress: any) => {
        console.log('Scraping progress:', progress);
        
        if (progress.stage === 'scraping' && progress.data) {
          sessionMetrics.itemsScraped = progress.data.length || 0;
        }
      });

      enhancedScraper.on('scrapingComplete', async (result: any) => {
        sessionMetrics.status = 'completed';
        sessionMetrics.itemsScraped = result.data.length;
        console.log('Enhanced scraping completed:', result);

        // Save results to database if available
        await saveScrapingResults(result, sessionId);
      });

      enhancedScraper.on('testResults', (report: any) => {
        console.log('Test results:', {
          passed: report.passed,
          failed: report.failed,
          compatibility: report.compatibility
        });
      });

      // Start initialization in background
      startEnhancedScraping(startUrl, targetItems);

    } catch (importError) {
      console.error('Failed to import enhanced scraper:', importError);
      
      // Fallback to simple scraper
      return await fallbackToSimpleScraper(request, sessionId);
    }

    // Create session record
    let session = null;
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('scraping_sessions')
        .insert({
          session_id: sessionId,
          method: 'enhanced-browser-automation',
          status: 'initializing',
          total_listings: 0,
          successful_extractions: 0,
          failed_extractions: 0,
          extraction_rate: 0.0,
          stealth_level: stealthLevel,
          browser_library: 'playwright',
          session_type: 'enhanced',
          started_at: new Date().toISOString(),
          configuration: {
            type: 'enhanced-browser-automation',
            targetItems,
            stealthLevel,
            runTests,
            timeout,
            approach: 'Progressive Enhancement with Fallbacks'
          }
        })
        .select()
        .single();

      if (!sessionError) {
        session = sessionData;
      }
    } catch (dbError) {
      console.warn('Database session creation failed:', dbError);
    }

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Enhanced browser automation started',
      config: {
        approach: 'Progressive Enhancement with Fallbacks',
        stealthLevel,
        targetItems,
        runTests,
        timeout,
        features: {
          libraryDetection: true,
          universalBrowserAPI: true,
          progressiveStealth: true,
          methodTesting: runTests,
          comprehensiveFallbacks: true
        }
      },
      estimatedDuration: `${Math.ceil(targetItems / 20)} minutes`,
      enhancedMode: true
    });

  } catch (error) {
    console.error('Failed to start enhanced scraping:', error);
    sessionMetrics.status = 'error';
    
    return NextResponse.json({
      error: 'Failed to start enhanced scraping',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback: 'Consider using /api/scraping/simple for basic functionality'
    }, { status: 500 });
  }
}

async function startEnhancedScraping(startUrl: string, targetItems: number) {
  if (!enhancedScraper) return;

  try {
    // Initialize the enhanced scraper
    await enhancedScraper.initialize();

    // Define extraction function
    const extractorFunction = async (page: any) => {
      return await page.evaluate(() => {
        const data: any = {};
        
        // Extract basic page information
        data.title = document.title;
        data.url = window.location.href;
        data.timestamp = new Date().toISOString();
        
        // Try to extract common data patterns
        const selectors = [
          { key: 'headings', selector: 'h1, h2, h3', attr: 'textContent' },
          { key: 'links', selector: 'a[href]', attr: 'href' },
          { key: 'images', selector: 'img[src]', attr: 'src' },
          { key: 'paragraphs', selector: 'p', attr: 'textContent' }
        ];

        for (const { key, selector, attr } of selectors) {
          const elements = document.querySelectorAll(selector);
          data[key] = Array.from(elements)
            .slice(0, 5) // Limit to first 5 elements
            .map(el => (el as any)[attr])
            .filter(val => val && val.trim());
        }

        return data;
      });
    };

    // Start scraping
    const result = await enhancedScraper.scrapeWebsite(
      startUrl,
      extractorFunction,
      {
        maxPages: Math.min(5, Math.ceil(targetItems / 20)),
        followLinks: targetItems > 20,
        linkSelector: 'a[href*="http"]'
      }
    );

    console.log('Enhanced scraping completed:', {
      success: result.success,
      itemCount: result.data.length,
      duration: result.metadata.duration,
      browserLibrary: result.metadata.browserLibrary
    });

    sessionMetrics.status = result.success ? 'completed' : 'error';
    sessionMetrics.itemsScraped = result.data.length;

  } catch (error) {
    console.error('Enhanced scraping process error:', error);
    sessionMetrics.status = 'error';
    sessionMetrics.errors++;
  } finally {
    if (enhancedScraper) {
      await enhancedScraper.cleanup();
    }
  }
}

async function fallbackToSimpleScraper(request: NextRequest, sessionId: string) {
  console.log('🔄 Falling back to simple scraper...');
  
  try {
    // Import simple scraper as fallback
    const { default: SimpleBrowserScraper } = await import('@/lib/browser-simulation/simple-scraper');
    
    const body = await request.json();
    const { targetItems = 100 } = body;
    
    const simpleScraper = new SimpleBrowserScraper({
      headless: true,
      timeout: 30000,
      delays: {
        navigation: 2000,
        interaction: 1000,
        reading: 1500
      }
    });

    // Initialize and start simple scraping
    await simpleScraper.initialize();
    
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Enhanced scraper unavailable, using simple fallback',
      config: {
        approach: 'Simple Browser Automation (Fallback)',
        targetItems,
        features: {
          basicNavigation: true,
          simpleExtraction: true,
          fallbackMode: true
        }
      },
      fallbackMode: true,
      enhancedMode: false
    });

  } catch (fallbackError) {
    console.error('Fallback scraper also failed:', fallbackError);
    
    return NextResponse.json({
      error: 'Both enhanced and fallback scrapers failed',
      details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
      recommendation: 'Check browser automation library installation'
    }, { status: 500 });
  }
}

async function saveScrapingResults(result: any, sessionId: string) {
  try {
    // Save each scraped item
    for (const item of result.data) {
      await supabase
        .from('scraped_data')
        .insert({
          session_id: sessionId,
          url: item.url,
          title: item.title,
          data: item,
          scraped_at: item.timestamp,
          source: 'enhanced-browser-automation'
        });
    }

    // Update session
    await supabase
      .from('scraping_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_listings: result.data.length,
        successful_extractions: result.data.length,
        failed_extractions: result.metadata.errors?.length || 0,
        pages_visited: result.metadata.pagesVisited,
        processing_time: result.metadata.duration,
        extraction_rate: result.metadata.duration > 0 ? 
          Math.round((result.data.length / (result.metadata.duration / 1000 / 60)) * 100) / 100 : 0,
        browser_library: result.metadata.browserLibrary || 'playwright',
        fallbacks_used: result.metadata.fallbacksUsed || [],
        stealth_features_applied: result.metadata.stealthFeatures || [],
        final_metrics: {
          browserLibrary: result.metadata.browserLibrary,
          stealthLevel: result.metadata.stealthLevel,
          pagesVisited: result.metadata.pagesVisited,
          fallbacksUsed: result.metadata.fallbacksUsed,
          errors: result.metadata.errors
        }
      })
      .eq('session_id', sessionId);

  } catch (error) {
    console.warn('Failed to save scraping results:', error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  try {
    const status = enhancedScraper?.getStatus() || {
      initialized: false,
      browserLibrary: 'unknown',
      stealthLevel: 'none',
      hasBrowser: false
    };

    const elapsedTime = (Date.now() - sessionMetrics.startTime) / 1000 / 60; // minutes
    const itemsPerMinute = elapsedTime > 0 ? sessionMetrics.itemsScraped / elapsedTime : 0;

    return NextResponse.json({
      success: true,
      enhancedMode: true,
      session: {
        sessionId: sessionId || `enhanced_${sessionMetrics.startTime}`,
        status: sessionMetrics.status,
        active: status.initialized
      },
      progress: {
        itemsScraped: sessionMetrics.itemsScraped,
        errors: sessionMetrics.errors,
        targetItems: sessionMetrics.targetItems,
        progressPercentage: Math.round((sessionMetrics.itemsScraped / sessionMetrics.targetItems) * 100),
        elapsedTime: Math.round(elapsedTime)
      },
      performance: {
        itemsPerMinute: Math.round(itemsPerMinute * 10) / 10,
        browserLibrary: sessionMetrics.browserLibrary,
        stealthLevel: sessionMetrics.stealthLevel,
        scrapeMethod: 'Enhanced Browser Automation'
      },
      systemStatus: status,
      features: {
        libraryDetection: true,
        universalAPI: true,
        progressiveStealth: true,
        methodTesting: true,
        comprehensiveFallbacks: true
      }
    });

  } catch (error) {
    console.error('Error getting enhanced scraping status:', error);
    return NextResponse.json({
      error: 'Failed to get status',
      details: error instanceof Error ? error.message : 'Unknown error',
      enhancedMode: true
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (enhancedScraper) {
      await enhancedScraper.cleanup();
      enhancedScraper = null;
    }

    const finalMetrics = { ...sessionMetrics };
    sessionMetrics.status = 'idle';

    return NextResponse.json({
      success: true,
      message: 'Enhanced scraping stopped successfully',
      enhancedMode: true,
      finalMetrics: {
        ...finalMetrics,
        duration: Math.round((Date.now() - finalMetrics.startTime) / 1000 / 60), // minutes
        finalRate: finalMetrics.itemsScraped / Math.max(1, (Date.now() - finalMetrics.startTime) / 1000 / 60),
        browserLibrary: finalMetrics.browserLibrary,
        stealthLevel: finalMetrics.stealthLevel
      }
    });

  } catch (error) {
    console.error('Error stopping enhanced scraping:', error);
    return NextResponse.json({
      error: 'Failed to stop enhanced scraping',
      details: error instanceof Error ? error.message : 'Unknown error',
      enhancedMode: true
    }, { status: 500 });
  }
}