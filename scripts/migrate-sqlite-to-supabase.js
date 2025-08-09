// migrate-sqlite-to-supabase.js
// Comprehensive SQLite to Supabase migration system

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const CONFIG = {
    SQLITE_DB_PATH: path.join(__dirname, '..', 'data', 'flippa_baseline.db'),
    BATCH_SIZE: 100, // Upload 100 records at a time
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
    PROGRESS_INTERVAL: 100,
    EXPECTED_RECORDS: 5636,
    SUPABASE_TABLE: 'flippa_listings',
    VALIDATION: {
        MIN_PRICE: 0,
        MAX_PRICE: 100000000, // $100M max
        REQUIRED_FIELDS: ['listing_id', 'title']
    }
};

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Migration statistics
const stats = {
    totalRecords: 0,
    processedRecords: 0,
    successfulUploads: 0,
    failedUploads: 0,
    duplicates: 0,
    validationErrors: 0,
    retries: 0,
    startTime: Date.now(),
    errors: []
};

// Progress indicator
function showProgress(current, total, message = '') {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = current / elapsed;
    const eta = (total - current) / rate;
    
    process.stdout.write(
        `\r[${progressBar}] ${percentage}% | ${current}/${total} | ` +
        `${rate.toFixed(0)} rec/s | ETA: ${Math.round(eta)}s | ${message}  `
    );
}

async function migrateData() {
    console.log('🚀 SQLite to Supabase Migration System');
    console.log('=====================================\n');

    // Check prerequisites
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    if (!fs.existsSync(CONFIG.SQLITE_DB_PATH)) {
        console.error(`❌ SQLite database not found: ${CONFIG.SQLITE_DB_PATH}`);
        console.log('📋 Please run: node scripts/setup-baseline-database-fixed.js');
        process.exit(1);
    }

    console.log(`📊 SQLite Database: ${CONFIG.SQLITE_DB_PATH}`);
    console.log(`🎯 Target Table: ${CONFIG.SUPABASE_TABLE}`);
    console.log(`📦 Batch Size: ${CONFIG.BATCH_SIZE} records`);
    console.log('');

    try {
        // Step 1: Connect to SQLite
        const sqliteDb = await connectToSQLite();
        
        // Step 2: Read all records
        const records = await readSQLiteData(sqliteDb);
        stats.totalRecords = records.length;
        
        console.log(`\n✅ Found ${stats.totalRecords.toLocaleString()} records in SQLite database`);
        
        // Step 3: Check existing records in Supabase
        await checkExistingRecords();
        
        // Step 4: Process records in batches
        await processBatches(records);
        
        // Step 5: Verify migration
        await verifyMigration();
        
        // Step 6: Generate report
        generateReport();
        
        await sqliteDb.close();
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        generateReport();
        process.exit(1);
    }
}

async function connectToSQLite() {
    console.log('📂 Connecting to SQLite database...');
    
    const db = await open({
        filename: CONFIG.SQLITE_DB_PATH,
        driver: sqlite3.Database
    });
    
    // Optimize for reading
    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA synchronous = NORMAL');
    
    return db;
}

async function readSQLiteData(db) {
    console.log('📖 Reading data from SQLite...');
    
    const query = `
        SELECT 
            id,
            title,
            category,
            property_type,
            status,
            price,
            listing_url,
            end_at,
            created_at,
            description,
            monthly_revenue,
            monthly_profit,
            business_age,
            industry,
            location,
            seller_name,
            views,
            watchers,
            bids,
            row_number
        FROM baseline_listings
        WHERE is_active = 1
        ORDER BY row_number
    `;
    
    const records = await db.all(query);
    return records;
}

async function checkExistingRecords() {
    console.log('\n🔍 Checking existing records in Supabase...');
    
    try {
        const { count, error } = await supabase
            .from(CONFIG.SUPABASE_TABLE)
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log(`  Found ${count || 0} existing records in Supabase`);
        
        if (count > 0) {
            console.log('  ⚠️ Warning: Table already contains data. Duplicates will be handled.');
        }
        
    } catch (error) {
        console.error('  ❌ Error checking existing records:', error.message);
    }
}

