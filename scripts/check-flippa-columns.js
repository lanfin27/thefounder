const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client with service role key for schema access
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFlippaColumns() {
    console.log('🔍 Flippa Listings Table Schema Analysis');
    console.log('=' .repeat(60));
    console.log(`Database URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log('=' .repeat(60));
    
    try {
        // Method 1: Try raw SQL query for information_schema
        console.log('\n📊 Method 1: Querying information_schema.columns with raw SQL...\n');
        
        const schemaQuery = `
            SELECT column_name, data_type, is_nullable, column_default, ordinal_position
            FROM information_schema.columns 
            WHERE table_name = 'flippa_listings' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `;
        
        const { data: schemaColumns, error: schemaError } = await supabase.rpc('exec_sql', {
            query: schemaQuery
        });

        if (!schemaError && schemaColumns && schemaColumns.length > 0) {
            console.log('✅ Successfully retrieved schema information via raw SQL:\n');
            displaySchemaInfo(schemaColumns);
            return;
        }

        console.log('Raw SQL method failed, trying alternative approaches...\n');
        
        // Method 2: Try RPC function
        const { data: columns, error: rpcError } = await supabase.rpc('get_table_columns', {
            table_name: 'flippa_listings'
        });

        if (!rpcError && columns && columns.length > 0) {
            console.log('✅ Successfully retrieved via RPC function:\n');
            displayColumnInfo(columns);
            return;
        }

        // Method 3: Direct information_schema query
        console.log('RPC function not available, trying direct query...\n');
        
        const { data: directColumns, error: directError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default, ordinal_position')
            .eq('table_name', 'flippa_listings')
            .order('ordinal_position');

        if (!directError && directColumns && directColumns.length > 0) {
            console.log('✅ Successfully retrieved via direct query:\n');
            displayColumnInfo(directColumns);
            return;
        }

        // Method 4: Fallback to sample data analysis
        console.log('Direct query failed, using sample data analysis...\n');
        
        const { data: sampleData, error: sampleError } = await supabase
            .from('flippa_listings')
            .select('*')
            .limit(1);

        if (sampleError) {
            throw new Error(`All methods failed. Sample data error: ${sampleError.message}`);
        }

        if (sampleData && sampleData.length > 0) {
            console.log('✅ Retrieved column information from sample data:\n');
            const columnNames = Object.keys(sampleData[0]);
            
            columnNames.forEach((col, index) => {
                const value = sampleData[0][col];
                const dataType = typeof value === 'number' ? 
                    (Number.isInteger(value) ? 'integer' : 'numeric') :
                    typeof value === 'boolean' ? 'boolean' :
                    value instanceof Date ? 'timestamp' : 'text';
                
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${col.padEnd(25)} | ${dataType.padEnd(15)} | ${value !== null ? 'NOT NULL' : 'NULLABLE'}`);
            });
            
            generateInsertStatement(columnNames);
        } else {
            throw new Error('No data found in flippa_listings table');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Final fallback: Show expected structure based on migration files
        console.log('\n📋 Expected flippa_listings structure based on migrations:\n');
        showExpectedStructure();
    }
}

function displaySchemaInfo(columns) {
    if (!columns || columns.length === 0) {
        throw new Error('No schema information retrieved');
    }

    console.log('✅ flippa_listings Table Schema (from information_schema):\n');
    console.log('No. | Column Name              | Data Type       | Nullable | Default');
    console.log('-'.repeat(85));

    const sortedColumns = columns.sort((a, b) => (a.ordinal_position || 0) - (b.ordinal_position || 0));
    
    sortedColumns.forEach((col, index) => {
        const colName = col.column_name;
        const dataType = col.data_type;
        const nullable = col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL';
        const defaultVal = col.column_default ? col.column_default.substring(0, 20) + '...' : 'NULL';
        
        console.log(
            `${(index + 1).toString().padStart(2, '0')}. | ` +
            `${colName.padEnd(24)} | ` +
            `${dataType.padEnd(15)} | ` +
            `${nullable.padEnd(8)} | ` +
            `${defaultVal}`
        );
    });

    const columnNames = sortedColumns.map(col => col.column_name);
    generateInsertStatement(columnNames);
}

