// api/scraping/standard/route.ts
// Simplified Standard Scraper API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Global state tracking
let isScrapingActive = false;
let currentSessionId: string | null = null;

export async function POST(request: NextRequest) {
  const sessionId = uuidv4();
  
  try {
    const body = await request.json();
    const { targetListings = 100 } = body;

    if (isScrapingActive) {
      return NextResponse.json(
        { error: 'Scraping already in progress' },
        { status: 400 }
      );
    }

    isScrapingActive = true;
    currentSessionId = sessionId;

    // Create session record with simplified schema
    const { error: sessionError } = await supabase
      .from('scraping_sessions')
      .insert({
        session_id: sessionId,
        method: 'simplified-standard',
        status: 'running',
        total_listings: 0,
        successful_extractions: 0,
        failed_extractions: 0,
        started_at: new Date().toISOString(),
        configuration: {
          type: 'simplified-standard',
          targetListings,
          approach: 'Single reliable scraper'
        }
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      isScrapingActive = false;
      currentSessionId = null;
      
      return NextResponse.json(
        { error: 'Failed to create session', details: sessionError.message },
        { status: 500 }
      );
    }

    // Start scraping in background using simplified scraper
    startBackgroundScraping(sessionId, targetListings);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Standard scraping started successfully',
      config: {
        approach: 'Simplified Reliable Scraper',
        targetListings,
        estimatedDuration: `${Math.ceil(targetListings / 20)} minutes`
      },
      features: {
        reliableExtraction: true,
        errorHandling: true,
        progressTracking: true,
        simplifiedArchitecture: true
      }
    });

  } catch (error) {
    console.error('Failed to start standard scraping:', error);
    isScrapingActive = false;
    currentSessionId = null;
    
    return NextResponse.json(
      { 
        error: 'Failed to start scraping', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function startBackgroundScraping(sessionId: string, targetListings: number) {
  try {
    console.log(`🚀 Starting background scraping for session ${sessionId}`);
    
    // Use the simplified scraper script
    const scraperPath = path.join(process.cwd(), 'simplified-scraper.js');
    
    const scraperProcess = spawn('node', [scraperPath], {
      env: {
        ...process.env,
        SCRAPING_SESSION_ID: sessionId,
        TARGET_LISTINGS: targetListings.toString()
      },
      stdio: 'pipe'
    });

    scraperProcess.stdout?.on('data', (data) => {
      console.log(`Scraper output: ${data}`);
    });

    scraperProcess.stderr?.on('data', (data) => {
      console.error(`Scraper error: ${data}`);
    });

    scraperProcess.on('close', async (code) => {
      console.log(`Scraper process exited with code ${code}`);
      
      // Update session status
      const status = code === 0 ? 'completed' : 'error';
      await supabase
        .from('scraping_sessions')
        .update({
          status,
          completed_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      isScrapingActive = false;
      currentSessionId = null;
    });

  } catch (error) {
    console.error('Background scraping failed:', error);
    
    // Update session with error
    await supabase
      .from('scraping_sessions')
      .update({
        status: 'error',
        completed_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    isScrapingActive = false;
    currentSessionId = null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') || currentSessionId;

  try {
    if (!sessionId) {
      return NextResponse.json({
        success: true,
        session: { active: false, status: 'idle' },
        progress: { listingsScraped: 0, targetListings: 0 },
        performance: { scrapeMethod: 'Simplified Standard' }
      });
    }

    // Get session from database
    const { data: session, error } = await supabase
      .from('scraping_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Session not found', details: error.message },
        { status: 404 }
      );
    }

    // Get listings count
    const { count: listingsCount } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.session_id,
        status: session.status,
        active: session.status === 'running'
      },
      progress: {
        listingsScraped: listingsCount || 0,
        targetListings: session.configuration?.targetListings || 100,
        progressPercentage: Math.round(((listingsCount || 0) / (session.configuration?.targetListings || 100)) * 100)
      },
      performance: {
        scrapeMethod: 'Simplified Standard Scraper',
        startedAt: session.started_at,
        completedAt: session.completed_at
      }
    });

  } catch (error) {
    console.error('Error getting status:', error);
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (currentSessionId) {
      // Update session to stopped
      await supabase
        .from('scraping_sessions')
        .update({
          status: 'stopped',
          completed_at: new Date().toISOString()
        })
        .eq('session_id', currentSessionId);
    }

    isScrapingActive = false;
    currentSessionId = null;

    return NextResponse.json({
      success: true,
      message: 'Scraping stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping scraping:', error);
    return NextResponse.json(
      { error: 'Failed to stop scraping', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}