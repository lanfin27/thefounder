import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const range = searchParams.get('range') || 'week';
    
    // Build query
    let query = supabase
      .from('schedule_executions')
      .select(`
        *,
        scraping_schedules (
          name,
          frequency
        )
      `);
    
    // Apply status filter
    if (filter === 'completed') {
      query = query.eq('status', 'completed');
    } else if (filter === 'failed') {
      query = query.eq('status', 'failed');
    }
    
    // Apply date range filter
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate = new Date(0); // All time
    }
    
    if (range !== 'all') {
      query = query.gte('started_at', startDate.toISOString());
    }
    
    // Execute query
    const { data: executions, error } = await query
      .order('started_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching history:', error);
      
      // Return empty data if table doesn't exist yet
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          executions: [],
          stats: {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageDuration: 0,
            averageNewListings: 0,
            totalNewListings: 0,
            successRate: 0
          },
          message: 'Schedule tables not yet created. Please run the SQL script in Supabase dashboard.'
        });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch history'
      }, { status: 500 });
    }
    
    // Calculate statistics
    const stats = {
      totalExecutions: executions?.length || 0,
      successfulExecutions: executions?.filter(e => e.status === 'completed').length || 0,
      failedExecutions: executions?.filter(e => e.status === 'failed').length || 0,
      averageDuration: 0,
      averageNewListings: 0,
      totalNewListings: 0,
      successRate: 0
    };
    
    if (executions && executions.length > 0) {
      const completedExecutions = executions.filter(e => e.status === 'completed');
      
      if (completedExecutions.length > 0) {
        stats.averageDuration = Math.round(
          completedExecutions.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / completedExecutions.length
        );
        
        stats.averageNewListings = Math.round(
          completedExecutions.reduce((sum, e) => sum + (e.new_listings || 0), 0) / completedExecutions.length
        );
        
        stats.totalNewListings = completedExecutions.reduce((sum, e) => sum + (e.new_listings || 0), 0);
      }
      
      stats.successRate = (stats.successfulExecutions / stats.totalExecutions) * 100;
    }
    
    // Format executions with schedule names
    const formattedExecutions = executions?.map(exec => ({
      ...exec,
      schedule_name: exec.scraping_schedules?.name || 'Unknown Schedule'
    })) || [];
    
    return NextResponse.json({
      success: true,
      executions: formattedExecutions,
      stats
    });
    
  } catch (error) {
    console.error('Error in schedule history:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}