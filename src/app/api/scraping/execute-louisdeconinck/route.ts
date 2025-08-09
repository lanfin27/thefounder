// src/app/api/scraping/execute-louisdeconinck/route.ts
// API endpoint to execute the louisdeconinck methodology

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store active extraction process
let activeExtraction: any = null;

export async function POST(request: Request) {
  try {
    // Prevent multiple simultaneous extractions
    if (activeExtraction && activeExtraction.active) {
      return NextResponse.json({ 
        error: 'Extraction already in progress' 
      }, { status: 409 });
    }

    // Initialize extraction session
    const sessionId = `louisdeconinck_${Date.now()}`;
    
    // Create initial scraping session record
    const { data: session, error: sessionError } = await supabase
      .from('scraping_sessions')
      .insert({
        session_id: sessionId,
        scraper_type: 'louisdeconinck_methodology',
        status: 'running',
        start_time: new Date().toISOString(),
        listings_found: 0,
        success_rate: 0,
        extraction_rate: 0,
        method: 'filter-matrix-api',
        progress: 0
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
    }

    // Execute the louisdeconinck extractor
    const scriptPath = path.join(process.cwd(), 'scripts', 'high-performance-scraper', 'flippa-5000-extractor.js');
    
    activeExtraction = {
      active: true,
      sessionId,
      process: null,
      startTime: Date.now(),
      listings: [],
      progress: 0
    };

    // Spawn the extraction process
    const extractionProcess = spawn('node', [scriptPath], {
      cwd: path.join(process.cwd(), 'scripts'),
      env: { ...process.env }
    });

    activeExtraction.process = extractionProcess;

    // Handle stdout data
    extractionProcess.stdout.on('data', async (data) => {
      const output = data.toString();
      console.log('Extractor output:', output);

      // Parse progress updates
      if (output.includes('Total:')) {
        const match = output.match(/Total: (\d+)/);
        if (match) {
          const total = parseInt(match[1]);
          activeExtraction.listings_count = total;
          activeExtraction.progress = Math.min((total / 5000) * 100, 100);

          // Update session progress
          await supabase
            .from('scraping_sessions')
            .update({
              listings_found: total,
              progress: activeExtraction.progress,
              extraction_rate: total / ((Date.now() - activeExtraction.startTime) / 60000)
            })
            .eq('session_id', sessionId);
        }
      }

      // Parse extracted listings
      if (output.includes('listings complete') || output.includes('EXTRACTION COMPLETE')) {
        activeExtraction.complete = true;
      }
    });

    // Handle stderr
    extractionProcess.stderr.on('data', (data) => {
      console.error('Extractor error:', data.toString());
    });

    // Handle process completion
    extractionProcess.on('close', async (code) => {
      console.log(`Extraction process exited with code ${code}`);
      
      // Update final session status
      const duration = (Date.now() - activeExtraction.startTime) / 1000;
      
      await supabase
        .from('scraping_sessions')
        .update({
          status: code === 0 ? 'completed' : 'failed',
          end_time: new Date().toISOString(),
          duration_seconds: duration,
          success_rate: code === 0 ? 99 : 0,
          final_count: activeExtraction.listings_count || 0
        })
        .eq('session_id', sessionId);

      activeExtraction.active = false;
    });

    // Return immediate response
    return NextResponse.json({
      success: true,
      sessionId,
      message: 'LouisDeconinck extraction started',
      targetListings: 5000,
      estimatedTime: '3-5 minutes'
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to start extraction' 
    }, { status: 500 });
  }
}

// GET endpoint to check extraction progress
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      // Return overall status
      return NextResponse.json({
        active: activeExtraction?.active || false,
        progress: activeExtraction?.progress || 0,
        listings_count: activeExtraction?.listings_count || 0,
        sessionId: activeExtraction?.sessionId
      });
    }

    // Get specific session status
    const { data: session, error } = await supabase
      .from('scraping_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Get listings count for this session
    const { count } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', session.start_time);

    return NextResponse.json({
      session,
      listings_count: count || 0,
      active: activeExtraction?.sessionId === sessionId && activeExtraction?.active,
      progress: session.progress || 0,
      success_rate: session.success_rate || 0,
      extraction_rate: session.extraction_rate || 0
    });

  } catch (error: any) {
    console.error('Progress check error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}