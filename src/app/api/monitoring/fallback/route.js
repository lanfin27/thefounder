// Fallback monitoring API using vanilla JavaScript
import { NextResponse } from 'next/server';
import { SimpleMonitoringSystem } from '@/lib/monitoring/simple-monitoring-system';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action = 'scan' } = body;
    
    const monitoring = new SimpleMonitoringSystem();
    
    switch (action) {
      case 'scan':
        const result = await monitoring.runScan({ manual: true });
        return NextResponse.json(result);
        
      case 'status':
        const status = await monitoring.getStatus();
        return NextResponse.json({
          success: true,
          data: {
            ...status,
            totalListings: 5645 // Mock value
          }
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Fallback monitoring error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const monitoring = new SimpleMonitoringSystem();
    const status = await monitoring.getStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        totalListings: 5645,
        message: 'Fallback monitoring system active'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}