function displayColumnInfo(columns) {
    if (!columns || columns.length === 0) {
        throw new Error('No column information retrieved');
    }

    console.log('✅ flippa_listings Table Columns:\n');
    console.log('No. | Column Name              | Data Type       | Nullable | Default');
    console.log('-'.repeat(80));

    const sortedColumns = columns.sort((a, b) => (a.ordinal_position || 0) - (b.ordinal_position || 0));
    
    sortedColumns.forEach((col, index) => {
        const colName = col.column_name || col.name;
        const dataType = col.data_type || col.type;
        const nullable = col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL';
        const defaultVal = col.column_default || 'NULL';
        
        console.log(
            `${(index + 1).toString().padStart(2, '0')}. | ` +
            `${colName.padEnd(24)} | ` +
            `${dataType.padEnd(15)} | ` +
            `${nullable.padEnd(8)} | ` +
            `${defaultVal}`
        );
    });

    const columnNames = sortedColumns.map(col => col.column_name || col.name);
    generateInsertStatement(columnNames);
}

function generateInsertStatement(columnNames) {
    console.log('\n🔧 Generated INSERT Statement Template:\n');
    
    // Create INSERT statement with proper PostgreSQL syntax
    const insertSQL = `INSERT INTO flippa_listings (
    ${columnNames.join(',\n    ')}
) VALUES (
    ${columnNames.map((_, index) => `$${index + 1}`).join(',\n    ')}
) ON CONFLICT (url) DO UPDATE SET
    ${columnNames.filter(col => !['id', 'created_at'].includes(col))
        .map(col => `${col} = EXCLUDED.${col}`)
        .join(',\n    ')};`;

    console.log(insertSQL);

    // Create JavaScript object mapping with proper types
    console.log('\n📝 JavaScript Object Mapping (Migration-Ready):\n');
    console.log('const flippaListingData = {');
    columnNames.forEach((col, index) => {
        const { value, comment } = getPlaceholderValueWithComment(col);
        console.log(`    ${col}: ${value}${comment ? ' // ' + comment : ''}${index < columnNames.length - 1 ? ',' : ''}`);
    });
    console.log('};');

    // Create batch insert function
    console.log('\n🚀 Batch Insert Function for Migration:\n');
    console.log(`async function insertFlippaListings(listings) {
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < listings.length; i += batchSize) {
        const batch = listings.slice(i, i + batchSize);
        
        const { data, error } = await supabase
            .from('flippa_listings')
            .upsert(batch, {
                onConflict: 'url',
                ignoreDuplicates: false
            })
            .select();
            
        if (error) {
            console.error(\`Batch \${Math.floor(i/batchSize) + 1} error:\`, error);
            throw error;
        }
        
        results.push(...data);
        console.log(\`Processed batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(listings.length/batchSize)}\`);
    }
    
    return results;
}`);

    // Data validation function
    console.log('\n✅ Data Validation Helper:\n');
    console.log(`function validateFlippaListing(listing) {
    const errors = [];
    
    // Required field validation
    if (!listing.url) errors.push('URL is required');
    if (!listing.title) errors.push('Title is required');
    if (!listing.category) errors.push('Category is required');
    
    // Type validation
    if (typeof listing.asking_price !== 'number') errors.push('asking_price must be number');
    if (typeof listing.monthly_revenue !== 'number') errors.push('monthly_revenue must be number');
    if (typeof listing.monthly_profit !== 'number') errors.push('monthly_profit must be number');
    
    // Range validation
    if (listing.asking_price < 0) errors.push('asking_price cannot be negative');
    if (listing.monthly_revenue < 0) errors.push('monthly_revenue cannot be negative');
    
    return {
        isValid: errors.length === 0,
        errors
    };
}`);

    // Create column mapping documentation
    console.log('\n📋 Column Mapping Documentation:\n');
    columnNames.forEach((col, index) => {
        const mapping = getColumnMapping(col);
        console.log(`${(index + 1).toString().padStart(2, '0')}. ${col.padEnd(20)} → ${mapping}`);
    });

    console.log('\n📊 Migration Summary:');
    console.log(`Total columns: ${columnNames.length}`);
    console.log(`Required for migration: ${columnNames.filter(col => 
        !['id', 'created_at', 'updated_at', 'scraped_at'].includes(col)
    ).length}`);
    console.log(`Auto-generated: ${columnNames.filter(col => 
        ['id', 'created_at', 'updated_at'].includes(col)
    ).length}`);
    console.log(`Timestamp fields: ${columnNames.filter(col => 
        col.includes('_at') || col.includes('date')
    ).length}`);
}

