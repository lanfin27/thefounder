// setup-baseline-database.js
// Create baseline database from Excel data with tracking capabilities

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Database configuration
const DB_PATH = path.join(__dirname, '..', 'data', 'flippa_baseline.db');
const EXCEL_PATH = process.argv[2] || path.join(__dirname, '..', 'dataset_flippascraperapi_20250802_051204877.xlsx');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

async function setupDatabase() {
    console.log('🚀 Setting up Baseline Database System');
    console.log('=====================================\n');

    // Check if Excel file exists
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error(`❌ Excel file not found: ${EXCEL_PATH}`);
        console.log('\n📋 Usage: node setup-baseline-database.js [path-to-excel-file]');
        console.log('📋 Or place the Excel file in the project root with the name:');
        console.log('   dataset_flippascraperapi_20250802_051204877.xlsx');
        process.exit(1);
    }

    console.log(`📄 Excel file found: ${EXCEL_PATH}`);

    // Open SQLite database
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log(`📊 Database created: ${DB_PATH}`);

    try {
        // Create tables
        await createTables(db);
        
        // Import Excel data
        const stats = await importExcelData(db, EXCEL_PATH);
        
        // Create indexes
        await createIndexes(db);
        
        // Display summary
        await displaySummary(db, stats);

        console.log('\n✅ Baseline database setup completed successfully!');

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        throw error;
    } finally {
        await db.close();
    }
}

