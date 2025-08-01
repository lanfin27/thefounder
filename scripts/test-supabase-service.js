// Test Supabase service connection
require('dotenv').config({ path: '.env.local' });

async function testSupabaseService() {
  console.log('🔍 Testing Supabase Service Connection');
  console.log('=' .repeat(50));
  
  // Check environment variables
  console.log('\n📋 Environment Check:');
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set'}`);
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n❌ Missing required environment variables!');
    console.log('Please ensure both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    return;
  }
  
  try {
    // Import the service
    const { supabaseAdmin } = require('../src/lib/scraping/services/supabase');
    
    console.log('\n🧪 Testing Database Connection:');
    
    // Test 1: Simple query
    console.log('\n1️⃣ Testing simple query...');
    const { data: test1, error: error1 } = await supabaseAdmin
      .from('scraping_jobs')
      .select('count')
      .limit(1);
    
    if (error1) {
      console.log('   ❌ FAILED:', error1.message);
    } else {
      console.log('   ✅ SUCCESS - Database connection works!');
    }
    
    // Test 2: List jobs
    console.log('\n2️⃣ Testing job listing...');
    const { data: jobs, error: error2 } = await supabaseAdmin
      .from('scraping_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error2) {
      console.log('   ❌ FAILED:', error2.message);
    } else {
      console.log(`   ✅ SUCCESS - Found ${jobs?.length || 0} jobs`);
    }
    
    // Test 3: Insert test job
    console.log('\n3️⃣ Testing job creation...');
    const testJob = {
      job_type: 'listing_scan',
      status: 'pending',
      target_url: 'https://flippa.com/search',
      total_items: 0,
      processed_items: 0,
      success_count: 0,
      error_count: 0,
      retry_count: 0,
      max_retries: 3,
      config: { test: true, category: 'test' },
      created_at: new Date().toISOString()
    };
    
    const { data: newJob, error: error3 } = await supabaseAdmin
      .from('scraping_jobs')
      .insert(testJob)
      .select()
      .single();
    
    if (error3) {
      console.log('   ❌ FAILED:', error3.message);
      console.log('   Details:', error3);
    } else {
      console.log('   ✅ SUCCESS - Job created!');
      console.log(`   Job ID: ${newJob.id}`);
      
      // Clean up test job
      const { error: deleteError } = await supabaseAdmin
        .from('scraping_jobs')
        .delete()
        .eq('id', newJob.id);
      
      if (!deleteError) {
        console.log('   🧹 Test job cleaned up');
      }
    }
    
  } catch (error) {
    console.log('\n💥 Service initialization failed:', error.message);
    console.log('Stack:', error.stack);
  }
  
  console.log('\n' + '=' .repeat(50));
}

testSupabaseService().catch(console.error);