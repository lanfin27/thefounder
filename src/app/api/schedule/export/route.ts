import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const filter = searchParams.get('filter') || 'all';
    const range = searchParams.get('range') || 'week';
    
    // Build query (same as history endpoint)
    let query = supabase
      .from('schedule_executions')
      .select(`
        *,
        scraping_schedules (
          name,
          frequency
        )
      `);
    
    // Apply filters
    if (filter === 'completed') {
      query = query.eq('status', 'completed');
    } else if (filter === 'failed') {
      query = query.eq('status', 'failed');
    }
    
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
        startDate = new Date(0);
    }
    
    if (range !== 'all') {
      query = query.gte('started_at', startDate.toISOString());
    }
    
    const { data: executions, error } = await query
      .order('started_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Format data based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(executions || []);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="schedule-history.csv"'
        }
      });
    } else {
      // JSON format
      const jsonData = {
        exported_at: new Date().toISOString(),
        filter,
        range,
        total_records: executions?.length || 0,
        executions: executions?.map(exec => ({
          schedule_name: exec.scraping_schedules?.name || 'Unknown',
          started_at: exec.started_at,
          completed_at: exec.completed_at,
          status: exec.status,
          duration_seconds: exec.duration_seconds,
          pages_scanned: exec.pages_scanned,
          listings_found: exec.listings_found,
          new_listings: exec.new_listings,
          price_changes: exec.price_changes,
          deleted_listings: exec.deleted_listings,
          error_message: exec.error_message,
          triggered_by: exec.triggered_by
        })) || []
      };
      
      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="schedule-history.json"'
        }
      });
    }
    
  } catch (error) {
    console.error('Error exporting history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export history'
    }, { status: 500 });
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  // Headers
  const headers = [
    'Schedule Name',
    'Started At',
    'Completed At',
    'Status',
    'Duration (seconds)',
    'Pages Scanned',
    'Listings Found',
    'New Listings',
    'Price Changes',
    'Deleted Listings',
    'Error Message',
    'Triggered By'
  ];
  
  // Rows
  const rows = data.map(exec => [
    exec.scraping_schedules?.name || 'Unknown',
    exec.started_at || '',
    exec.completed_at || '',
    exec.status || '',
    exec.duration_seconds || '0',
    exec.pages_scanned || '0',
    exec.listings_found || '0',
    exec.new_listings || '0',
    exec.price_changes || '0',
    exec.deleted_listings || '0',
    exec.error_message || '',
    exec.triggered_by || ''
  ]);
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}