function getPlaceholderValueWithComment(columnName) {
    const col = columnName.toLowerCase();
    
    if (col === 'id') return { value: 'null', comment: 'Auto-generated primary key' };
    if (col === 'session_id') return { value: "'migration_session_' + Date.now()", comment: 'Migration tracking' };
    if (col.includes('title')) return { value: "scraped.title || 'Untitled Listing'", comment: 'From scraped data' };
    if (col.includes('url')) return { value: "scraped.url", comment: 'Unique identifier from Flippa' };
    if (col.includes('description')) return { value: "scraped.description || ''", comment: 'HTML content may need cleaning' };
    if (col.includes('category')) return { value: "scraped.category || 'Website'", comment: 'Flippa category' };
    if (col === 'asking_price') return { value: "parseInt(scraped.asking_price) || 0", comment: 'Parse from currency string' };
    if (col === 'monthly_revenue') return { value: "parseInt(scraped.monthly_revenue) || 0", comment: 'Parse from currency string' };
    if (col === 'monthly_profit') return { value: "parseInt(scraped.monthly_profit) || 0", comment: 'Parse from currency string' };
    if (col === 'age_months') return { value: "parseInt(scraped.age_months) || 0", comment: 'Business age in months' };
    if (col === 'page_views_monthly') return { value: "parseInt(scraped.page_views_monthly) || 0", comment: 'Monthly page views' };
    if (col.includes('technologies')) return { value: "scraped.technologies || null", comment: 'Tech stack used' };
    if (col === 'scraped_at') return { value: "new Date().toISOString()", comment: 'Migration timestamp' };
    if (col === 'created_at') return { value: "new Date().toISOString()", comment: 'Database timestamp' };
    
    return { value: "null", comment: `Unknown field: ${columnName}` };
}

function getColumnMapping(columnName) {
    const col = columnName.toLowerCase();
    
    if (col === 'id') return 'Auto-generated serial primary key';
    if (col === 'session_id') return 'Migration batch tracking ID';
    if (col === 'url') return 'Flippa listing URL (unique)';
    if (col === 'title') return 'Listing title from Flippa';
    if (col === 'asking_price') return 'Listing price in USD';
    if (col === 'monthly_revenue') return 'Monthly revenue in USD';
    if (col === 'monthly_profit') return 'Monthly profit in USD';
    if (col === 'age_months') return 'Business age in months';
    if (col === 'page_views_monthly') return 'Monthly page views count';
    if (col === 'category') return 'Business category from Flippa';
    if (col === 'description') return 'Full listing description';
    if (col === 'technologies') return 'Technology stack (optional)';
    if (col === 'scraped_at') return 'When data was scraped';
    if (col === 'created_at') return 'Database record creation time';
    
    return 'Custom field - needs mapping definition';
}

function getPlaceholderValue(columnName) {
    const col = columnName.toLowerCase();
    
    if (col.includes('id') && !col.includes('flippa')) return 'null, // Auto-generated';
    if (col.includes('title')) return "'Sample Listing Title'";
    if (col.includes('url') || col.includes('link')) return "'https://flippa.com/listing/12345'";
    if (col.includes('description')) return "'Sample listing description'";
    if (col.includes('category')) return "'Website'";
    if (col.includes('price') || col.includes('revenue') || col.includes('profit')) return '0';
    if (col.includes('multiple')) return '0.0';
    if (col.includes('age') || col.includes('count')) return '0';
    if (col.includes('date') || col.includes('created') || col.includes('updated')) return 'new Date().toISOString()';
    if (col.includes('verified') || col.includes('premium') || col.includes('featured')) return 'false';
    if (col.includes('flippa_id')) return "'12345'";
    
    return "'sample_value'";
}

