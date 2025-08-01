// Inspect scraping_jobs table structure
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function inspectTable() {
  console.log('🔍 Inspecting scraping_jobs table structure');
  console.log('=' .repeat(60));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test minimal insert
    console.log('\n1️⃣ Testing minimal insert...');
    const testData = {
      job_type: 'listing_scan',
      status: 'pending'
    };
    
    console.log('   Inserting:', testData);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('scraping_jobs')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.log('   ❌ Insert failed:', insertError.message);
      console.log('   Code:', insertError.code);
      console.log('   Details:', insertError.details);
      console.log('   Hint:', insertError.hint);
    } else {
      console.log('   ✅ Insert successful!');
      console.log('   Result:', insertResult);
      
      // Clean up
      if (insertResult && insertResult[0]) {
        await supabase
          .from('scraping_jobs')
          .delete()
          .eq('id', insertResult[0].id);
        console.log('   🧹 Test record cleaned up');
      }
    }
    
    // List all current jobs
    console.log('\n2️⃣ Listing all jobs...');
    const { data: jobs, error: listError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (listError) {
      console.log('   ❌ List failed:', listError.message);
    } else {
      console.log(`   ✅ Found ${jobs?.length || 0} jobs`);
      if (jobs && jobs.length > 0) {
        console.log('   Sample job:', JSON.stringify(jobs[0], null, 2));
      }
    }
    
  } catch (error) {
    console.log('\n💥 Unexpected error:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
}

inspectTable().catch(console.error);