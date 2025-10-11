import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SimpleScheduler } from '@/lib/scheduling/simple-scheduler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scheduleId = params.id;
    const body = await request.json();
    
    // Update schedule record
    const { data: schedule, error } = await supabase
      .from('scraping_schedules')
      .update({
        name: body.name,
        frequency: body.frequency,
        custom_cron: body.custom_cron,
        enabled: body.enabled,
        specific_times: body.specific_times,
        days_of_week: body.days_of_week,
        timezone: body.timezone,
        max_pages: body.max_pages,
        scan_options: body.scan_options,
        notification_settings: body.notification_settings,
        updated_at: new Date().toISOString()
      })
      .eq('schedule_id', scheduleId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating schedule:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update schedule'
      }, { status: 500 });
    }
    
    // Reload the schedule in the scheduler
    await SimpleScheduler.reloadSchedule(scheduleId);
    
    return NextResponse.json({
      success: true,
      schedule
    });
    
  } catch (error) {
    console.error('Error in schedule update:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}