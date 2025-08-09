const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testIncrementalChangesTable() {
  console.log('🧪 Testing incremental_changes table...');
  
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('incremental_changes')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('❌ Table does not exist yet');
        console.log('\n📋 Please run the following SQL in Supabase dashboard:');
        console.log('   1. Go to SQL Editor in your Supabase project');
        console.log('   2. Copy contents of scripts/create-incremental-changes-table.sql');
        console.log('   3. Paste and execute the SQL');
        return false;
      } else {
        console.error('❌ Error querying table:', error.message);
        return false;
      }
    }
    
    console.log('✅ Table exists and is accessible');
    
    // Test insert capability
    const testRecord = {
      listing_id: 'test_' + Date.now(),
      change_type: 'price_update',
      field_name: 'asking_price',
      old_value: '100000',
      new_value: '95000',
      listing_url: 'https://flippa.com/test',
      listing_title: 'Test Listing'
    };
    
    const { error: insertError } = await supabase
      .from('incremental_changes')
      .insert(testRecord);
    
    if (insertError) {
      console.error('❌ Error inserting test record:', insertError.message);
      return false;
    }
    
    console.log('✅ Successfully inserted test record');
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from('incremental_changes')
      .delete()
      .eq('listing_id', testRecord.listing_id);
    
    if (!deleteError) {
      console.log('✅ Successfully cleaned up test record');
    }
    
    // Check recent changes
    const { data: recentChanges, error: recentError } = await supabase
      .from('incremental_changes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!recentError && recentChanges) {
      console.log(`\n📊 Found ${recentChanges.length} recent changes in the table`);
      if (recentChanges.length > 0) {
        console.log('\nSample changes:');
        recentChanges.forEach(change => {
          console.log(`  - ${change.change_type}: ${change.listing_id} (${change.field_name})`);
        });
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    return false;
  }
}

async function showTableSchema() {
  console.log('\n📄 Incremental Changes Table Schema:');
  console.log('================================');
  console.log('Column Name       | Type                    | Description');
  console.log('------------------|-------------------------|-------------');
  console.log('change_id         | UUID                    | Primary key');
  console.log('listing_id        | VARCHAR(255)            | ID of the listing');
  console.log('change_type       | VARCHAR(50)             | Type of change');
  console.log('field_name        | VARCHAR(100)            | Field that changed');
  console.log('old_value         | TEXT                    | Previous value');
  console.log('new_value         | TEXT                    | New value');
  console.log('detected_at       | TIMESTAMP WITH TIME ZONE| When change detected');
  console.log('created_at        | TIMESTAMP WITH TIME ZONE| Record creation time');
  console.log('scan_id           | VARCHAR(255)            | ID of scan');
  console.log('listing_url       | TEXT                    | URL of listing');
  console.log('listing_title     | TEXT                    | Title of listing');
  console.log('\nValid change_type values:');
  console.log('  - new_listing');
  console.log('  - price_update');
  console.log('  - status_change');
  console.log('  - deleted');
  console.log('  - updated');
}

// Run the test
testIncrementalChangesTable().then(success => {
  showTableSchema();
  
  if (!success) {
    console.log('\n⚠️  Action Required:');
    console.log('1. Copy the SQL from scripts/create-incremental-changes-table.sql');
    console.log('2. Run it in your Supabase SQL Editor');
    console.log('3. Run this script again to verify');
  } else {
    console.log('\n✅ Table is ready for use!');
  }
});