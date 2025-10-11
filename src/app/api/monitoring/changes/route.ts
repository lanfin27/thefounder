import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch recent changes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const changeType = searchParams.get('type'); // new, modified, deleted
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const days = parseInt(searchParams.get('days') || '7');

    // Build query
    let query = supabase
      .from('flippa_change_log')
      .select(`
        *,
        listing:flippa_listings_enhanced(*)
      `)
      .gte('change_timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .gte('change_score', minScore)
      .order('change_timestamp', { ascending: false })
      .limit(limit);

    // Apply type filter
    if (changeType) {
      query = query.eq('change_type', changeType);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get summary statistics
    const stats = await getChangeStats(days);

    return NextResponse.json({
      success: true,
      data: {
        changes: data || [],
        stats,
        filters: {
          limit,
          changeType,
          minScore,
          days
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function getChangeStats(days: number) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get change type counts
  const { data: typeCounts } = await supabase
    .from('flippa_change_log')
    .select('change_type')
    .gte('change_timestamp', startDate);

  const stats: any = {
    total: typeCounts?.length || 0,
    new: 0,
    modified: 0,
    deleted: 0,
    restored: 0
  };

  typeCounts?.forEach(item => {
    if (stats.hasOwnProperty(item.change_type)) {
      stats[item.change_type]++;
    }
  });

  // Get high-value changes
  const { data: highValueChanges } = await supabase
    .from('flippa_change_log')
    .select('change_score')
    .gte('change_timestamp', startDate)
    .gte('change_score', 70);

  stats.highValue = highValueChanges?.length || 0;

  // Get field change frequency
  const { data: fieldChanges } = await supabase
    .from('flippa_change_log')
    .select('changed_fields')
    .gte('change_timestamp', startDate)
    .eq('change_type', 'modified');

  const fieldFrequency: Record<string, number> = {};
  fieldChanges?.forEach(item => {
    if (Array.isArray(item.changed_fields)) {
      item.changed_fields.forEach((change: any) => {
        fieldFrequency[change.field] = (fieldFrequency[change.field] || 0) + 1;
      });
    }
  });

  return {
    ...stats,
    fieldFrequency,
    period: `${days} days`
  };
}