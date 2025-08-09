// route.ts
// API endpoint for browser simulation system

import { NextRequest, NextResponse } from 'next/server';
import BrowserSimulationSystem from '@/lib/browser-simulation';

// Global instance management
let simulationSystem: BrowserSimulationSystem | null = null;

export async function POST(request: NextRequest) {
  try {
    const { action, config } = await request.json();

    switch (action) {
      case 'start':
        return await startSimulation(config);
      
      case 'stop':
        return await stopSimulation();
      
      case 'status':
        return await getStatus();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Browser simulation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function startSimulation(config?: any) {
  if (simulationSystem?.getStatus().active) {
    return NextResponse.json(
      { error: 'Simulation already running' },
      { status: 400 }
    );
  }

  try {
    // Initialize simulation system
    simulationSystem = new BrowserSimulationSystem({
      headless: config?.headless ?? true,
      proxyUrl: config?.proxyUrl,
      targetUrl: config?.targetUrl || 'https://flippa.com',
      maxSessions: config?.maxSessions ?? 3,
      sessionInterval: config?.sessionInterval ?? { min: 30, max: 120 },
      viewport: config?.viewport ?? { width: 1920, height: 1080 },
      ...config
    });

    // Set up event listeners for monitoring
    simulationSystem.on('sessionComplete', (result) => {
      console.log('Session completed:', {
        sessionId: result.sessionId,
        persona: result.persona,
        pagesVisited: result.pagesVisited,
        dataPoints: Object.keys(result.dataExtracted).length,
        duration: result.metrics.totalDuration / 1000 / 60
      });
    });

    simulationSystem.on('sessionError', (error) => {
      console.error('Session error:', error);
    });

    simulationSystem.on('sessionProgress', (progress) => {
      console.log('Session progress:', progress);
    });

    // Initialize and start
    await simulationSystem.initialize();
    await simulationSystem.startSimulation();

    return NextResponse.json({
      success: true,
      message: 'Browser simulation started successfully',
      status: simulationSystem.getStatus()
    });

  } catch (error) {
    simulationSystem = null;
    console.error('Failed to start simulation:', error);
    return NextResponse.json(
      { error: 'Failed to start simulation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function stopSimulation() {
  if (!simulationSystem) {
    return NextResponse.json(
      { error: 'No simulation running' },
      { status: 400 }
    );
  }

  try {
    await simulationSystem.stopSimulation();
    
    const finalStatus = simulationSystem.getStatus();
    const results = simulationSystem.getResults();
    
    await simulationSystem.shutdown();
    simulationSystem = null;

    return NextResponse.json({
      success: true,
      message: 'Browser simulation stopped successfully',
      finalStatus,
      summary: {
        totalSessions: results.length,
        totalDataPoints: results.reduce((sum, r) => sum + Object.keys(r.dataExtracted).length, 0),
        averageConfidence: results.length > 0 ? 
          results.reduce((sum, r) => sum + r.metrics.dataConfidence, 0) / results.length : 0
      }
    });

  } catch (error) {
    console.error('Error stopping simulation:', error);
    simulationSystem = null;
    return NextResponse.json(
      { error: 'Error stopping simulation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getStatus() {
  if (!simulationSystem) {
    return NextResponse.json({
      active: false,
      message: 'No simulation running',
      status: {
        active: false,
        activeSessions: 0,
        sessionsCompleted: 0,
        currentPersonas: [],
        totalDataPoints: 0,
        averageConfidence: 0
      }
    });
  }

  const status = simulationSystem.getStatus();
  const results = simulationSystem.getResults();
  
  return NextResponse.json({
    success: true,
    status,
    recentResults: results.slice(-5), // Last 5 sessions
    performance: {
      totalPages: results.reduce((sum, r) => sum + r.pagesVisited, 0),
      totalCaptchas: results.reduce((sum, r) => sum + r.captchasEncountered, 0),
      captchaSolveRate: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.captchasSolved, 0) / 
        Math.max(1, results.reduce((sum, r) => sum + r.captchasEncountered, 0)) : 0,
      averageRiskLevel: results.length > 0 ?
        results.reduce((sum, r) => sum + r.metrics.riskLevel, 0) / results.length : 0
    }
  });
}

export async function GET(request: NextRequest) {
  return await getStatus();
}