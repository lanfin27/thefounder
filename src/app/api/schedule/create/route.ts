import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SimpleScheduler } from '@/lib/scheduling/simple-scheduler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.frequency) {
      return NextResponse.json({
        success: false,
        error: 'Name and frequency are required'
      }, { status: 400 });
    }
    
    // Create schedule record
    const { data: schedule, error } = await supabase
      .from('scraping_schedules')
      .insert({
        name: body.name,
        frequency: body.frequency,
        custom_cron: body.custom_cron,
        enabled: body.enabled !== false,
        specific_times: body.specific_times,
        days_of_week: body.days_of_week,
        timezone: body.timezone || 'UTC',
        max_pages: body.max_pages || 2,
        scan_options: body.scan_options || {},
        notification_settings: body.notification_settings || {},
        created_by: body.created_by || 'system'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating schedule:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create schedule'
      }, { status: 500 });
    }
    
    // Start the schedule if enabled
    if (schedule.enabled) {
      await SimpleScheduler.startSchedule(schedule);
    }
    
    return NextResponse.json({
      success: true,
      schedule
    });
    
  } catch (error) {
    console.error('Error in schedule create:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}