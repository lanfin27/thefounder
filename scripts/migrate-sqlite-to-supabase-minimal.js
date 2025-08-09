// migrate-sqlite-to-supabase-minimal.js
// Minimal migration that adapts to the actual Supabase table structure

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const CONFIG = {
    SQLITE_DB_PATH: path.join(__dirname, '..', 'data', 'flippa_baseline.db'),
    BATCH_SIZE: 50,
    TEST_MODE: process.argv[2] === '--test',
    TEST_SIZE: 10,
    SUPABASE_TABLE: 'flippa_listings'
};

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Statistics
const stats = {
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    startTime: Date.now()
};

async function migrateData() {
    console.log('🚀 Minimal SQLite to Supabase Migration');
    console.log('======================================\n');

    if (CONFIG.TEST_MODE) {
        console.log('🧪 TEST MODE: Processing only first 10 records\n');
    }

    try {
        // Step 1: Test Supabase table structure with a simple insert
        console.log('🔍 Testing Supabase table structure...');
        const testSuccess = await testTableStructure();
        
        if (!testSuccess) {
            console.log('\n❌ Could not determine proper table structure');
            return;
        }

        // Step 2: Connect to SQLite
        const sqliteDb = await connectToSQLite();

        // Step 3: Read data
        const records = await readSQLiteData(sqliteDb, CONFIG.TEST_MODE ? CONFIG.TEST_SIZE : null);
        stats.total = records.length;
        console.log(`\n📊 Found ${stats.total} records to migrate`);

        // Step 4: Process records
        await processRecords(records);

        // Step 5: Verify
        await verifyMigration();

        // Report
        generateReport();

        await sqliteDb.close();

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        generateReport();
    }
}

async function testTableStructure() {
    // Try inserting minimal test records with different structures
    const testCases = [
        // Test case 1: Auto-incrementing ID with text fields
        {
            title: 'Test Migration',
            url: 'https://test.com',
            category: 'Test',
            description: 'Test description',
            asking_price: 10000,
            monthly_revenue: 1000,
            monthly_profit: 500
        },
        // Test case 2: With listing_id
        {
            listing_id: 'TEST_' + Date.now(),
            title: 'Test Migration',
            url: 'https://test.com',
            category: 'Test'
        }
    ];

    for (const testData of testCases) {
        try {
            const { data, error } = await supabase
                .from(CONFIG.SUPABASE_TABLE)
                .insert(testData)
                .select();

            if (!error && data && data.length > 0) {
                console.log('✅ Successfully inserted test record');
                console.log('   Available columns:', Object.keys(data[0]));
                
                // Clean up test record
                await supabase
                    .from(CONFIG.SUPABASE_TABLE)
                    .delete()
                    .eq('id', data[0].id);
                
                return true;
            }
        } catch (e) {
            // Try next test case
        }
    }
    
    return false;
}

async function connectToSQLite() {
    console.log('\n📂 Connecting to SQLite...');
    
    const db = await open({
        filename: CONFIG.SQLITE_DB_PATH,
        driver: sqlite3.Database
    });
    
    return db;
}

async function readSQLiteData(db, limit) {
    let query = 'SELECT * FROM baseline_listings WHERE is_active = 1';
    if (limit) query += ` LIMIT ${limit}`;
    
    return await db.all(query);
}

async function processRecords(records) {
    console.log(`\n📤 Processing ${records.length} records...`);
    
    const batchSize = CONFIG.TEST_MODE ? CONFIG.TEST_SIZE : CONFIG.BATCH_SIZE;
    
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await processBatch(batch);
        
        stats.processed = Math.min(i + batchSize, records.length);
        showProgress();
    }
    console.log(''); // New line after progress
}

async function processBatch(batch) {
    const transformedBatch = [];
    
    for (const record of batch) {
        // Minimal transformation - only use fields we know exist
        const transformed = {
            title: String(record.title || '').trim() || 'Untitled',
            url: String(record.listing_url || ''),
            category: String(record.category || '').trim() || 'Other',
            description: String(record.description || '').trim() || '',
            asking_price: parsePrice(record.price),
            monthly_revenue: parsePrice(record.monthly_revenue),
            monthly_profit: parsePrice(record.monthly_profit)
        };
        
        // Remove any null/undefined values
        Object.keys(transformed).forEach(key => {
            if (transformed[key] === null || transformed[key] === undefined || transformed[key] === '') {
                delete transformed[key];
            }
        });
        
        // Ensure we have at least title
        if (transformed.title) {
            transformedBatch.push(transformed);
        }
    }

    // Try to insert
    if (transformedBatch.length > 0) {
        try {
            const { error } = await supabase
                .from(CONFIG.SUPABASE_TABLE)
                .insert(transformedBatch);
            
            if (error) {
                console.error(`\n❌ Batch error: ${error.message}`);
                stats.failed += transformedBatch.length;
                
                // Try one by one if batch fails
                for (const record of transformedBatch) {
                    try {
                        const { error: singleError } = await supabase
                            .from(CONFIG.SUPABASE_TABLE)
                            .insert(record);
                        
                        if (!singleError) {
                            stats.success++;
                            stats.failed--;
                        }
                    } catch (e) {
                        // Individual record failed
                    }
                }
            } else {
                stats.success += transformedBatch.length;
            }
        } catch (error) {
            console.error(`\n❌ Upload error: ${error.message}`);
            stats.failed += transformedBatch.length;
        }
    }
}

function parsePrice(value) {
    if (!value) return null;
    
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.-]/g, '');
        const parsed = parseInt(cleaned);
        return isNaN(parsed) ? null : parsed;
    }
    
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
}

function showProgress() {
    const percentage = Math.round((stats.processed / stats.total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    
    process.stdout.write(
        `\r[${progressBar}] ${percentage}% | ${stats.processed}/${stats.total} | ` +
        `Success: ${stats.success} | Failed: ${stats.failed}`
    );
}

async function verifyMigration() {
    console.log('\n\n🔍 Verifying migration...');
    
    try {
        const { count, error } = await supabase
            .from(CONFIG.SUPABASE_TABLE)
            .select('*', { count: 'exact', head: true });
        
        if (!error) {
            console.log(`  Total records in Supabase: ${count || 0}`);
        }
    } catch (error) {
        console.error('  Could not verify count');
    }
}

function generateReport() {
    const duration = (Date.now() - stats.startTime) / 1000;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION REPORT');
    console.log('='.repeat(50));
    console.log(`  Mode: ${CONFIG.TEST_MODE ? 'TEST' : 'FULL'}`);
    console.log(`  Total records: ${stats.total}`);
    console.log(`  Processed: ${stats.processed}`);
    console.log(`  Success: ${stats.success}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Success rate: ${stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0}%`);
    console.log(`  Duration: ${duration.toFixed(1)} seconds`);
    
    if (stats.success === stats.total && CONFIG.TEST_MODE) {
        console.log('\n✅ Test successful! Run without --test flag for full migration.');
    } else if (stats.success > 0) {
        console.log('\n✅ Migration completed with partial success.');
    } else {
        console.log('\n❌ Migration failed. Check your table structure.');
    }
}

// Run migration
migrateData().catch(console.error);