const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Use service role key to manage RLS policies
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLS() {
    console.log('🔐 Fixing Supabase RLS Policies');
    console.log('==============================\n');

    try {
        // Test current access with anon key
        const anonSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        console.log('1️⃣ Testing anonymous access...');
        const { count: anonCount, error: anonError } = await anonSupabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true });

        if (anonError) {
            console.log('   ❌ Anonymous access blocked:', anonError.message);
        } else {
            console.log(`   ✅ Anonymous can see ${anonCount} listings`);
        }

        // Check with service role
        console.log('\n2️⃣ Testing service role access...');
        const { count: serviceCount } = await supabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true });

        console.log(`   ✅ Service role can see ${serviceCount} listings`);

        console.log('\n📝 RLS Fix Instructions:');
        console.log('   1. Go to Supabase Dashboard > Authentication > Policies');
        console.log('   2. For the "flippa_listings" table, create a new policy:');
        console.log('      - Name: "Allow public read access"');
        console.log('      - Operation: SELECT');
        console.log('      - Target roles: anon, authenticated');
        console.log('      - Policy expression: true');
        console.log('   3. Or run this SQL in Supabase SQL Editor:');
        console.log('\n   CREATE POLICY "Allow public read access" ON flippa_listings');
        console.log('   FOR SELECT TO anon, authenticated');
        console.log('   USING (true);');

        console.log('\n   Alternative: Disable RLS temporarily:');
        console.log('   ALTER TABLE flippa_listings DISABLE ROW LEVEL SECURITY;');

    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

fixRLS();