async function processBatches(records) {
    console.log(`\n📤 Uploading ${records.length.toLocaleString()} records in batches...`);
    
    for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
        const batch = records.slice(i, i + CONFIG.BATCH_SIZE);
        const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(records.length / CONFIG.BATCH_SIZE);
        
        await processBatch(batch, batchNumber, totalBatches);
        
        // Update progress
        stats.processedRecords = Math.min(i + CONFIG.BATCH_SIZE, records.length);
        if (stats.processedRecords % CONFIG.PROGRESS_INTERVAL === 0 || stats.processedRecords === records.length) {
            showProgress(
                stats.processedRecords, 
                records.length, 
                `Batch ${batchNumber}/${totalBatches}`
            );
        }
    }
    
    console.log('\n'); // New line after progress
}

async function processBatch(batch, batchNumber, totalBatches) {
    const transformedBatch = [];
    
    // Transform and validate each record
    for (const record of batch) {
        try {
            const transformed = transformRecord(record);
            const validation = validateRecord(transformed);
            
            if (validation.isValid) {
                transformedBatch.push(transformed);
            } else {
                stats.validationErrors++;
                stats.errors.push({
                    record: record.id,
                    type: 'validation',
                    errors: validation.errors
                });
            }
        } catch (error) {
            stats.validationErrors++;
            stats.errors.push({
                record: record.id,
                type: 'transformation',
                error: error.message
            });
        }
    }
    
    // Upload batch with retry logic
    if (transformedBatch.length > 0) {
        await uploadBatchWithRetry(transformedBatch, batchNumber);
    }
}

function transformRecord(record) {
    // Map SQLite fields to Supabase schema
    const transformed = {
        listing_id: record.id, // Map id to listing_id
        title: (record.title || '').trim(),
        price: parsePrice(record.price),
        monthly_revenue: parsePrice(record.monthly_revenue),
        property_type: normalizePropertyType(record.property_type),
        category: normalizeCategory(record.category),
        url: record.listing_url || '',
        
        // Calculate multiple if we have revenue
        multiple: calculateMultiple(record.price, record.monthly_revenue),
        multiple_text: generateMultipleText(record.price, record.monthly_revenue),
        
        // Additional fields
        badges: generateBadges(record),
        quality_score: calculateQualityScore(record),
        extraction_confidence: 0.95, // High confidence for baseline data
        page_number: Math.ceil((record.row_number || 1) / 24), // Assuming 24 per page
        extraction_timestamp: record.created_at || new Date().toISOString(),
        source: 'baseline_import',
        
        // Store additional data in raw_data JSONB
        raw_data: {
            description: record.description,
            monthly_profit: parsePrice(record.monthly_profit),
            business_age: record.business_age,
            industry: record.industry,
            location: record.location,
            seller_name: record.seller_name,
            views: parseInt(record.views) || 0,
            watchers: parseInt(record.watchers) || 0,
            bids: parseInt(record.bids) || 0,
            status: record.status,
            end_at: record.end_at,
            import_metadata: {
                sqlite_row_number: record.row_number,
                import_timestamp: new Date().toISOString(),
                import_batch: stats.processedRecords / CONFIG.BATCH_SIZE
            }
        }
    };
    
    return transformed;
}

function parsePrice(value) {
    if (!value) return null;
    
    // Handle string prices with currency symbols
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.-]/g, '');
        return parseInt(cleaned) || null;
    }
    
    return parseInt(value) || null;
}

function normalizePropertyType(type) {
    if (!type) return '';
    
    const normalized = type.toLowerCase().trim();
    
    // Map to standard property types
    const mappings = {
        'established_website': 'website',
        'starter_site': 'starter',
        'saas': 'saas',
        'app': 'app',
        'ecommerce': 'ecommerce',
        'e-commerce': 'ecommerce',
        'domain': 'domain',
        'digital_product': 'digital'
    };
    
    return mappings[normalized] || normalized;
}