async function createTables(db) {
    console.log('\n📋 Creating database tables...');

    // Drop existing tables if they exist
    await db.run('DROP TABLE IF EXISTS baseline_listings');
    await db.run('DROP TABLE IF EXISTS tracking_log');
    await db.run('DROP TABLE IF EXISTS import_history');

    // Create baseline_listings table
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
            -- Metadata
            data_hash TEXT,
            imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
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
            FOREIGN KEY (listing_id) REFERENCES baseline_listings(id)
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
            import_duration_ms INTEGER,
            import_metadata TEXT
        )
    `);

    console.log('✅ Created import_history table');

    // Create duplicate_prevention table
    await db.run(`
        CREATE TABLE duplicate_prevention (
            hash_id TEXT PRIMARY KEY,
            listing_id TEXT NOT NULL,
            title_hash TEXT NOT NULL,
            url_hash TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            occurrence_count INTEGER DEFAULT 1
        )
    `);

    console.log('✅ Created duplicate_prevention table');
}

async function importExcelData(db, excelPath) {
    console.log('\n📥 Importing Excel data...');
    const startTime = Date.now();

    // Read Excel file
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} rows in Excel file`);

    const stats = {
        total: data.length,
        imported: 0,
        duplicates: 0,
        errors: 0,
        updates: 0
    };

    // Begin transaction for better performance
    await db.run('BEGIN TRANSACTION');

    try {
        // Prepare statements
        const insertStmt = await db.prepare(`
            INSERT INTO baseline_listings (
                id, title, category, property_type, status, price, 
                listing_url, end_at, created_at, description,
                monthly_revenue, monthly_profit, business_age,
                industry, location, seller_name, data_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const checkDuplicateStmt = await db.prepare(`
            SELECT id, data_hash FROM baseline_listings WHERE listing_url = ? OR id = ?
        `);

        const insertTrackingStmt = await db.prepare(`
            INSERT INTO tracking_log (
                listing_id, action, field_name, old_value, new_value, 
                change_source, change_metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const insertDuplicateStmt = await db.prepare(`
            INSERT INTO duplicate_prevention (
                hash_id, listing_id, title_hash, url_hash, content_hash
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(hash_id) DO UPDATE SET
                last_seen = CURRENT_TIMESTAMP,
                occurrence_count = occurrence_count + 1
        `);

        // Process each row
        for (let i = 0; i < data.length; i++) {
            try {
                const row = data[i];
                
                // Extract and validate data
                const listing = {
                    id: row.id || row.ID || generateId(),
                    title: row.title || row.Title || 'Untitled',
                    category: row.category || row.Category || null,
                    property_type: row.property_type || row['Property Type'] || null,
                    status: row.status || row.Status || 'active',
                    price: parseFloat(row.price || row.Price || 0),
                    listing_url: row.listing_url || row['Listing URL'] || row.url || '',
                    end_at: parseDate(row.end_at || row['End At'] || row['End Date']),
                    created_at: parseDate(row.created_at || row['Created At'] || row['Create Date']),
                    description: row.description || row.Description || null,
                    monthly_revenue: parseFloat(row.monthly_revenue || row['Monthly Revenue'] || 0),
                    monthly_profit: parseFloat(row.monthly_profit || row['Monthly Profit'] || 0),
                    business_age: row.business_age || row['Business Age'] || null,
                    industry: row.industry || row.Industry || null,
                    location: row.location || row.Location || null,
                    seller_name: row.seller_name || row['Seller Name'] || null
                };

                // Generate data hash for duplicate detection
                const dataHash = generateDataHash(listing);
                
                // Check for duplicates
                const existing = await checkDuplicateStmt.get(listing.listing_url, listing.id);
                
                if (existing) {
                    if (existing.data_hash !== dataHash) {
                        // Data has changed, log the update
                        await insertTrackingStmt.run(
                            listing.id,
                            'UPDATE',
                            'data_hash',
                            existing.data_hash,
                            dataHash,
                            'excel_import',
                            JSON.stringify({ row: i + 1, file: path.basename(excelPath) })
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
                    dataHash
                );

                // Log the insertion
                await insertTrackingStmt.run(
                    listing.id,
                    'INSERT',
                    null,
                    null,
                    null,
                    'excel_import',
                    JSON.stringify({ row: i + 1, file: path.basename(excelPath) })
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

                // Progress update
                if ((i + 1) % 100 === 0) {
                    console.log(`  Processed ${i + 1}/${data.length} rows...`);
                }

            } catch (error) {
                console.error(`  ❌ Error processing row ${i + 1}:`, error.message);
                stats.errors++;
            }
        }

        // Finalize statements
        await insertStmt.finalize();
        await checkDuplicateStmt.finalize();
        await insertTrackingStmt.finalize();
        await insertDuplicateStmt.finalize();

        // Commit transaction
        await db.run('COMMIT');

        // Record import history
        const duration = Date.now() - startTime;
        await db.run(`
            INSERT INTO import_history (
                filename, total_rows, imported_rows, duplicate_rows, 
                error_rows, import_duration_ms, import_metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            path.basename(excelPath),
            stats.total,
            stats.imported,
            stats.duplicates,
            stats.errors,
            duration,
            JSON.stringify({
                updates: stats.updates,
                importDate: new Date().toISOString(),
                fileSize: fs.statSync(excelPath).size
            })
        ]);

        console.log(`\n✅ Import completed in ${duration}ms`);
        console.log(`  - Imported: ${stats.imported} new listings`);
        console.log(`  - Duplicates: ${stats.duplicates} skipped`);
        console.log(`  - Updates: ${stats.updates} listings updated`);
        console.log(`  - Errors: ${stats.errors} rows failed`);

        return stats;

    } catch (error) {
        await db.run('ROLLBACK');
        throw error;
    }
}

async function createIndexes(db) {
    console.log('\n🔍 Creating indexes for fast lookups...');

    const indexes = [
        'CREATE INDEX idx_baseline_id ON baseline_listings(id)',
        'CREATE INDEX idx_baseline_category ON baseline_listings(category)',
        'CREATE INDEX idx_baseline_status ON baseline_listings(status)',
        'CREATE INDEX idx_baseline_end_at ON baseline_listings(end_at)',
        'CREATE INDEX idx_baseline_price ON baseline_listings(price)',
        'CREATE INDEX idx_baseline_created_at ON baseline_listings(created_at)',
        'CREATE INDEX idx_baseline_url ON baseline_listings(listing_url)',
        'CREATE INDEX idx_tracking_listing_id ON tracking_log(listing_id)',
        'CREATE INDEX idx_tracking_timestamp ON tracking_log(change_timestamp)',
        'CREATE INDEX idx_tracking_action ON tracking_log(action)',
        'CREATE INDEX idx_duplicate_listing_id ON duplicate_prevention(listing_id)',
        'CREATE INDEX idx_duplicate_hashes ON duplicate_prevention(title_hash, url_hash)'
    ];

    for (const index of indexes) {
        try {
            await db.run(index);
            console.log(`  ✅ ${index.match(/idx_\w+/)[0]}`);
        } catch (error) {
            if (!error.message.includes('already exists')) {
                console.error(`  ❌ Failed to create index: ${error.message}`);
            }
        }
    }
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

    for (const table of tables) {
        const result = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${result.count} records`);
    }

    // Category breakdown
    console.log('\n📂 Category Breakdown:');
    const categories = await db.all(`
        SELECT category, COUNT(*) as count 
        FROM baseline_listings 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 10
    `);

    categories.forEach(cat => {
        console.log(`  - ${cat.category || 'Unknown'}: ${cat.count} listings`);
    });

    // Price range analysis
    console.log('\n💰 Price Range Analysis:');
    const priceRanges = await db.get(`
        SELECT 
            MIN(price) as min_price,
            MAX(price) as max_price,
            AVG(price) as avg_price,
            COUNT(CASE WHEN price < 10000 THEN 1 END) as under_10k,
            COUNT(CASE WHEN price BETWEEN 10000 AND 100000 THEN 1 END) as range_10k_100k,
            COUNT(CASE WHEN price > 100000 THEN 1 END) as over_100k
        FROM baseline_listings
        WHERE price > 0
    `);

    console.log(`  - Min: $${formatNumber(priceRanges.min_price)}`);
    console.log(`  - Max: $${formatNumber(priceRanges.max_price)}`);
    console.log(`  - Average: $${formatNumber(priceRanges.avg_price)}`);
    console.log(`  - Under $10K: ${priceRanges.under_10k} listings`);
    console.log(`  - $10K-$100K: ${priceRanges.range_10k_100k} listings`);
    console.log(`  - Over $100K: ${priceRanges.over_100k} listings`);

    // Status breakdown
    console.log('\n📊 Status Breakdown:');
    const statuses = await db.all(`
        SELECT status, COUNT(*) as count 
        FROM baseline_listings 
        GROUP BY status 
        ORDER BY count DESC
    `);

    statuses.forEach(status => {
        console.log(`  - ${status.status || 'Unknown'}: ${status.count} listings`);
    });
}

// Helper functions
function generateId() {
    return 'listing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

function formatNumber(num) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(num || 0);
}

// Export functions for use in other scripts
module.exports = {
    setupDatabase,
    DB_PATH
};

// Run if called directly
if (require.main === module) {
    setupDatabase().catch(console.error);
}