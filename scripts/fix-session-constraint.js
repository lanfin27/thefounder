const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createSession() {
    console.log('🔧 Creating scraping session for migration...');
    
    try {
        // Check if scraping_sessions table exists
        const { data: sessions, error: checkError } = await supabase
            .from('scraping_sessions')
            .select('*')
            .limit(1);
            
        if (checkError) {
            console.log('❌ scraping_sessions table error:', checkError.message);
            return null;
        }
        
        // Create a new session for baseline import
        const sessionId = `baseline_import_${new Date().toISOString().split('T')[0]}`;
        
        const { data, error } = await supabase
            .from('scraping_sessions')
            .insert({
                session_id: sessionId,
                status: 'completed',
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                total_pages: 1,
                total_listings: 5636,
                marketplace: 'flippa',
                options: {
                    source: 'sqlite_baseline',
                    import_date: new Date().toISOString()
                }
            })
            .select();
            
        if (error) {
            console.log('❌ Failed to create session:', error.message);
            return null;
        }
        
        console.log('✅ Created session:', sessionId);
        return sessionId;
        
    } catch (err) {
        console.error('Error:', err);
        return null;
    }
}

createSession();