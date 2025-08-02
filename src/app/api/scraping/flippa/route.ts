import { NextRequest, NextResponse } from 'next/server';
import FlippaScraperEngine from '@/scripts/flippa-scraper-engine';
import FlippaDataProcessor from '@/scripts/flippa-data-processor';
import FlippaDatabaseManager from '@/lib/database/flippa-db-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    const dbManager = new FlippaDatabaseManager();
    
    switch (action) {
      case 'stats':
        const timeframe = searchParams.get('timeframe') || '24h';
        const stats = await dbManager.getScrapingStats(timeframe);
        return NextResponse.json(stats);
        
      case 'performance':
        const scraper = new FlippaScraperEngine();
        const performance = scraper.getPerformanceReport();
        return NextResponse.json(performance);
        
      default:
        return NextResponse.json({ 
          status: 'ready',
          endpoints: ['/stats', '/performance', '/scrape'],
          version: '1.0'
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, options = {} } = body;
    
    if (action !== 'scrape') {
      return NextResponse.json(
        { error: 'Invalid action. Use action: "scrape"' },
        { status: 400 }
      );
    }
    
    // Initialize components
    const scraper = new FlippaScraperEngine();
    const processor = new FlippaDataProcessor();
    const dbManager = new FlippaDatabaseManager();
    
    // Create job record
    const job = await dbManager.createScrapingJob({
      type: options.type || 'manual',
      parameters: options
    });
    
    try {
      // Perform scraping
      const url = options.url || 'https://flippa.com/search';
      const listings = await scraper.scrapeWithApifyMethodology(url, options);
      
      // Process data
      const { processed, errors, stats } = await processor.processListings(listings);
      
      // Save to database
      await dbManager.saveListings(processed);
      
      // Update job status
      await dbManager.updateScrapingJob(job.id, {
        status: 'completed',
        results_count: processed.length,
        error_count: errors.length,
        stats,
        completed_at: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: true,
        jobId: job.id,
        results: {
          processed: processed.length,
          errors: errors.length,
          stats
        }
      });
      
    } catch (error) {
      // Update job with error
      await dbManager.updateScrapingJob(job.id, {
        status: 'failed',
        error_message: error.message
      });
      
      throw error;
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
