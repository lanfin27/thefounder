import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Test incremental monitoring setup
export async function GET() {
  try {
    const results = {
      excelFile: false,
      enhancedTable: false,
      changeLogTable: false,
      statsTable: false,
      baselineCount: 0,
      systemReady: false
    };

    // 1. Check Excel file exists
    const excelPath = path.join(process.cwd(), 'dataset_flippascraperapi_20250802_051204877.xlsx');
    results.excelFile = fs.existsSync(excelPath);

    // 2. Check enhanced table exists
    const { count: enhancedCount, error: enhancedError } = await supabase
      .from('flippa_listings_enhanced')
      .select('*', { count: 'exact', head: true });
    
    results.enhancedTable = !enhancedError;
    results.baselineCount = enhancedCount || 0;

    // 3. Check change log table
    const { error: changeLogError } = await supabase
      .from('flippa_change_log')
      .select('change_id')
      .limit(1);
    
    results.changeLogTable = !changeLogError;

    // 4. Check stats table
    const { error: statsError } = await supabase
      .from('flippa_monitoring_stats')
      .select('stat_id')
      .limit(1);
    
    results.statsTable = !statsError;

    // 5. Determine if system is ready
    results.systemReady = 
      results.excelFile && 
      results.enhancedTable && 
      results.changeLogTable && 
      results.statsTable &&
      results.baselineCount > 0;

    // Generate setup instructions if not ready
    const instructions = [];
    
    if (!results.excelFile) {
      instructions.push('1. Ensure Excel file "dataset_flippascraperapi_20250802_051204877.xlsx" is in project root');
    }
    
    if (!results.enhancedTable || !results.changeLogTable || !results.statsTable) {
      instructions.push('2. Run the SQL script in Supabase: scripts/create-enhanced-flippa-schema.sql');
    }
    
    if (results.enhancedTable && results.baselineCount === 0) {
      instructions.push('3. Run migration: node scripts/migrate-to-enhanced-schema.js');
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        instructions: instructions.length > 0 ? instructions : ['System is ready for incremental monitoring!'],
        summary: {
          tables: {
            enhanced: results.enhancedTable ? '✅' : '❌',
            changeLog: results.changeLogTable ? '✅' : '❌',
            stats: results.statsTable ? '✅' : '❌'
          },
          data: {
            excelFile: results.excelFile ? '✅' : '❌',
            baselineRecords: results.baselineCount
          },
          status: results.systemReady ? '🚀 Ready' : '⚠️ Setup Required'
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        hint: 'Check your Supabase credentials and connection'
      },
      { status: 500 }
    );
  }
}