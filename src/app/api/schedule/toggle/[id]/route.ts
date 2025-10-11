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
    const { enabled } = await request.json();
    
    // Update enabled status
    const { data: schedule, error } = await supabase
      .from('scraping_schedules')
      .update({
        enabled,
        updated_at: new Date().toISOString()
      })
      .eq('schedule_id', scheduleId)
      .select()
      .single();
    
    if (error) {
      console.error('Error toggling schedule:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to toggle schedule'
      }, { status: 500 });
    }
    
    // Start or stop the schedule
    if (enabled) {
      await SimpleScheduler.startSchedule(schedule);
    } else {
      SimpleScheduler.stopSchedule(scheduleId);
    }
    
    return NextResponse.json({
      success: true,
      schedule
    });
    
  } catch (error) {
    console.error('Error in schedule toggle:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}