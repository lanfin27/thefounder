// src/app/api/scraping/high-performance/route.ts
// High-Performance Scraping API Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HighPerformanceRequest {
  targetListings: number;
  targetCompletionTime: number; // minutes
  enableAPIDiscovery: boolean;
  enableDistributed: boolean;
  optimizationMode: 'speed' | 'reliability' | 'balanced';
}

export async function POST(request: NextRequest) {
  try {
    const config: HighPerformanceRequest = await request.json();
    
    // Validate request
    if (!config.targetListings || config.targetListings < 1) {
      return NextResponse.json({ error: 'Invalid target listings' }, { status: 400 });
    }

    console.log('🚀 Starting High-Performance Scraping');
    console.log('Configuration:', config);

    // Create scraping session
    const sessionId = `hp_${Date.now()}_${config.optimizationMode}`;
    
    const { data: session, error: sessionError } = await supabase
      .from('scraping_sessions')
      .insert({
        session_id: sessionId,
        total_listings: 0,
        pages_processed: 0,
        success_rate: 0,
        processing_time: 0,
        method: 'high-performance',
        started_at: new Date().toISOString(),
        configuration: {
          type: 'high_performance_v2',
          features: {
            apiDiscovery: config.enableAPIDiscovery,
            distributedComputing: config.enableDistributed,
            antiDetection: true,
            realTimeUpdates: true
          },
          targets: {
            totalListings: config.targetListings,
            completionTime: config.targetCompletionTime,
            qualityThreshold: 95
          },
          optimizationMode: config.optimizationMode,
          expectedPerformance: {
            listingsPerMinute: 1000,
            speedImprovement: '200x',
            architecture: 'API-first with distributed fallback'
          }
        }
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json({ error: 'Failed to create scraping session' }, { status: 500 });
    }

    // Determine scraper script path
    const scriptPath = path.join(process.cwd(), 'scripts', 'high-performance-scraper', 'index.js');
    
    console.log(`📂 Executing high-performance scraper: ${scriptPath}`);

    // Spawn the high-performance scraper process
    const scraperProcess = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        SCRAPING_SESSION_ID: sessionId,
        TARGET_LISTINGS: config.targetListings.toString(),
        TARGET_COMPLETION_TIME: config.targetCompletionTime.toString(),
        ENABLE_API_DISCOVERY: config.enableAPIDiscovery.toString(),
        ENABLE_DISTRIBUTED: config.enableDistributed.toString(),
        OPTIMIZATION_MODE: config.optimizationMode
      },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    // Handle scraper output
    scraperProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`📊 HP Scraper: ${output}`);
      
      // Parse progress updates
      updateSessionProgress(sessionId, output);
    });

    scraperProcess.stderr?.on('data', (data) => {
      console.error(`❌ HP Scraper error: ${data.toString()}`);
    });

    scraperProcess.on('close', async (code) => {
      console.log(`🏁 High-performance scraper exited with code: ${code}`);
      
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
      message: 'High-performance scraping started',
      config,
      expectedPerformance: {
        completionTime: `${config.targetCompletionTime} minutes`,
        throughput: '1000+ listings/minute',
        technology: 'API-first hybrid with distributed processing'
      }
    });

  } catch (error) {
    console.error('Failed to start high-performance scraping:', error);
    return NextResponse.json({ 
      error: 'Failed to start scraping',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function updateSessionProgress(sessionId: string, output: string) {
  try {
    // Extract metrics from output
    const progressMatch = output.match(/Progress:\s*(\d+)\/(\d+)\s*listings/);
    const rateMatch = output.match(/Rate:\s*(\d+)\s*listings\/minute/);
    const successMatch = output.match(/Success Rate:\s*([\d.]+)%/);
    const etaMatch = output.match(/ETA:\s*([\d.]+)\s*minutes/);
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (progressMatch) {
      updateData.total_listings = parseInt(progressMatch[1]);
      const target = parseInt(progressMatch[2]);
      updateData.configuration = {
        progress: {
          current: updateData.total_listings,
          target,
          percentage: (updateData.total_listings / target * 100).toFixed(1)
        }
      };
    }
    
    if (rateMatch) {
      updateData.configuration = {
        ...updateData.configuration,
        performance: {
          listingsPerMinute: parseInt(rateMatch[1])
        }
      };
    }
    
    if (successMatch) {
      updateData.success_rate = Math.round(parseFloat(successMatch[1]));
    }
    
    if (etaMatch) {
      updateData.configuration = {
        ...updateData.configuration,
        eta: parseFloat(etaMatch[1])
      };
    }

    if (Object.keys(updateData).length > 1) {
      await supabase
        .from('scraping_sessions')
        .update(updateData)
        .eq('session_id', sessionId);
    }
  } catch (error) {
    console.error('Failed to update session progress:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get performance metrics
    const { data: sessions, error } = await supabase
      .from('scraping_sessions')
      .select('*')
      .eq('method', 'high-performance')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // Calculate average performance
    const metrics = sessions.reduce((acc, session) => {
      if (session.configuration?.performance?.listingsPerMinute) {
        acc.totalRate += session.configuration.performance.listingsPerMinute;
        acc.count++;
      }
      return acc;
    }, { totalRate: 0, count: 0 });

    const avgListingsPerMinute = metrics.count > 0 
      ? Math.round(metrics.totalRate / metrics.count)
      : 0;

    return NextResponse.json({
      success: true,
      recentSessions: sessions,
      performanceMetrics: {
        avgListingsPerMinute,
        expectedImprovement: '200x',
        technology: 'API-first hybrid scraping'
      }
    });

  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}