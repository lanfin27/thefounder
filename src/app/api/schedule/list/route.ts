import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Check if table exists
    const { data: schedules, error } = await supabase
      .from('scraping_schedules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching schedules:', error);
      
      // Return empty array if table doesn't exist yet
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          schedules: [],
          message: 'Schedule tables not yet created. Please run the SQL script in Supabase dashboard.'
        });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch schedules'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      schedules: schedules || []
    });
    
  } catch (error) {
    console.error('Error in schedule list:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}