function showExpectedStructure() {
    const expectedColumns = [
        'id', 'flippa_id', 'title', 'url', 'category', 'asking_price',
        'monthly_revenue', 'monthly_profit', 'revenue_multiple', 'profit_multiple',
        'listing_age', 'description', 'verified', 'premium', 'featured',
        'website_age', 'page_views', 'unique_visitors', 'monetization_method',
        'growth_opportunity', 'reason_for_selling', 'highlights',
        'created_at', 'updated_at', 'scraped_at'
    ];

    console.log('Expected columns based on schema migrations:');
    console.log('-'.repeat(50));
    expectedColumns.forEach((col, index) => {
        console.log(`${(index + 1).toString().padStart(2, '0')}. ${col}`);
    });

    generateInsertStatement(expectedColumns);
}

async function testDatabaseConnection() {
    console.log('\n🔧 Testing Database Connection & Sample Data:\n');
    
    try {
        // Test connection
        const { data: connectionTest, error: connectionError } = await supabase
            .from('flippa_listings')
            .select('count')
            .single();
            
        if (connectionError && connectionError.code !== 'PGRST116') {
            throw new Error(`Connection failed: ${connectionError.message}`);
        }
        
        // Get row count
        const { count, error: countError } = await supabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true });
            
        if (countError) {
            console.log('Count query failed, trying alternative...');
            const { data: allData, error: altError } = await supabase
                .from('flippa_listings')
                .select('id');
            if (!altError) {
                console.log(`📊 Total records: ${allData.length}`);
            }
        } else {
            console.log(`📊 Total records: ${count}`);
        }
        
        // Show sample records
        const { data: samples, error: sampleError } = await supabase
            .from('flippa_listings')
            .select('id, title, asking_price, monthly_revenue, category, created_at')
            .limit(3);
            
        if (sampleError) {
            console.log('❌ Could not fetch samples:', sampleError.message);
        } else if (samples && samples.length > 0) {
            console.log('\n📋 Sample Records:');
            console.log('-'.repeat(80));
            samples.forEach((record, index) => {
                console.log(`${index + 1}. ${record.title?.substring(0, 40)}...`);
                console.log(`   💰 Price: $${record.asking_price?.toLocaleString() || 'N/A'} | Revenue: $${record.monthly_revenue?.toLocaleString() || 'N/A'}/month`);
                console.log(`   🏷️  Category: ${record.category} | ID: ${record.id}`);
                console.log('');
            });
        } else {
            console.log('📋 No sample data found in table');
        }
        
        // Test write permission
        console.log('🔐 Testing write permissions...');
        const testData = {
            session_id: 'test_connection_' + Date.now(),
            url: 'https://test.example.com/test-' + Date.now(),
            title: 'Connection Test Listing',
            asking_price: 1,
            monthly_revenue: 1,
            monthly_profit: 1,
            age_months: 1,
            page_views_monthly: 1,
            category: 'Test',
            description: 'Test connection',
            scraped_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        
        const { data: insertResult, error: insertError } = await supabase
            .from('flippa_listings')
            .insert(testData)
            .select();
            
        if (insertError) {
            console.log('❌ Write test failed:', insertError.message);
        } else {
            console.log('✅ Write permissions confirmed');
            
            // Clean up test record
            await supabase
                .from('flippa_listings')
                .delete()
                .eq('id', insertResult[0].id);
        }
        
    } catch (error) {
        console.error('❌ Database test error:', error.message);
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--test') || args.includes('-t')) {
        testDatabaseConnection()
            .then(() => {
                console.log('\n✅ Database test completed!');
                process.exit(0);
            })
            .catch((error) => {
                console.error('\n❌ Database test failed:', error.message);
                process.exit(1);
            });
    } else {
        checkFlippaColumns()
            .then(async () => {
                console.log('\n🔧 Running additional database tests...');
                await testDatabaseConnection();
                console.log('\n✅ Complete schema analysis finished successfully!');
                process.exit(0);
            })
            .catch((error) => {
                console.error('\n❌ Schema analysis failed:', error.message);
                process.exit(1);
            });
    }
}

module.exports = { checkFlippaColumns, testDatabaseConnection };