import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Bull from 'bull';
import Redis from 'ioredis';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create queue connection
const scrapingQueue = new Bull('flippa-insights-queue', {
  redis: redisConfig as any
});

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'summary';
    
    if (view === 'health') {
      // Queue health check
      const [waiting, active, completed, failed] = await Promise.all([
        scrapingQueue.getWaitingCount(),
        scrapingQueue.getActiveCount(),
        scrapingQueue.getCompletedCount(),
        scrapingQueue.getFailedCount()
      ]);
      
      return NextResponse.json({
        queue: 'flippa-insights',
        status: 'active',
        counts: { waiting, active, completed, failed },
        timestamp: new Date().toISOString()
      });
    }
    
    if (view === 'insights') {
      // Get recent insights
      const { data: insights, error } = await supabase
        .from('scraping_insights')
        .select('*')
        .eq('source', 'flippa')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return NextResponse.json({
        insights,
        count: insights?.length || 0
      });
    }
    
    if (view === 'quality') {
      // Get quality metrics over time
      const { data: listings, error } = await supabase
        .from('scraped_listings')
        .select('quality_score, data_completeness, extraction_confidence, scraped_at')
        .eq('source', 'flippa')
        .gte('scraped_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('scraped_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate averages by day
      const dailyMetrics: Record<string, any> = {};
      
      listings?.forEach(listing => {
        const date = new Date(listing.scraped_at).toISOString().split('T')[0];
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = {
            count: 0,
            totalQuality: 0,
            totalCompleteness: 0,
            totalConfidence: 0
          };
        }
        
        dailyMetrics[date].count++;
        dailyMetrics[date].totalQuality += listing.quality_score || 0;
        dailyMetrics[date].totalCompleteness += listing.data_completeness || 0;
        dailyMetrics[date].totalConfidence += listing.extraction_confidence || 0;
      });
      
      const qualityTrends = Object.entries(dailyMetrics).map(([date, metrics]) => ({
        date,
        avgQuality: (metrics.totalQuality / metrics.count).toFixed(1),
        avgCompleteness: (metrics.totalCompleteness / metrics.count).toFixed(1),
        avgConfidence: (metrics.totalConfidence / metrics.count).toFixed(1),
        count: metrics.count
      }));
      
      return NextResponse.json({
        trends: qualityTrends,
        totalListings: listings?.length || 0
      });
    }
    
    // Default: Summary view
    const [recentListings, queueStatus, latestInsight] = await Promise.all([
      // Recent high-quality listings
      supabase
        .from('scraped_listings')
        .select('*')
        .eq('source', 'flippa')
        .gte('quality_score', 70)
        .order('scraped_at', { ascending: false })
        .limit(10),
      
      // Queue status
      Promise.all([
        scrapingQueue.getWaitingCount(),
        scrapingQueue.getActiveCount(),
        scrapingQueue.getCompletedCount(),
        scrapingQueue.getFailedCount()
      ]),
      
      // Latest insight report
      supabase
        .from('scraping_insights')
        .select('*')
        .eq('source', 'flippa')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    ]);
    
    return NextResponse.json({
      summary: {
        recentHighQuality: recentListings.data?.length || 0,
        queueStatus: {
          waiting: queueStatus[0],
          active: queueStatus[1],
          completed: queueStatus[2],
          failed: queueStatus[3]
        },
        latestInsight: latestInsight.data?.report || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'incremental', options = {} } = body;
    
    // Validate job type
    const validTypes = ['full-scan', 'incremental', 'quality-check', 'category-focus'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid job type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Add job to queue
    const job = await scrapingQueue.add(type, {
      type,
      options: {
        ...options,
        triggeredBy: 'api',
        timestamp: new Date().toISOString()
      }
    });
    
    // Log the trigger
    await supabase
      .from('scraping_logs')
      .insert({
        job_id: job.id.toString(),
        job_type: type,
        status: 'queued',
        options,
        source: 'flippa-insights',
        created_at: new Date().toISOString()
      });
    
    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type,
        status: 'queued',
        options
      }
    });
    
  } catch (error) {
    console.error('Error triggering insight scraping:', error);
    return NextResponse.json(
      { error: 'Failed to trigger scraping' },
      { status: 500 }
    );
  }
}