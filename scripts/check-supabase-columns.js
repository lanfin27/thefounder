// check-supabase-columns.js
// Quick check of available columns

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
    console.log('🔍 Checking Supabase columns...\n');

    // Try to insert a minimal record
    const testRecord = {
        listing_id: 'TEST_' + Date.now(),
        title: 'Test'
    };

    const { data, error } = await supabase
        .from('flippa_listings')
        .insert(testRecord)
        .select();

    if (error) {
        console.log('Error:', error.message);
        console.log('\nThis suggests the table might need the migration to be run.');
    } else {
        console.log('✅ Insert successful!');
        console.log('Columns returned:', Object.keys(data[0]));
        
        // Clean up
        await supabase
            .from('flippa_listings')
            .delete()
            .eq('listing_id', testRecord.listing_id);
    }

    // Try selecting specific columns
    console.log('\n📋 Testing column availability:');
    
    const columnsToTest = [
        'listing_id', 'title', 'price', 'badges', 'raw_data',
        'url', 'category', 'property_type', 'source'
    ];

    for (const col of columnsToTest) {
        const { error } = await supabase
            .from('flippa_listings')
            .select(col)
            .limit(1);
        
        console.log(`  ${col}: ${error ? '❌ Not found' : '✅ Available'}`);
    }
}

checkColumns().catch(console.error);