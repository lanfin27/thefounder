const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeDatabase() {
  console.log('🔍 Deep Database Analysis\n');
  
  const report = {
    sqlite: {},
    supabase: {},
    dataIntegrity: {},
    recommendations: []
  };
  
  // 1. Analyze SQLite databases
  console.log('📊 SQLite Analysis');
  console.log('==================');
  
  const sqliteFiles = [
    'data/flippa_baseline.db',
    'data/flippa_baseline_large.db'
  ];
  
  for (const dbFile of sqliteFiles) {
    try {
      const db = new Database(dbFile, { readonly: true });
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      
      console.log(`\n${dbFile}:`);
      report.sqlite[dbFile] = { tables: {} };
      
      for (const table of tables) {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
        
        console.log(`  - ${table.name}: ${count.count} records`);
        report.sqlite[dbFile].tables[table.name] = {
          recordCount: count.count,
          columns: columns.map(c => ({ name: c.name, type: c.type }))
        };
      }
      
      db.close();
    } catch (error) {
      console.log(`  ❌ Error reading ${dbFile}: ${error.message}`);
      report.sqlite[dbFile] = { error: error.message };
    }
  }
  
  // 2. Analyze Supabase tables
  console.log('\n\n📊 Supabase Analysis');
  console.log('====================');
  
  const supabaseTables = [
    'flippa_listings_enhanced',
    'flippa_change_log',
    'flippa_monitoring_stats',
    'flippa_listings',
    'scraping_history',
    'listings',
    'posts',
    'users'
  ];
  
  for (const table of supabaseTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`  - ${table}: ❌ Table does not exist`);
          report.supabase[table] = { exists: false };
        } else {
          console.log(`  - ${table}: ❌ Error: ${error.message}`);
          report.supabase[table] = { error: error.message };
        }
      } else {
        console.log(`  - ${table}: ✅ ${count} records`);
        report.supabase[table] = { exists: true, recordCount: count };
        
        // Get sample record to analyze structure
        const { data: sample } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (sample && sample.length > 0) {
          report.supabase[table].columns = Object.keys(sample[0]);
        }
      }
    } catch (error) {
      console.log(`  - ${table}: ❌ Error: ${error.message}`);
      report.supabase[table] = { error: error.message };
    }
  }
  
  // 3. Data Integrity Checks
  console.log('\n\n🔍 Data Integrity Analysis');
  console.log('==========================');
  
  // Check baseline data consistency
  if (report.supabase.flippa_listings_enhanced?.exists) {
    const { data: sample } = await supabase
      .from('flippa_listings_enhanced')
      .select('id, price, status, is_deleted')
      .limit(100);
    
    if (sample) {
      const deletedCount = sample.filter(r => r.is_deleted).length;
      const nullPrices = sample.filter(r => !r.price).length;
      
      console.log(`  - Deleted records in sample: ${deletedCount}/100`);
      console.log(`  - Records without price: ${nullPrices}/100`);
      
      report.dataIntegrity.sampleAnalysis = {
        deletedPercentage: deletedCount,
        missingPrices: nullPrices
      };
    }
  }
  
  // 4. Compare SQLite and Supabase data
  console.log('\n\n🔄 SQLite vs Supabase Comparison');
  console.log('=================================');
  
  if (report.sqlite['data/flippa_baseline.db']?.tables?.listings && 
      report.supabase.flippa_listings_enhanced?.exists) {
    const sqliteCount = report.sqlite['data/flippa_baseline.db'].tables.listings.recordCount;
    const supabaseCount = report.supabase.flippa_listings_enhanced.recordCount;
    
    console.log(`  - SQLite baseline: ${sqliteCount} records`);
    console.log(`  - Supabase enhanced: ${supabaseCount} records`);
    console.log(`  - Difference: ${Math.abs(sqliteCount - supabaseCount)} records`);
    
    if (sqliteCount !== supabaseCount) {
      report.recommendations.push('Data inconsistency between SQLite and Supabase');
    }
  }
  
  // 5. Generate recommendations
  console.log('\n\n💡 Recommendations');
  console.log('==================');
  
  if (!report.supabase.flippa_change_log?.exists) {
    report.recommendations.push('Create flippa_change_log table for tracking changes');
    console.log('  - Create flippa_change_log table');
  }
  
  if (!report.supabase.flippa_monitoring_stats?.exists) {
    report.recommendations.push('Create flippa_monitoring_stats table for statistics');
    console.log('  - Create flippa_monitoring_stats table');
  }
  
  if (report.supabase.flippa_listings_enhanced?.recordCount < 5635) {
    report.recommendations.push('Complete baseline data migration (expected 5,635 records)');
    console.log('  - Complete baseline data migration');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'DATABASE_DEEP_ANALYSIS.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Detailed report saved to: ${reportPath}`);
  
  return report;
}

// Run analysis
analyzeDatabase().catch(console.error);