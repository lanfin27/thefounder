const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
    console.log('🔍 Checking Supabase Table Schema');
    console.log('=' .repeat(50));
    
    try {
        // Insert a test record to discover columns
        const testRecord = {
            id: 999999,
            title: 'Test',
            url: 'test',
            category: 'test',
            asking_price: 0,
            monthly_revenue: 0
        };
        
        const { data, error } = await supabase
            .from('flippa_listings')
            .insert(testRecord)
            .select();
            
        if (error) {
            console.log('\nAvailable columns from error:', error.message);
            
            // Try to get one record to see structure
            const { data: existing, error: selectError } = await supabase
                .from('flippa_listings')
                .select('*')
                .limit(1);
                
            if (existing && existing.length > 0) {
                console.log('\nExisting record structure:', Object.keys(existing[0]));
            }
        } else {
            console.log('\nTest insert successful. Columns:', Object.keys(data[0]));
            
            // Clean up test record
            await supabase
                .from('flippa_listings')
                .delete()
                .eq('id', 999999);
        }
        
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSchema();