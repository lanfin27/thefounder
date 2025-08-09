// setup-baseline-database-large.js
// Enhanced setup script to handle large Excel files (5,635+ rows)

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

// Configuration for large file processing
const CONFIG = {
    BATCH_SIZE: 500, // Process 500 rows at a time
    EXPECTED_ROW_COUNT: 5635, // Expected number of rows
    PROGRESS_INTERVAL: 100, // Show progress every 100 rows
    MEMORY_LIMIT: 512 * 1024 * 1024, // 512MB buffer for Excel reading
    TRANSACTION_SIZE: 1000, // Commit every 1000 rows
    MAX_RETRIES: 3,
    ENABLE_VALIDATION: true
};

// Database configuration
const DB_PATH = path.join(__dirname, '..', 'data', 'flippa_baseline_large.db');
const EXCEL_PATH = process.argv[2] || path.join(__dirname, '..', 'dataset_flippascraperapi_20250802_051204877.xlsx');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Progress bar utility
class ProgressBar {
    constructor(total, label = 'Progress') {
        this.total = total;
        this.current = 0;
        this.label = label;
        this.startTime = Date.now();
    }

    update(current) {
        this.current = current;
        const percentage = Math.round((current / this.total) * 100);
        const filled = Math.round(percentage / 2);
        const empty = 50 - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = current / elapsed;
        const eta = (this.total - current) / rate;
        
        process.stdout.write(
            `\r${this.label}: [${bar}] ${percentage}% | ${current}/${this.total} | ` +
            `Rate: ${rate.toFixed(1)}/s | ETA: ${this.formatTime(eta)}`
        );
    }

    formatTime(seconds) {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}m ${secs}s`;
    }

    complete() {
        this.update(this.total);
        console.log('\n');
    }
}

async function setupDatabase() {
    console.log('🚀 Enhanced Baseline Database Setup for Large Files');
    console.log('=================================================\n');

    // Check if Excel file exists
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`❌ Excel file not found: ${EXCEL_PATH}`);
        console.log('\n📋 Usage: node setup-baseline-database-large.js [path-to-excel-file]');
        process.exit(1);
    }

    const fileStats = fs.statSync(EXCEL_PATH);
    console.log(`📄 Excel file found: ${EXCEL_PATH}`);
    console.log(`📊 File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📋 Expected rows: ${CONFIG.EXPECTED_ROW_COUNT.toLocaleString()}`);
    console.log(`🔧 Batch size: ${CONFIG.BATCH_SIZE} rows`);
    console.log('');

    // Open SQLite database with optimizations
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    // Enable optimizations for bulk inserts
    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA synchronous = NORMAL');
    await db.run('PRAGMA cache_size = 10000');
    await db.run('PRAGMA page_size = 4096');
    await db.run('PRAGMA temp_store = MEMORY');
    await db.run('PRAGMA mmap_size = 268435456'); // 256MB memory map

    console.log(`📊 Database created: ${DB_PATH}`);
    console.log('✅ Database optimizations enabled\n');

    try {
        // Create tables
        await createTables(db);
        
        // Import Excel data with enhanced processing
        const stats = await importExcelDataLarge(db, EXCEL_PATH);
        
        // Validate import
        if (CONFIG.ENABLE_VALIDATION) {
            await validateImport(db, stats);
        }
        
        // Create indexes
        await createIndexes(db);
        
        // Optimize database
        await optimizeDatabase(db);
        
        // Display summary
        await displaySummary(db, stats);

        console.log('\n✅ Enhanced baseline database setup completed successfully!');

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        throw error;
    } finally {
        await db.close();
    }
}

async function createTables(db) {
    console.log('📋 Creating database tables...');

    // Drop existing tables if they exist
    await db.run('DROP TABLE IF EXISTS baseline_listings');
    await db.run('DROP TABLE IF EXISTS tracking_log');
    await db.run('DROP TABLE IF EXISTS import_history');
    await db.run('DROP TABLE IF EXISTS duplicate_prevention');

    // Create baseline_listings table with optimized structure
    await db.run(`
        CREATE TABLE baseline_listings (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT,
            property_type TEXT,
            status TEXT,
            price REAL,
            listing_url TEXT UNIQUE,
            end_at DATETIME,
            created_at DATETIME,
            -- Additional fields from Excel
            description TEXT,
            monthly_revenue REAL,
            monthly_profit REAL,
            business_age TEXT,
            industry TEXT,
            location TEXT,
            seller_name TEXT,
            -- Additional fields that might exist
            views INTEGER DEFAULT 0,
            watchers INTEGER DEFAULT 0,
            bids INTEGER DEFAULT 0,
            auction_type TEXT,
            -- Metadata
            data_hash TEXT,
            imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            row_number INTEGER
        ) WITHOUT ROWID
    `);

    console.log('✅ Created baseline_listings table');

    // Create tracking_log table
    await db.run(`
        CREATE TABLE tracking_log (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            listing_id TEXT NOT NULL,
            action TEXT NOT NULL CHECK(action IN ('INSERT', 'UPDATE', 'DELETE', 'RESTORE')),
            field_name TEXT,
            old_value TEXT,
            new_value TEXT,
            change_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            change_source TEXT,
            change_metadata TEXT,
            batch_id TEXT
        )
    `);

    console.log('✅ Created tracking_log table');

    // Create import_history table
    await db.run(`
        CREATE TABLE import_history (
            import_id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            import_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_rows INTEGER,
            imported_rows INTEGER,
            duplicate_rows INTEGER,
            error_rows INTEGER,
            skipped_rows INTEGER,
            import_duration_ms INTEGER,
            batches_processed INTEGER,
            average_batch_time_ms INTEGER,
            memory_peak_mb REAL,
            import_metadata TEXT
        )
    `);

    console.log('✅ Created import_history table');

    // Create duplicate_prevention table with better indexing
    await db.run(`
        CREATE TABLE duplicate_prevention (
            hash_id TEXT PRIMARY KEY,
            listing_id TEXT NOT NULL,
            title_hash TEXT NOT NULL,
            url_hash TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            occurrence_count INTEGER DEFAULT 1,
            UNIQUE(listing_id)
        ) WITHOUT ROWID
    `);

    console.log('✅ Created duplicate_prevention table');
}

async function importExcelDataLarge(db, excelPath) {
    console.log('\n📥 Starting large Excel file import...');
    const startTime = Date.now();
    const batchId = `batch_${Date.now()}`;
    
    // Read Excel file with streaming support for large files
    console.log('📖 Reading Excel file (this may take a moment for large files)...');
    
    // Configure xlsx to handle large files
    xlsx.set_fs(fs);
    const workbook = xlsx.readFile(excelPath, {
        type: 'file',
        cellDates: true,
        cellNF: false,
        cellText: false,
        sheetStubs: false,
        password: undefined,
        WTF: false
    });

    // Get all sheet names
    console.log(`📑 Found ${workbook.SheetNames.length} worksheet(s):`);
    workbook.SheetNames.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
    });

    // Process all sheets
    let totalStats = {
        total: 0,
        imported: 0,
        duplicates: 0,
        errors: 0,
        updates: 0,
        skipped: 0,
        sheets: []
    };

    for (const sheetName of workbook.SheetNames) {
        console.log(`\n📄 Processing worksheet: "${sheetName}"`);
        
        const worksheet = workbook.Sheets[sheetName];
        const range = xlsx.utils.decode_range(worksheet['!ref']);
        const totalRows = range.e.r - range.s.r;
        
        console.log(`  Range: ${worksheet['!ref']} (${totalRows} rows)`);
        
        // Convert to JSON with specific options for large datasets
        const data = xlsx.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd',
            defval: null,
            blankrows: false
        });

        console.log(`  Data rows found: ${data.length}`);
        
        if (data.length === 0) {
            console.log(`  ⚠️ No data found in worksheet "${sheetName}", skipping...`);
            continue;
        }

        // Process this sheet's data
        const sheetStats = await processSheetData(db, data, sheetName, batchId);
        
        // Aggregate stats
        totalStats.total += sheetStats.total;
        totalStats.imported += sheetStats.imported;
        totalStats.duplicates += sheetStats.duplicates;
        totalStats.errors += sheetStats.errors;
        totalStats.updates += sheetStats.updates;
        totalStats.skipped += sheetStats.skipped;
        totalStats.sheets.push({
            name: sheetName,
            ...sheetStats
        });
    }

    // Record import history
    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();
    
    await db.run(`
        INSERT INTO import_history (
            filename, total_rows, imported_rows, duplicate_rows, 
            error_rows, skipped_rows, import_duration_ms, 
            batches_processed, average_batch_time_ms, memory_peak_mb, import_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        path.basename(excelPath),
        totalStats.total,
        totalStats.imported,
        totalStats.duplicates,
        totalStats.errors,
        totalStats.skipped,
        duration,
        Math.ceil(totalStats.total / CONFIG.BATCH_SIZE),
        duration / Math.ceil(totalStats.total / CONFIG.BATCH_SIZE),
        memoryUsage.heapUsed / 1024 / 1024,
        JSON.stringify({
            batchId,
            updates: totalStats.updates,
            importDate: new Date().toISOString(),
            fileSize: fs.statSync(excelPath).size,
            sheets: totalStats.sheets,
            config: CONFIG
        })
    ]);

    console.log(`\n✅ Import completed in ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`  - Total rows processed: ${totalStats.total.toLocaleString()}`);
    console.log(`  - Successfully imported: ${totalStats.imported.toLocaleString()}`);
    console.log(`  - Duplicates skipped: ${totalStats.duplicates.toLocaleString()}`);
    console.log(`  - Updates applied: ${totalStats.updates.toLocaleString()}`);
    console.log(`  - Errors encountered: ${totalStats.errors.toLocaleString()}`);
    console.log(`  - Memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    return totalStats;
}

