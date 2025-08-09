import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SimpleScheduler } from '@/lib/scheduling/simple-scheduler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scheduleId = params.id;
    
    // Stop the schedule first
    SimpleScheduler.stopSchedule(scheduleId);
    
    // Delete from database
    const { error } = await supabase
      .from('scraping_schedules')
      .delete()
      .eq('schedule_id', scheduleId);
    
    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete schedule'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in schedule delete:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}