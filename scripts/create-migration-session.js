const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createSession() {
    console.log('🔧 Creating migration session...');
    
    try {
        const sessionId = `baseline_import_${Date.now()}`;
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('scraping_sessions')
            .insert({
                session_id: sessionId,
                method: 'sqlite_import',
                status: 'in_progress',
                total_listings: 5636,
                successful_extractions: 0,
                failed_extractions: 0,
                pages_processed: 0,
                success_rate: 0,
                processing_time: 0,
                started_at: now,
                configuration: {
                    source: 'flippa_baseline.db',
                    type: 'baseline_import',
                    importDate: now
                }
            })
            .select()
            .single();
            
        if (error) {
            console.log('❌ Failed to create session:', error.message);
            return null;
        }
        
        console.log('✅ Created session:', sessionId);
        console.log('   ID:', data.id);
        return sessionId;
        
    } catch (err) {
        console.error('Error:', err);
        return null;
    }
}

createSession().then(sessionId => {
    if (sessionId) {
        console.log('\n📋 Use this session_id in your migration:', sessionId);
    }
});