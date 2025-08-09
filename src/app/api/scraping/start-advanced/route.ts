// src/app/api/scraping/start-advanced/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ScrapingRequest {
  method: 'apify-level' | 'standard' | 'stealth';
  features: {
    apiDiscovery: boolean;
    distributedComputing: boolean;
    antiDetection: boolean;
    realTimeUpdates: boolean;
  };
  targets: {
    totalListings: number;
    completionTime: number; // minutes
    qualityThreshold: number; // percentage
  };
}

export async function POST(request: NextRequest) {
  try {
    const scrapingRequest: ScrapingRequest = await request.json();
    
    // Validate request
    if (!scrapingRequest.method || !scrapingRequest.targets) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    console.log('🚀 Starting advanced scraping with config:', scrapingRequest);

    // Create scraping session
    const sessionId = `advanced_${Date.now()}_${scrapingRequest.method}`;
    
    const { data: session, error: sessionError } = await supabase
      .from('scraping_sessions')
      .insert({
        session_id: sessionId,
        total_listings: 0,
        pages_processed: 0,
        success_rate: 0,
        processing_time: 0,
        started_at: new Date().toISOString(),
        configuration: {
          type: `${scrapingRequest.method}_advanced`,
          features: scrapingRequest.features,
          targets: scrapingRequest.targets,
          apifyLevel: scrapingRequest.method === 'apify-level',
          speedImprovement: scrapingRequest.method === 'apify-level' ? 5.4 : 1,
          qualityImprovement: scrapingRequest.method === 'apify-level' ? 3 : 1,
          cloudflareBypass: scrapingRequest.features.antiDetection,
          workers: scrapingRequest.features.distributedComputing ? 8 : 1
        }
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json({ error: 'Failed to create scraping session' }, { status: 500 });
    }

    // Determine which scraper to use
    let scraperScript: string;
    
    switch (scrapingRequest.method) {
      case 'apify-level':
        if (scrapingRequest.features.apiDiscovery) {
          scraperScript = 'apify-level-api-discovery.js';
        } else if (scrapingRequest.features.distributedComputing) {
          scraperScript = 'apify-level-distributed-system.js';
        } else {
          scraperScript = 'apify-level-integrated-scraper.js';
        }
        break;
      
      case 'stealth':
        scraperScript = 'apify-level-anti-detection.js';
        break;
      
      default:
        scraperScript = 'unified-marketplace-scraper.js';
        break;
    }

    const scriptPath = path.join(process.cwd(), 'scripts', scraperScript);
    
    console.log(`📂 Executing scraper: ${scriptPath}`);

    // Spawn the scraper process
    const scraperProcess = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        SCRAPING_SESSION_ID: sessionId,
        SCRAPING_METHOD: scrapingRequest.method,
        TARGET_LISTINGS: scrapingRequest.targets.totalListings.toString(),
        QUALITY_THRESHOLD: scrapingRequest.targets.qualityThreshold.toString(),
        REAL_TIME_UPDATES: scrapingRequest.features.realTimeUpdates.toString()
      },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    // Handle scraper output
    scraperProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`📊 Scraper output: ${output}`);
      
      // Parse progress updates from scraper output
      if (output.includes('✅ Page') || output.includes('Progress:')) {
        // Extract metrics and update session
        updateSessionProgress(sessionId, output);
      }
    });

    scraperProcess.stderr?.on('data', (data) => {
      console.error(`❌ Scraper error: ${data.toString()}`);
    });

    scraperProcess.on('close', async (code) => {
      console.log(`🏁 Scraper process exited with code: ${code}`);
      
      // Update session as completed
      await supabase
        .from('scraping_sessions')
        .update({
          completed_at: new Date().toISOString(),
          processing_time: Date.now() - new Date(session.started_at).getTime()
        })
        .eq('session_id', sessionId);
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Advanced scraping started successfully',
      config: scrapingRequest,
      expectedCompletion: scrapingRequest.targets.completionTime
    });

  } catch (error) {
    console.error('Failed to start advanced scraping:', error);
    return NextResponse.json({ 
      error: 'Failed to start scraping',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function updateSessionProgress(sessionId: string, output: string) {
  try {
    // Extract progress information from scraper output
    const pageMatch = output.match(/Page (\d+)/);
    const listingsMatch = output.match(/(\d+) listings/);
    const progressMatch = output.match(/(\d+\.?\d*)%/);
    
    const updateData: any = {};
    
    if (pageMatch) {
      updateData.pages_processed = parseInt(pageMatch[1]);
    }
    
    if (listingsMatch) {
      updateData.total_listings = parseInt(listingsMatch[1]);
    }
    
    if (progressMatch) {
      updateData.success_rate = Math.round(parseFloat(progressMatch[1]));
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('scraping_sessions')
        .update(updateData)
        .eq('session_id', sessionId);
    }
  } catch (error) {
    console.error('Failed to update session progress:', error);
  }
}