async function processSheetData(db, data, sheetName, batchId) {
    const stats = {
        total: data.length,
        imported: 0,
        duplicates: 0,
        errors: 0,
        updates: 0,
        skipped: 0
    };

    // Create progress bar
    const progressBar = new ProgressBar(data.length, `  Importing from ${sheetName}`);

    // Prepare statements
    const insertStmt = await db.prepare(`
        INSERT INTO baseline_listings (
            id, title, category, property_type, status, price, 
            listing_url, end_at, created_at, description,
            monthly_revenue, monthly_profit, business_age,
            industry, location, seller_name, views, watchers,
            bids, auction_type, data_hash, row_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const checkDuplicateStmt = await db.prepare(`
        SELECT id, data_hash FROM baseline_listings WHERE listing_url = ? OR id = ?
    `);

    const updateStmt = await db.prepare(`
        UPDATE baseline_listings SET
            title = ?, category = ?, property_type = ?, status = ?, price = ?,
            end_at = ?, description = ?, monthly_revenue = ?, monthly_profit = ?,
            business_age = ?, industry = ?, location = ?, seller_name = ?,
            views = ?, watchers = ?, bids = ?, auction_type = ?,
            data_hash = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
    `);

    const insertTrackingStmt = await db.prepare(`
        INSERT INTO tracking_log (
            listing_id, action, field_name, old_value, new_value, 
            change_source, change_metadata, batch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDuplicateStmt = await db.prepare(`
        INSERT INTO duplicate_prevention (
            hash_id, listing_id, title_hash, url_hash, content_hash
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(hash_id) DO UPDATE SET
            last_seen = CURRENT_TIMESTAMP,
            occurrence_count = occurrence_count + 1
    `);

    // Process in batches
    for (let batchStart = 0; batchStart < data.length; batchStart += CONFIG.BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + CONFIG.BATCH_SIZE, data.length);
        const batch = data.slice(batchStart, batchEnd);

        // Begin transaction for this batch
        await db.run('BEGIN TRANSACTION');

        try {
            for (let i = 0; i < batch.length; i++) {
                const rowIndex = batchStart + i;
                const row = batch[i];

                try {
                    // Extract and normalize data
                    const listing = extractListingData(row, rowIndex + 1);
                    
                    // Generate data hash
                    const dataHash = generateDataHash(listing);
                    
                    // Check for duplicates
                    const existing = await checkDuplicateStmt.get(listing.listing_url, listing.id);
                    
                    if (existing) {
                        if (existing.data_hash !== dataHash) {
                            // Update existing listing
                            await updateStmt.run(
                                listing.title,
                                listing.category,
                                listing.property_type,
                                listing.status,
                                listing.price,
                                listing.end_at,
                                listing.description,
                                listing.monthly_revenue,
                                listing.monthly_profit,
                                listing.business_age,
                                listing.industry,
                                listing.location,
                                listing.seller_name,
                                listing.views,
                                listing.watchers,
                                listing.bids,
                                listing.auction_type,
                                dataHash,
                                listing.id
                            );

                            // Log the update
                            await insertTrackingStmt.run(
                                listing.id,
                                'UPDATE',
                                'data_hash',
                                existing.data_hash,
                                dataHash,
                                'excel_import',
                                JSON.stringify({ 
                                    row: rowIndex + 1, 
                                    sheet: sheetName,
                                    file: path.basename(db.filename) 
                                }),
                                batchId
                            );
                            
                            stats.updates++;
                        } else {
                            stats.duplicates++;
                        }
                        continue;
                    }

                    // Insert new listing
                    await insertStmt.run(
                        listing.id,
                        listing.title,
                        listing.category,
                        listing.property_type,
                        listing.status,
                        listing.price,
                        listing.listing_url,
                        listing.end_at,
                        listing.created_at,
                        listing.description,
                        listing.monthly_revenue,
                        listing.monthly_profit,
                        listing.business_age,
                        listing.industry,
                        listing.location,
                        listing.seller_name,
                        listing.views,
                        listing.watchers,
                        listing.bids,
                        listing.auction_type,
                        dataHash,
                        rowIndex + 1
                    );

                    // Log the insertion
                    await insertTrackingStmt.run(
                        listing.id,
                        'INSERT',
                        null,
                        null,
                        null,
                        'excel_import',
                        JSON.stringify({ 
                            row: rowIndex + 1, 
                            sheet: sheetName,
                            file: path.basename(db.filename) 
                        }),
                        batchId
                    );

                    // Add to duplicate prevention
                    const titleHash = crypto.createHash('md5').update(listing.title.toLowerCase()).digest('hex');
                    const urlHash = crypto.createHash('md5').update(listing.listing_url).digest('hex');
                    const contentHash = crypto.createHash('md5').update(JSON.stringify(listing)).digest('hex');
                    
                    await insertDuplicateStmt.run(
                        dataHash,
                        listing.id,
                        titleHash,
                        urlHash,
                        contentHash
                    );

                    stats.imported++;

                } catch (error) {
                    console.error(`\n  ❌ Error processing row ${rowIndex + 1}:`, error.message);
                    stats.errors++;
                }

                // Update progress
                if ((rowIndex + 1) % CONFIG.PROGRESS_INTERVAL === 0) {
                    progressBar.update(rowIndex + 1);
                }
            }

            // Commit batch
            await db.run('COMMIT');

        } catch (error) {
            await db.run('ROLLBACK');
            console.error(`\n  ❌ Batch ${batchStart}-${batchEnd} failed:`, error.message);
            stats.errors += batch.length;
        }
    }

    // Complete progress bar
    progressBar.complete();

    // Finalize statements
    await insertStmt.finalize();
    await checkDuplicateStmt.finalize();
    await updateStmt.finalize();
    await insertTrackingStmt.finalize();
    await insertDuplicateStmt.finalize();

    return stats;
}

function extractListingData(row, rowNumber) {
    // Handle various possible column names
    const getId = () => {
        return row.id || row.ID || row.listing_id || row['Listing ID'] || 
               row.listingId || `ROW_${rowNumber}`;
    };

    const getTitle = () => {
        return row.title || row.Title || row.name || row.Name || 
               row['Listing Title'] || 'Untitled';
    };

    const getUrl = () => {
        return row.listing_url || row['Listing URL'] || row.url || row.URL ||
               row.link || row.Link || '';
    };

    const getPrice = () => {
        const price = row.price || row.Price || row.asking_price || row['Asking Price'] || 0;
        return typeof price === 'string' ? parseFloat(price.replace(/[^0-9.-]/g, '')) : price;
    };

    return {
        id: getId(),
        title: getTitle(),
        category: row.category || row.Category || null,
        property_type: row.property_type || row['Property Type'] || null,
        status: row.status || row.Status || 'active',
        price: getPrice(),
        listing_url: getUrl(),
        end_at: parseDate(row.end_at || row['End At'] || row['End Date']),
        created_at: parseDate(row.created_at || row['Created At'] || row['Create Date']),
        description: row.description || row.Description || null,
        monthly_revenue: parseFloat(row.monthly_revenue || row['Monthly Revenue'] || 0),
        monthly_profit: parseFloat(row.monthly_profit || row['Monthly Profit'] || 0),
        business_age: row.business_age || row['Business Age'] || null,
        industry: row.industry || row.Industry || null,
        location: row.location || row.Location || null,
        seller_name: row.seller_name || row['Seller Name'] || null,
        views: parseInt(row.views || row.Views || 0),
        watchers: parseInt(row.watchers || row.Watchers || 0),
        bids: parseInt(row.bids || row.Bids || 0),
        auction_type: row.auction_type || row['Auction Type'] || null
    };
}

function parseDate(dateValue) {
    if (!dateValue) return null;
    
    try {
        // Handle Excel date serial numbers
        if (typeof dateValue === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
            return date.toISOString();
        }
        
        // Handle string dates
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date.toISOString();
    } catch (error) {
        return null;
    }
}

function generateDataHash(listing) {
    const data = JSON.stringify({
        title: listing.title,
        price: listing.price,
        category: listing.category,
        status: listing.status,
        monthly_revenue: listing.monthly_revenue,
        monthly_profit: listing.monthly_profit
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function validateImport(db, stats) {
    console.log('\n🔍 Validating import...');

    // Check total count
    const result = await db.get('SELECT COUNT(*) as count FROM baseline_listings');
    const actualCount = result.count;

    console.log(`  Expected rows: ${CONFIG.EXPECTED_ROW_COUNT.toLocaleString()}`);
    console.log(`  Actual rows in database: ${actualCount.toLocaleString()}`);
    console.log(`  Rows processed: ${stats.total.toLocaleString()}`);

    if (actualCount < CONFIG.EXPECTED_ROW_COUNT * 0.95) {
        console.warn(`\n⚠️ WARNING: Import may be incomplete!`);
        console.warn(`  Only ${((actualCount / CONFIG.EXPECTED_ROW_COUNT) * 100).toFixed(1)}% of expected rows imported`);
        
        // Check for common issues
        if (stats.errors > 0) {
            console.warn(`  - ${stats.errors} errors occurred during import`);
        }
        if (stats.duplicates > stats.total * 0.1) {
            console.warn(`  - High duplicate rate: ${((stats.duplicates / stats.total) * 100).toFixed(1)}%`);
        }
    } else {
        console.log('\n✅ Import validation passed!');
    }

    // Verify data integrity
    console.log('\n📊 Data integrity check:');
    const integrityChecks = await db.all(`
        SELECT 
            COUNT(CASE WHEN id IS NULL OR id = '' THEN 1 END) as null_ids,
            COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as null_titles,
            COUNT(CASE WHEN listing_url IS NULL OR listing_url = '' THEN 1 END) as null_urls,
            COUNT(CASE WHEN price < 0 THEN 1 END) as negative_prices,
            COUNT(CASE WHEN price > 100000000 THEN 1 END) as excessive_prices
        FROM baseline_listings
    `);

    const issues = integrityChecks[0];
    console.log(`  - Missing IDs: ${issues.null_ids}`);
    console.log(`  - Missing titles: ${issues.null_titles}`);
    console.log(`  - Missing URLs: ${issues.null_urls}`);
    console.log(`  - Negative prices: ${issues.negative_prices}`);
    console.log(`  - Excessive prices (>$100M): ${issues.excessive_prices}`);
}

async function createIndexes(db) {
    console.log('\n🔍 Creating indexes for fast lookups...');

    const indexes = [
        // Primary indexes
        'CREATE INDEX IF NOT EXISTS idx_baseline_id ON baseline_listings(id)',
        'CREATE INDEX IF NOT EXISTS idx_baseline_category ON baseline_listings(category)',
        'CREATE INDEX IF NOT EXISTS idx_baseline_status ON baseline_listings(status)',
        'CREATE INDEX IF NOT EXISTS idx_baseline_end_at ON baseline_listings(end_at)',
        'CREATE INDEX IF NOT EXISTS idx_baseline_price ON baseline_listings(price)',
        'CREATE INDEX IF NOT EXISTS idx_baseline_created_at ON baseline_listings(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_baseline_url ON baseline_listings(listing_url)',
        
        // Composite indexes for common queries
        'CREATE INDEX IF NOT EXISTS idx_baseline_cat_status ON baseline_listings(category, status)',
        'CREATE INDEX IF NOT EXISTS idx_baseline_status_price ON baseline_listings(status, price)',
        
        // Tracking indexes
        'CREATE INDEX IF NOT EXISTS idx_tracking_listing_id ON tracking_log(listing_id)',
        'CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON tracking_log(change_timestamp)',
        'CREATE INDEX IF NOT EXISTS idx_tracking_action ON tracking_log(action)',
        'CREATE INDEX IF NOT EXISTS idx_tracking_batch ON tracking_log(batch_id)',
        
        // Duplicate prevention indexes
        'CREATE INDEX IF NOT EXISTS idx_duplicate_listing_id ON duplicate_prevention(listing_id)',
        'CREATE INDEX IF NOT EXISTS idx_duplicate_title_hash ON duplicate_prevention(title_hash)',
        'CREATE INDEX IF NOT EXISTS idx_duplicate_url_hash ON duplicate_prevention(url_hash)'
    ];

    const indexProgress = new ProgressBar(indexes.length, '  Creating indexes');

    for (let i = 0; i < indexes.length; i++) {
        try {
            await db.run(indexes[i]);
            indexProgress.update(i + 1);
        } catch (error) {
            if (!error.message.includes('already exists')) {
                console.error(`\n  ❌ Failed to create index: ${error.message}`);
            }
        }
    }

    indexProgress.complete();
}

async function optimizeDatabase(db) {
    console.log('🔧 Optimizing database...');
    
    // Analyze tables for query optimization
    await db.run('ANALYZE');
    
    // Vacuum to reclaim space
    await db.run('VACUUM');
    
    console.log('✅ Database optimized');
}

async function displaySummary(db, importStats) {
    console.log('\n📊 Database Summary');
    console.log('==================');

    // Get table statistics
    const tables = [
        'baseline_listings',
        'tracking_log',
        'duplicate_prevention',
        'import_history'
    ];

    console.log('\n📋 Table Record Counts:');
    for (const table of tables) {
        const result = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${result.count.toLocaleString()} records`);
    }

    // Category breakdown
    console.log('\n📂 Top 10 Categories:');
    const categories = await db.all(`
        SELECT category, COUNT(*) as count 
        FROM baseline_listings 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 10
    `);

    categories.forEach(cat => {
        console.log(`  - ${cat.category || 'Unknown'}: ${cat.count.toLocaleString()} listings`);
    });

    // Price range analysis
    console.log('\n💰 Price Range Analysis:');
    const priceRanges = await db.get(`
        SELECT 
            MIN(price) as min_price,
            MAX(price) as max_price,
            AVG(price) as avg_price,
            MEDIAN(price) as median_price,
            COUNT(CASE WHEN price < 10000 THEN 1 END) as under_10k,
            COUNT(CASE WHEN price BETWEEN 10000 AND 100000 THEN 1 END) as range_10k_100k,
            COUNT(CASE WHEN price BETWEEN 100000 AND 1000000 THEN 1 END) as range_100k_1m,
            COUNT(CASE WHEN price > 1000000 THEN 1 END) as over_1m
        FROM baseline_listings
        WHERE price > 0
    `);

    console.log(`  - Min: $${formatNumber(priceRanges.min_price)}`);
    console.log(`  - Max: $${formatNumber(priceRanges.max_price)}`);
    console.log(`  - Average: $${formatNumber(priceRanges.avg_price)}`);
    console.log(`  - Under $10K: ${priceRanges.under_10k.toLocaleString()} listings`);
    console.log(`  - $10K-$100K: ${priceRanges.range_10k_100k.toLocaleString()} listings`);
    console.log(`  - $100K-$1M: ${priceRanges.range_100k_1m.toLocaleString()} listings`);
    console.log(`  - Over $1M: ${priceRanges.over_1m.toLocaleString()} listings`);

    // Status breakdown
    console.log('\n📊 Status Breakdown:');
    const statuses = await db.all(`
        SELECT status, COUNT(*) as count 
        FROM baseline_listings 
        GROUP BY status 
        ORDER BY count DESC
    `);

    statuses.forEach(status => {
        console.log(`  - ${status.status || 'Unknown'}: ${status.count.toLocaleString()} listings`);
    });

    // Performance metrics
    const importHistory = await db.get(`
        SELECT * FROM import_history 
        ORDER BY import_timestamp DESC 
        LIMIT 1
    `);

    if (importHistory) {
        console.log('\n⚡ Import Performance:');
        console.log(`  - Total time: ${(importHistory.import_duration_ms / 1000).toFixed(2)} seconds`);
        console.log(`  - Rows per second: ${(importHistory.total_rows / (importHistory.import_duration_ms / 1000)).toFixed(0)}`);
        console.log(`  - Memory usage: ${importHistory.memory_peak_mb?.toFixed(2) || 'N/A'} MB`);
        console.log(`  - Batches processed: ${importHistory.batches_processed || 'N/A'}`);
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(num || 0);
}

// Add median function for SQLite
async function addCustomFunctions(db) {
    // SQLite doesn't have built-in MEDIAN, so we'll calculate it separately if needed
}

// Export functions for use in other scripts
module.exports = {
    setupDatabase,
    DB_PATH,
    CONFIG
};

// Run if called directly
if (require.main === module) {
    setupDatabase().catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
}