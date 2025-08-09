// Final migration script with correct schema mapping
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const CONFIG = {
    SQLITE_DB_PATH: path.join(__dirname, '..', 'data', 'flippa_baseline.db'),
    BATCH_SIZE: 100,
    TEST_MODE: process.argv[2] === '--test',
    TEST_SIZE: 10
};

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Statistics
const stats = {
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    startTime: Date.now()
};

async function migrateData() {
    console.log('🚀 Final SQLite to Supabase Migration');
    console.log('====================================\n');

    if (CONFIG.TEST_MODE) {
        console.log('🧪 TEST MODE: Processing only first 10 records\n');
    }

    try {
        // Connect to SQLite
        console.log('📂 Connecting to SQLite...');
        const db = new Database(CONFIG.SQLITE_DB_PATH, { readonly: true });

        // Get total count
        const countResult = db.prepare('SELECT COUNT(*) as count FROM baseline_listings').get();
        stats.total = CONFIG.TEST_MODE ? Math.min(countResult.count, CONFIG.TEST_SIZE) : countResult.count;
        
        console.log(`\n📊 Found ${countResult.count} records to migrate`);
        if (CONFIG.TEST_MODE) {
            console.log(`   (Processing only ${stats.total} in test mode)`);
        }

        // Get existing IDs to avoid duplicates
        console.log('\n🔍 Checking for existing records...');
        const { data: existingRecords } = await supabase
            .from('flippa_listings')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);
        
        const maxExistingId = existingRecords && existingRecords.length > 0 ? existingRecords[0].id : 0;
        console.log(`   Highest existing ID: ${maxExistingId}`);

        // Get records
        const query = CONFIG.TEST_MODE 
            ? 'SELECT * FROM baseline_listings LIMIT ?'
            : 'SELECT * FROM baseline_listings';
        
        const params = CONFIG.TEST_MODE ? [CONFIG.TEST_SIZE] : [];
        const records = db.prepare(query).all(...params);

        console.log('\n📤 Starting migration...\n');

        // Process in batches
        for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
            const batch = records.slice(i, i + CONFIG.BATCH_SIZE);
            const mappedBatch = batch.map((record, index) => {
                // Generate numeric ID based on row position + existing max
                const numericId = maxExistingId + i + index + 1;
                
                // Parse numeric values safely
                const askingPrice = parseFloat(record.price) || 0;
                const monthlyRevenue = parseFloat(record.monthly_revenue) || 0;
                const monthlyProfit = parseFloat(record.monthly_profit) || 0;
                const ageMonths = record.business_age ? parseInt(record.business_age) : null;
                
                return {
                    id: numericId,
                    session_id: `baseline_import_${record.id}`, // Use original ID as session reference
                    url: record.listing_url || `https://flippa.com/listings/${record.id}`,
                    title: record.title || 'Untitled Business',
                    asking_price: askingPrice,
                    monthly_revenue: monthlyRevenue,
                    monthly_profit: monthlyProfit,
                    age_months: ageMonths,
                    page_views_monthly: record.views ? parseInt(record.views) : null,
                    category: record.category || record.property_type || 'Other',
                    description: record.description || '',
                    technologies: null, // Not available in baseline
                    scraped_at: record.imported_at || new Date().toISOString(),
                    created_at: record.created_at || new Date().toISOString()
                };
            });

            try {
                const { data, error } = await supabase
                    .from('flippa_listings')
                    .insert(mappedBatch);

                if (error) {
                    console.error(`\n❌ Batch ${Math.floor(i/CONFIG.BATCH_SIZE) + 1} error:`, error.message);
                    stats.failed += batch.length;
                    
                    // Try inserting one by one to find problematic records
                    if (CONFIG.TEST_MODE) {
                        for (const record of mappedBatch) {
                            const { error: singleError } = await supabase
                                .from('flippa_listings')
                                .insert(record);
                            
                            if (singleError) {
                                console.log(`   Failed record ID ${record.id}:`, singleError.message);
                            } else {
                                stats.success++;
                                stats.failed--;
                            }
                        }
                    }
                } else {
                    stats.success += batch.length;
                }
            } catch (err) {
                console.error(`\n❌ Batch ${Math.floor(i/CONFIG.BATCH_SIZE) + 1} exception:`, err.message);
                stats.failed += batch.length;
            }

            stats.processed += batch.length;
            showProgress();
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        db.close();

        // Final report
        console.log('\n\n📊 Migration Complete!');
        console.log('=====================');
        console.log(`✅ Success: ${stats.success} records`);
        console.log(`❌ Failed: ${stats.failed} records`);
        console.log(`⏱️  Duration: ${Math.round((Date.now() - stats.startTime) / 1000)}s`);

        // Verify migration
        console.log('\n🔍 Verifying migration...');
        const { count, error: countError } = await supabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true });

        if (!countError) {
            console.log(`✅ Supabase now has ${count} records`);
            
            // Get sample data
            const { data: sample } = await supabase
                .from('flippa_listings')
                .select('*')
                .limit(5)
                .order('id', { ascending: false });
                
            if (sample && sample.length > 0) {
                console.log('\n📋 Sample migrated records:');
                sample.forEach(record => {
                    console.log(`   ID: ${record.id} | ${record.title} | $${record.asking_price}`);
                });
            }
        }

    } catch (error) {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    }
}

function showProgress() {
    const percentage = Math.round((stats.processed / stats.total) * 100);
    const filled = Math.floor(percentage / 2);
    const empty = 50 - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
    
    process.stdout.write(`\r[${progressBar}] ${percentage}% | ${stats.processed}/${stats.total} | Success: ${stats.success} | Failed: ${stats.failed}`);
}

// Run migration
migrateData().catch(console.error);