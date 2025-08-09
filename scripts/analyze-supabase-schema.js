// analyze-supabase-schema.js
// Analyze the actual Supabase table structure

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeSchema() {
    console.log('🔍 Analyzing Supabase Table Schema');
    console.log('==================================\n');

    try {
        // Method 1: Get table information using a dummy query
        console.log('📊 Fetching table structure...\n');
        
        // Get one row to see the structure
        const { data: sampleData, error: sampleError } = await supabase
            .from('flippa_listings')
            .select('*')
            .limit(1);

        if (sampleError) {
            console.error('❌ Error fetching sample data:', sampleError.message);
            
            // Try to get table info from error message
            if (sampleError.message.includes('column')) {
                console.log('\n📋 Parsing error for column info...');
                console.log(sampleError.message);
            }
        }

        // Method 2: Try inserting empty record to see required fields
        console.log('\n🧪 Testing column availability...\n');
        
        const testRecord = {
            listing_id: 'TEST_SCHEMA_' + Date.now(),
            title: 'Schema Test Record'
        };

        const { data: insertTest, error: insertError } = await supabase
            .from('flippa_listings')
            .insert(testRecord)
            .select();

        if (insertError) {
            console.log('📋 Insert error (this is expected):', insertError.message);
            
            // Clean up test record if it was inserted
            if (!insertError.message.includes('column')) {
                await supabase
                    .from('flippa_listings')
                    .delete()
                    .eq('listing_id', testRecord.listing_id);
            }
        } else if (insertTest) {
            console.log('✅ Basic insert successful, cleaning up test record...');
            
            // Show what was actually inserted
            console.log('\n📋 Actual columns in response:');
            Object.keys(insertTest[0]).forEach(col => {
                console.log(`  - ${col}: ${typeof insertTest[0][col]}`);
            });

            // Clean up
            await supabase
                .from('flippa_listings')
                .delete()
                .eq('listing_id', testRecord.listing_id);
        }

        // Method 3: Test specific columns
        console.log('\n🔧 Testing specific columns...\n');
        
        const columnsToTest = [
            'id', 'listing_id', 'title', 'price', 'monthly_revenue',
            'multiple', 'multiple_text', 'property_type', 'category',
            'badges', 'url', 'quality_score', 'extraction_confidence',
            'page_number', 'extraction_timestamp', 'source', 'raw_data',
            'created_at', 'status', 'description', 'monthly_profit'
        ];

        const availableColumns = [];
        const missingColumns = [];

        for (const column of columnsToTest) {
            try {
                const { error } = await supabase
                    .from('flippa_listings')
                    .select(column)
                    .limit(1);

                if (error && error.message.includes(`column "${column}" does not exist`)) {
                    missingColumns.push(column);
                } else {
                    availableColumns.push(column);
                }
            } catch (e) {
                missingColumns.push(column);
            }
        }

        console.log('✅ Available columns:');
        availableColumns.forEach(col => console.log(`  - ${col}`));

        console.log('\n❌ Missing columns:');
        missingColumns.forEach(col => console.log(`  - ${col}`));

        // Method 4: Check if raw_data JSONB exists
        console.log('\n🔍 Checking for raw_data JSONB column...');
        
        const { error: jsonbError } = await supabase
            .from('flippa_listings')
            .select('raw_data')
            .limit(1);

        if (!jsonbError) {
            console.log('✅ raw_data JSONB column is available for storing extra data');
        } else {
            console.log('❌ raw_data column not available');
        }

        // Generate schema mapping
        console.log('\n📋 Recommended Schema Mapping:');
        console.log('================================\n');

        const schemaMapping = {
            direct: {},
            toRawData: [],
            skip: []
        };

        // Define mapping rules
        const mappingRules = {
            'id': { skip: true }, // Auto-generated
            'listing_id': { map: 'id' }, // From SQLite id
            'title': { map: 'title' },
            'price': { map: 'price' },
            'monthly_revenue': { map: 'monthly_revenue' },
            'property_type': { map: 'property_type' },
            'category': { map: 'category' },
            'url': { map: 'listing_url' },
            'created_at': { skip: true }, // Auto-generated
            'extraction_timestamp': { map: 'created_at' },
            'source': { default: 'baseline_import' }
        };

        availableColumns.forEach(col => {
            if (mappingRules[col]) {
                if (mappingRules[col].skip) {
                    schemaMapping.skip.push(col);
                } else {
                    schemaMapping.direct[col] = mappingRules[col];
                }
            }
        });

        missingColumns.forEach(col => {
            if (!mappingRules[col]?.skip) {
                schemaMapping.toRawData.push(col);
            }
        });

        console.log('Direct mappings:');
        Object.entries(schemaMapping.direct).forEach(([col, rule]) => {
            console.log(`  ${col} ← ${rule.map || rule.default}`);
        });

        console.log('\nStore in raw_data:');
        schemaMapping.toRawData.forEach(col => {
            console.log(`  - ${col}`);
        });

        console.log('\nSkip (auto-generated):');
        schemaMapping.skip.forEach(col => {
            console.log(`  - ${col}`);
        });

        // Save schema info
        const schemaInfo = {
            analyzed: new Date().toISOString(),
            availableColumns,
            missingColumns,
            schemaMapping,
            hasRawData: !jsonbError
        };

        const fs = require('fs');
        const outputPath = path.join(__dirname, '..', 'data', 'supabase_schema.json');
        fs.writeFileSync(outputPath, JSON.stringify(schemaInfo, null, 2));

        console.log(`\n💾 Schema analysis saved to: ${outputPath}`);

        return schemaInfo;

    } catch (error) {
        console.error('❌ Schema analysis failed:', error);
        return null;
    }
}

// Export for use in other scripts
module.exports = { analyzeSchema };

// Run if called directly
if (require.main === module) {
    analyzeSchema()
        .then(schema => {
            if (schema) {
                console.log('\n✅ Schema analysis complete!');
                console.log('\nNext steps:');
                console.log('1. Review the schema mapping above');
                console.log('2. Run the fixed migration script:');
                console.log('   node scripts/migrate-sqlite-to-supabase-fixed.js');
            }
        })
        .catch(console.error);
}