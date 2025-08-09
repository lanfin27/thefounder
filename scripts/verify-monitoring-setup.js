const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySetup() {
  console.log('🔍 Verifying Incremental Monitoring Setup...\n');
  
  const checks = {
    enhancedTable: false,
    changeLogTable: false,
    statsTable: false,
    baselineData: 0,
    recentChangesView: false,
    changeSummaryView: false
  };

  // 1. Check enhanced table
  try {
    const { count, error } = await supabase
      .from('flippa_listings_enhanced')
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      checks.enhancedTable = true;
      checks.baselineData = count || 0;
      console.log(`✅ Enhanced table exists with ${count} records`);
    } else {
      console.log('❌ Enhanced table missing:', error.message);
    }
  } catch (e) {
    console.log('❌ Enhanced table error:', e.message);
  }

  // 2. Check change log table
  try {
    const { error } = await supabase
      .from('flippa_change_log')
      .select('change_id')
      .limit(1);
    
    if (!error) {
      checks.changeLogTable = true;
      console.log('✅ Change log table exists');
    } else {
      console.log('❌ Change log table missing:', error.message);
    }
  } catch (e) {
    console.log('❌ Change log table error:', e.message);
  }

  // 3. Check stats table
  try {
    const { error } = await supabase
      .from('flippa_monitoring_stats')
      .select('stat_id')
      .limit(1);
    
    if (!error) {
      checks.statsTable = true;
      console.log('✅ Monitoring stats table exists');
    } else {
      console.log('❌ Stats table missing:', error.message);
    }
  } catch (e) {
    console.log('❌ Stats table error:', e.message);
  }

  // 4. Check views
  try {
    const { error } = await supabase
      .from('flippa_recent_changes')
      .select('id')
      .limit(1);
    
    if (!error) {
      checks.recentChangesView = true;
      console.log('✅ Recent changes view exists');
    } else {
      console.log('❌ Recent changes view missing:', error.message);
    }
  } catch (e) {
    console.log('❌ Recent changes view error:', e.message);
  }

  // Summary
  console.log('\n📊 Setup Summary:');
  console.log('================');
  
  const allChecks = [
    checks.enhancedTable,
    checks.changeLogTable,
    checks.statsTable,
    checks.baselineData > 0
  ];
  
  const passedChecks = allChecks.filter(c => c).length;
  const totalChecks = allChecks.length;
  
  console.log(`Progress: ${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 System is ready for incremental monitoring!');
    console.log('\nNext steps:');
    console.log('1. Go to http://localhost:3000/admin/scraping-status');
    console.log('2. Click on "Incremental Monitoring" tab');
    console.log('3. Click "Start Incremental Scan" to begin monitoring');
  } else {
    console.log('\n⚠️  Setup incomplete!');
    console.log('\nTo complete setup:');
    
    if (!checks.changeLogTable || !checks.statsTable) {
      console.log('1. Run the SQL script in Supabase SQL Editor:');
      console.log('   scripts/create-enhanced-flippa-schema.sql');
    }
    
    if (checks.enhancedTable && checks.baselineData === 0) {
      console.log('2. Run migration to populate baseline data:');
      console.log('   node scripts/migrate-to-enhanced-schema.js');
    }
  }
  
  return checks;
}

// Run verification
verifySetup().catch(console.error);