function normalizeCategory(category) {
    if (!category) return '';
    
    // Normalize category names
    return category.trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function calculateMultiple(price, monthlyRevenue) {
    if (!price || !monthlyRevenue || monthlyRevenue === 0) return null;
    
    const annualRevenue = monthlyRevenue * 12;
    const multiple = price / annualRevenue;
    
    return parseFloat(multiple.toFixed(2));
}

function generateMultipleText(price, monthlyRevenue) {
    const multiple = calculateMultiple(price, monthlyRevenue);
    if (!multiple) return '';
    
    return `${multiple.toFixed(1)}x`;
}

function generateBadges(record) {
    const badges = [];
    
    if (record.status === 'active') badges.push('Active');
    if (record.views > 1000) badges.push('Popular');
    if (record.bids > 10) badges.push('Hot');
    if (record.price < 10000) badges.push('Under10k');
    if (record.price > 100000) badges.push('Premium');
    
    return badges;
}

function calculateQualityScore(record) {
    let score = 50; // Base score
    
    // Add points for completeness
    if (record.title) score += 10;
    if (record.description) score += 10;
    if (record.price > 0) score += 10;
    if (record.monthly_revenue > 0) score += 10;
    if (record.category) score += 5;
    if (record.property_type) score += 5;
    
    return Math.min(100, score);
}

function validateRecord(record) {
    const errors = [];
    
    // Required fields
    if (!record.listing_id) errors.push('Missing listing_id');
    if (!record.title || record.title.length === 0) errors.push('Missing title');
    
    // Price validation
    if (record.price !== null) {
        if (record.price < CONFIG.VALIDATION.MIN_PRICE) {
            errors.push(`Price too low: ${record.price}`);
        }
        if (record.price > CONFIG.VALIDATION.MAX_PRICE) {
            errors.push(`Price too high: ${record.price}`);
        }
    }
    
    // URL validation
    if (record.url && !record.url.startsWith('http')) {
        record.url = `https://flippa.com${record.url}`;
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

async function uploadBatchWithRetry(batch, batchNumber, attempt = 1) {
    try {
        // Use upsert to handle duplicates
        const { data, error } = await supabase
            .from(CONFIG.SUPABASE_TABLE)
            .upsert(batch, {
                onConflict: 'listing_id',
                returning: 'minimal'
            });
        
        if (error) {
            throw error;
        }
        
        stats.successfulUploads += batch.length;
        
    } catch (error) {
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
            stats.retries++;
            console.log(`\n  ⚠️ Batch ${batchNumber} failed, retrying (${attempt}/${CONFIG.RETRY_ATTEMPTS})...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            await uploadBatchWithRetry(batch, batchNumber, attempt + 1);
        } else {
            stats.failedUploads += batch.length;
            stats.errors.push({
                batch: batchNumber,
                type: 'upload',
                error: error.message,
                recordCount: batch.length
            });
            console.error(`\n  ❌ Batch ${batchNumber} failed after ${CONFIG.RETRY_ATTEMPTS} attempts:`, error.message);
        }
    }
}

async function verifyMigration() {
    console.log('\n🔍 Verifying migration...');
    
    try {
        // Count total records in Supabase
        const { count: totalCount, error: countError } = await supabase
            .from(CONFIG.SUPABASE_TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('source', 'baseline_import');
        
        if (countError) throw countError;
        
        console.log(`  Records in Supabase: ${totalCount || 0}`);
        console.log(`  Expected records: ${CONFIG.EXPECTED_RECORDS}`);
        
        // Sample data verification
        const { data: sampleData, error: sampleError } = await supabase
            .from(CONFIG.SUPABASE_TABLE)
            .select('listing_id, title, price, category')
            .eq('source', 'baseline_import')
            .limit(5);
        
        if (sampleError) throw sampleError;
        
        console.log('\n  Sample migrated data:');
        sampleData?.forEach(record => {
            console.log(`    ${record.listing_id}: ${record.title.substring(0, 50)}... ($${record.price || 0})`);
        });
        
        // Check data integrity
        const { data: priceStats, error: statsError } = await supabase
            .from(CONFIG.SUPABASE_TABLE)
            .select('price')
            .eq('source', 'baseline_import')
            .not('price', 'is', null);
        
        if (!statsError && priceStats) {
            const prices = priceStats.map(r => r.price);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            console.log(`\n  Average price: $${Math.round(avgPrice).toLocaleString()}`);
            console.log(`  Price range: $${Math.min(...prices).toLocaleString()} - $${Math.max(...prices).toLocaleString()}`);
        }
        
        // Calculate success rate
        const successRate = (totalCount / CONFIG.EXPECTED_RECORDS) * 100;
        
        if (successRate >= 95) {
            console.log(`\n✅ Migration verification PASSED: ${successRate.toFixed(1)}% success rate`);
        } else if (successRate >= 90) {
            console.log(`\n⚠️ Migration verification WARNING: ${successRate.toFixed(1)}% success rate`);
        } else {
            console.log(`\n❌ Migration verification FAILED: Only ${successRate.toFixed(1)}% success rate`);
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

function generateReport() {
    const duration = (Date.now() - stats.startTime) / 1000;
    const successRate = stats.totalRecords > 0 ? 
        (stats.successfulUploads / stats.totalRecords) * 100 : 0;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION REPORT');
    console.log('='.repeat(70));
    
    console.log('\n📈 Summary:');
    console.log(`  Total records in SQLite: ${stats.totalRecords.toLocaleString()}`);
    console.log(`  Records processed: ${stats.processedRecords.toLocaleString()}`);
    console.log(`  Successfully uploaded: ${stats.successfulUploads.toLocaleString()}`);
    console.log(`  Failed uploads: ${stats.failedUploads.toLocaleString()}`);
    console.log(`  Validation errors: ${stats.validationErrors.toLocaleString()}`);
    console.log(`  Retry attempts: ${stats.retries}`);
    console.log(`  Success rate: ${successRate.toFixed(2)}%`);
    
    console.log('\n⏱️ Performance:');
    console.log(`  Total duration: ${duration.toFixed(2)} seconds`);
    console.log(`  Average speed: ${Math.round(stats.successfulUploads / duration)} records/second`);
    console.log(`  Batches processed: ${Math.ceil(stats.processedRecords / CONFIG.BATCH_SIZE)}`);
    
    if (stats.errors.length > 0) {
        console.log('\n❌ Errors (first 10):');
        stats.errors.slice(0, 10).forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.type}: ${error.error || error.errors?.join(', ')}`);
        });
        
        if (stats.errors.length > 10) {
            console.log(`  ... and ${stats.errors.length - 10} more errors`);
        }
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, '..', 'data', `migration_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
        summary: {
            timestamp: new Date().toISOString(),
            duration: duration,
            totalRecords: stats.totalRecords,
            successfulUploads: stats.successfulUploads,
            failedUploads: stats.failedUploads,
            validationErrors: stats.validationErrors,
            successRate: successRate
        },
        errors: stats.errors,
        config: CONFIG
    }, null, 2));
    
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    
    if (successRate >= 95) {
        console.log('\n🎉 Migration completed successfully!');
    } else if (successRate >= 90) {
        console.log('\n⚠️ Migration completed with warnings.');
    } else {
        console.log('\n❌ Migration failed - please check the errors above.');
    }
}

// Export for testing
module.exports = {
    migrateData,
    transformRecord,
    validateRecord,
    CONFIG
};

// Run if called directly
if (require.main === module) {
    migrateData().catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
}