const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Use service role key for administrative tasks
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function configureRLS() {
    console.log('🔐 Configuring Supabase RLS Policies');
    console.log('===================================\n');

    try {
        // Test current access before changes
        console.log('1️⃣ Testing current access...');
        
        // Test with anon key
        const anonSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { count: anonBefore, error: anonBeforeError } = await anonSupabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true });

        console.log(`   Anonymous access before: ${anonBefore || 0} listings`);
        if (anonBeforeError) console.log(`   Error: ${anonBeforeError.message}`);

        // Read SQL file
        console.log('\n2️⃣ Reading RLS configuration...');
        const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_configure_rls.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('   ✅ SQL file loaded');

        // Note: Supabase JS client doesn't support running raw SQL directly
        // We need to use Supabase Dashboard or API
        console.log('\n3️⃣ Instructions to apply RLS policies:');
        console.log('   1. Go to your Supabase Dashboard');
        console.log('   2. Navigate to SQL Editor');
        console.log('   3. Copy and paste the contents of:');
        console.log(`      ${sqlPath}`);
        console.log('   4. Click "Run" to execute');
        
        console.log('\n4️⃣ Alternative: Quick disable RLS (for testing):');
        console.log('   Run this SQL in Supabase:');
        console.log('   ALTER TABLE flippa_listings DISABLE ROW LEVEL SECURITY;');
        console.log('   ALTER TABLE scraping_sessions DISABLE ROW LEVEL SECURITY;');
        console.log('   ALTER TABLE incremental_changes DISABLE ROW LEVEL SECURITY;');

        // Generate direct Supabase SQL Editor link
        const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (projectRef) {
            console.log('\n5️⃣ Direct link to SQL Editor:');
            console.log(`   https://app.supabase.com/project/${projectRef}/sql/new`);
        }

        // Test if we can at least read the data with service role
        console.log('\n6️⃣ Verifying service role access...');
        const { count: serviceCount } = await supabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true });

        console.log(`   ✅ Service role can see ${serviceCount} listings`);

    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

configureRLS();