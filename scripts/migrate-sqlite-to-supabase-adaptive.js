// migrate-sqlite-to-supabase-adaptive.js
// Adaptive migration that works with any Supabase table structure

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
    console.log('🚀 Adaptive SQLite to Supabase Migration');
    console.log('========================================\n');

    if (CONFIG.TEST_MODE) {
        console.log('🧪 TEST MODE: Processing only first 10 records\n');
    }

    try {
        // Step 1: Discover available columns
        console.log('🔍 Discovering Supabase table structure...');
        const availableColumns = await discoverColumns();
        
        if (availableColumns.length === 0) {
            throw new Error('Could not determine table structure');
        }

        console.log(`\n✅ Found ${availableColumns.length} columns:`);
        availableColumns.forEach(col => console.log(`  - ${col}`));

        // Step 2: Connect to SQLite
        const sqliteDb = await connectToSQLite();

        // Step 3: Read data
        const records = await readSQLiteData(sqliteDb, CONFIG.TEST_MODE ? CONFIG.TEST_SIZE : null);
        stats.total = records.length;
        console.log(`\n📊 Found ${stats.total} records to migrate`);

        // Step 4: Create mapping strategy
        const mapping = createMappingStrategy(availableColumns);
        console.log('\n📋 Mapping strategy:');
        Object.entries(mapping).forEach(([sqlite, supabase]) => {
            if (supabase) {
                console.log(`  ${sqlite} → ${supabase}`);
            }
        });

        // Step 5: Process records
        await processRecords(records, availableColumns, mapping);

        // Step 6: Verify
        await verifyMigration();

        // Report
        generateReport();

        await sqliteDb.close();

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        generateReport();
    }
}

async function discoverColumns() {
    // Try different approaches to discover columns
    const discoveredColumns = new Set();

    // Approach 1: Try common columns individually
    const commonColumns = [
        'id', 'title', 'url', 'category', 'description', 
        'listing_id', 'listing_url', 'price', 'asking_price',
        'monthly_revenue', 'monthly_profit', 'property_type',
        'status', 'created_at', 'updated_at'
    ];

    for (const col of commonColumns) {
        const { error } = await supabase
            .from(CONFIG.SUPABASE_TABLE)
            .select(col)
            .limit(1);
        
        if (!error || !error.message.includes('does not exist')) {
            discoveredColumns.add(col);
        }
    }

    // Approach 2: Try to get actual data
    const { data, error } = await supabase
        .from(CONFIG.SUPABASE_TABLE)
        .select('*')
        .limit(1);

    if (data && data.length > 0) {
        Object.keys(data[0]).forEach(col => discoveredColumns.add(col));
    }

    return Array.from(discoveredColumns);
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

function createMappingStrategy(availableColumns) {
    // Create best-effort mapping based on available columns
    const mapping = {};
    
    // Common mappings
    const commonMappings = {
        'id': ['listing_id', 'id'],
        'title': ['title', 'name'],
        'listing_url': ['url', 'listing_url', 'link'],
        'price': ['price', 'asking_price'],
        'category': ['category'],
        'property_type': ['property_type', 'type'],
        'status': ['status'],
        'description': ['description'],
        'monthly_revenue': ['monthly_revenue', 'revenue'],
        'monthly_profit': ['monthly_profit', 'profit']
    };

    // Find best match for each SQLite field
    Object.entries(commonMappings).forEach(([sqliteField, possibleSupabaseFields]) => {
        for (const supabaseField of possibleSupabaseFields) {
            if (availableColumns.includes(supabaseField)) {
                mapping[sqliteField] = supabaseField;
                break;
            }
        }
    });

    return mapping;
}

async function processRecords(records, availableColumns, mapping) {
    console.log(`\n📤 Processing ${records.length} records...`);
    
    const batchSize = CONFIG.TEST_MODE ? CONFIG.TEST_SIZE : CONFIG.BATCH_SIZE;
    
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await processBatch(batch, availableColumns, mapping);
        
        stats.processed = Math.min(i + batchSize, records.length);
        showProgress();
    }
    console.log(''); // New line after progress
}

async function processBatch(batch, availableColumns, mapping) {
    const transformedBatch = [];
    
    for (const record of batch) {
        const transformed = {};
        
        // Map fields based on strategy
        Object.entries(mapping).forEach(([sqliteField, supabaseField]) => {
            if (supabaseField && record[sqliteField] !== undefined) {
                transformed[supabaseField] = record[sqliteField];
            }
        });

        // Ensure we have at least one field
        if (Object.keys(transformed).length > 0) {
            // Add a unique identifier if possible
            if (!transformed.id && !transformed.listing_id) {
                if (availableColumns.includes('listing_id')) {
                    transformed.listing_id = record.id || `IMPORT_${Date.now()}_${Math.random()}`;
                }
            }
            
            // Clean up values
            Object.keys(transformed).forEach(key => {
                if (transformed[key] === null || transformed[key] === undefined) {
                    delete transformed[key];
                }
            });
            
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