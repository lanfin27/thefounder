const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
    console.log('🔍 Checking scraping_sessions table schema');
    console.log('=' .repeat(50));
    
    try {
        // Try to get one record to see structure
        const { data: existing, error: selectError } = await supabase
            .from('scraping_sessions')
            .select('*')
            .limit(1);
            
        if (selectError) {
            console.log('\nError reading scraping_sessions:', selectError.message);
            
            // Try minimal fields
            const { data: minimal, error: minError } = await supabase
                .from('scraping_sessions')
                .select('session_id')
                .limit(1);
                
            if (minError) {
                console.log('\nTable might not exist or no access');
            } else {
                console.log('\nMinimal read successful, session_id exists');
            }
        } else if (existing && existing.length > 0) {
            console.log('\nExisting record structure:', Object.keys(existing[0]));
            console.log('\nSample data:', existing[0]);
        } else {
            console.log('\nTable exists but is empty');
            
            // Try to discover columns through insert error
            const testData = {
                session_id: 'test_' + Date.now(),
                status: 'test',
                marketplace: 'flippa'
            };
            
            const { error: insertError } = await supabase
                .from('scraping_sessions')
                .insert(testData);
                
            if (insertError) {
                console.log('\nInsert error reveals structure:', insertError.message);
            }
        }
        
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSchema();