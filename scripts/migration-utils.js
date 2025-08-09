// migration-utils.js
// Utility functions for managing SQLite to Supabase migration

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FLIPPA_TABLE = 'flippa_listings';

async function checkMigrationStatus() {
    console.log('📊 Checking Migration Status');
    console.log('===========================\n');

    try {
        // Count baseline imported records
        const { count: baselineCount, error: baselineError } = await supabase
            .from(FLIPPA_TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('source', 'baseline_import');

        if (baselineError) throw baselineError;

        // Count all records
        const { count: totalCount, error: totalError } = await supabase
            .from(FLIPPA_TABLE)
            .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Get sample of imported data
        const { data: sampleData, error: sampleError } = await supabase
            .from(FLIPPA_TABLE)
            .select('listing_id, title, price, category, created_at')
            .eq('source', 'baseline_import')
            .order('created_at', { ascending: false })
            .limit(5);

        if (sampleError) throw sampleError;

        // Get category breakdown
        const { data: categories, error: catError } = await supabase
            .from(FLIPPA_TABLE)
            .select('category')
            .eq('source', 'baseline_import');

        if (catError) throw catError;

        const categoryCount = {};
        categories?.forEach(item => {
            const cat = item.category || 'Unknown';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        // Display results
        console.log('📈 Migration Statistics:');
        console.log(`  Total records in Supabase: ${totalCount || 0}`);
        console.log(`  Baseline imported records: ${baselineCount || 0}`);
        console.log(`  Other records: ${(totalCount || 0) - (baselineCount || 0)}`);
        console.log(`  Expected baseline records: 5,636`);
        console.log(`  Import completion: ${((baselineCount || 0) / 5636 * 100).toFixed(1)}%`);

        console.log('\n📂 Category Distribution:');
        Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([cat, count]) => {
                console.log(`  ${cat}: ${count}`);
            });

        console.log('\n📋 Recent Imports:');
        sampleData?.forEach(record => {
            console.log(`  ${record.listing_id}: ${record.title?.substring(0, 50)}... ($${record.price || 0})`);
        });

    } catch (error) {
        console.error('❌ Error checking status:', error.message);
    }
}

async function cleanupDuplicates() {
    console.log('🧹 Cleaning Up Duplicates');
    console.log('========================\n');

    try {
        // Find duplicates by listing_id
        const { data: allRecords, error: fetchError } = await supabase
            .from(FLIPPA_TABLE)
            .select('id, listing_id, created_at')
            .order('listing_id')
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Group by listing_id
        const grouped = {};
        allRecords?.forEach(record => {
            if (!grouped[record.listing_id]) {
                grouped[record.listing_id] = [];
            }
            grouped[record.listing_id].push(record);
        });

        // Find duplicates
        const duplicates = [];
        Object.entries(grouped).forEach(([listing_id, records]) => {
            if (records.length > 1) {
                // Keep the newest, mark others for deletion
                const toDelete = records.slice(1);
                duplicates.push(...toDelete);
            }
        });

        console.log(`Found ${duplicates.length} duplicate records`);

        if (duplicates.length > 0) {
            console.log('Removing duplicates...');
            
            const idsToDelete = duplicates.map(d => d.id);
            const { error: deleteError } = await supabase
                .from(FLIPPA_TABLE)
                .delete()
                .in('id', idsToDelete);

            if (deleteError) throw deleteError;

            console.log(`✅ Removed ${duplicates.length} duplicate records`);
        } else {
            console.log('✅ No duplicates found');
        }

    } catch (error) {
        console.error('❌ Error cleaning duplicates:', error.message);
    }
}

async function exportMigrationData(outputPath = null) {
    console.log('💾 Exporting Migration Data');
    console.log('==========================\n');

    try {
        // Fetch all baseline imported data
        const { data, error } = await supabase
            .from(FLIPPA_TABLE)
            .select('*')
            .eq('source', 'baseline_import')
            .order('listing_id');

        if (error) throw error;

        console.log(`Found ${data?.length || 0} records to export`);

        // Prepare export data
        const exportData = {
            exportDate: new Date().toISOString(),
            source: 'Supabase Migration',
            recordCount: data?.length || 0,
            records: data || []
        };

        // Save to file
        const fileName = outputPath || path.join(__dirname, '..', 'data', `supabase_export_${Date.now()}.json`);
        fs.writeFileSync(fileName, JSON.stringify(exportData, null, 2));

        console.log(`✅ Exported to: ${fileName}`);
        console.log(`   File size: ${(fs.statSync(fileName).size / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
        console.error('❌ Export failed:', error.message);
    }
}

async function resetBaselineData() {
    console.log('⚠️ Reset Baseline Data');
    console.log('=====================\n');
    console.log('This will delete all baseline imported records from Supabase.\n');

    // Require confirmation
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Are you sure? Type "DELETE" to confirm: ', async (answer) => {
        if (answer === 'DELETE') {
            try {
                const { error } = await supabase
                    .from(FLIPPA_TABLE)
                    .delete()
                    .eq('source', 'baseline_import');

                if (error) throw error;

                console.log('✅ Baseline data has been deleted');
            } catch (error) {
                console.error('❌ Reset failed:', error.message);
            }
        } else {
            console.log('❌ Reset cancelled');
        }
        readline.close();
    });
}

async function compareWithSQLite() {
    console.log('🔄 Comparing SQLite vs Supabase');
    console.log('===============================\n');

    try {
        // Get SQLite stats
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        const sqliteDb = await open({
            filename: path.join(__dirname, '..', 'data', 'flippa_baseline.db'),
            driver: sqlite3.Database
        });

        const sqliteCount = await sqliteDb.get('SELECT COUNT(*) as count FROM baseline_listings WHERE is_active = 1');
        const sqliteSample = await sqliteDb.all('SELECT id, title, price FROM baseline_listings WHERE is_active = 1 LIMIT 5');

        // Get Supabase stats
        const { count: supabaseCount, error } = await supabase
            .from(FLIPPA_TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('source', 'baseline_import');

        if (error) throw error;

        console.log('📊 Comparison Results:');
        console.log(`  SQLite records: ${sqliteCount.count}`);
        console.log(`  Supabase records: ${supabaseCount || 0}`);
        console.log(`  Difference: ${sqliteCount.count - (supabaseCount || 0)}`);
        console.log(`  Match rate: ${((supabaseCount || 0) / sqliteCount.count * 100).toFixed(1)}%`);

        // Check for missing records
        if (supabaseCount < sqliteCount.count) {
            console.log('\n⚠️ Some records are missing from Supabase');
            console.log('   Run migration again to sync missing records');
        } else if (supabaseCount === sqliteCount.count) {
            console.log('\n✅ All records successfully migrated!');
        }

        await sqliteDb.close();

    } catch (error) {
        console.error('❌ Comparison failed:', error.message);
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];

    console.log('🛠️ Migration Utilities\n');

    switch (command) {
        case 'status':
            await checkMigrationStatus();
            break;

        case 'cleanup':
            await cleanupDuplicates();
            break;

        case 'export':
            const outputPath = process.argv[3];
            await exportMigrationData(outputPath);
            break;

        case 'reset':
            await resetBaselineData();
            break;

        case 'compare':
            await compareWithSQLite();
            break;

        default:
            console.log(`
Usage: node migration-utils.js <command> [options]

Commands:
  status     Check migration status and statistics
  cleanup    Remove duplicate records
  export     Export migrated data to JSON
  reset      Delete all baseline imported data (use with caution!)
  compare    Compare SQLite vs Supabase record counts

Examples:
  node migration-utils.js status
  node migration-utils.js cleanup
  node migration-utils.js export output.json
  node migration-utils.js compare
            `);
    }
}

// Export functions
module.exports = {
    checkMigrationStatus,
    cleanupDuplicates,
    exportMigrationData,
    compareWithSQLite
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}