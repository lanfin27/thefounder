const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Field mapping from Excel to database
const FIELD_MAPPING = {
  'category': 'category',
  'country_name': 'country_name',
  'currency_label': 'currency_label',
  'end_at': 'end_at',
  'established_at': 'established_at',
  'formatted_age_in_years': 'formatted_age_in_years',
  'id': 'id',
  'key_data_0_label': 'key_data_label_0',
  'key_data_0_value': 'key_data_value_0',
  'key_data_1_label': 'key_data_label_1',
  'key_data_1_value': 'key_data_value_1',
  'key_data_2_label': 'key_data_label_2',
  'key_data_2_value': 'key_data_value_2',
  'key_data_3_label': 'key_data_label_3',
  'key_data_3_value': 'key_data_value_3',
  'key_data_4_label': 'key_data_label_4',
  'key_data_4_value': 'key_data_value_4',
  'listing_url': 'listing_url',
  'monetization': 'monetization',
  'multiple': 'multiple',
  'price': 'price',
  'primary_platform': 'primary_platform',
  'profit_average': 'profit_average',
  'property_name': 'property_name',
  'property_type': 'property_type',
  'revenue_average': 'revenue_average',
  'revenue_multiple': 'revenue_multiple',
  'sale_method': 'sale_method',
  'sale_method_title': 'sale_method_title',
  'status': 'status',
  'summary': 'summary',
  'title': 'title'
};

async function loadBaselineData() {
  console.log('📊 Loading baseline data from Excel file...');
  
  try {
    // Find the Excel file
    const excelFile = './dataset_flippascraperapi_20250802_051204877.xlsx';
    
    // Create a new workbook instance
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFile);
    
    // Get the first worksheet
    const worksheet = workbook.getWorksheet(1);
    console.log(`📄 Reading worksheet: ${worksheet.name}`);
    
    // Convert to JSON
    const data = [];
    let headers = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row contains headers
        headers = row.values.slice(1); // ExcelJS rows are 1-indexed with empty first element
      } else {
        // Create object from row data
        const rowData = {};
        row.values.slice(1).forEach((value, index) => {
          if (headers[index]) {
            rowData[headers[index]] = value;
          }
        });
        data.push(rowData);
      }
    });
    
    console.log(`✅ Loaded ${data.length} records from Excel`);
    
    // Verify we have the expected 5,635 records
    if (data.length !== 5635) {
      console.warn(`⚠️  Expected 5,635 records but found ${data.length}`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error loading Excel file:', error);
    throw error;
  }
}

async function checkEnhancedTableExists() {
  try {
    const { data, error } = await supabase
      .from('flippa_listings_enhanced')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('❌ Enhanced table does not exist. Please run the SQL script first.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking table:', error);
    return false;
  }
}

async function migrateData(baselineData) {
  console.log('\n🔄 Starting data migration...');
  
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < baselineData.length; i += batchSize) {
    const batch = baselineData.slice(i, i + batchSize);
    const records = [];
    
    for (const row of batch) {
      // Map Excel columns to database columns
      const record = {
        first_seen_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
        is_new: false, // These are baseline records
        is_deleted: false,
        change_count: 0,
        change_history: []
      };
      
      // Map all fields
      for (const [excelField, dbField] of Object.entries(FIELD_MAPPING)) {
        if (row[excelField] !== undefined && row[excelField] !== null) {
          let value = row[excelField];
          
          // Handle date fields
          if (excelField === 'end_at' || excelField === 'established_at') {
            if (value && value !== '') {
              // ExcelJS returns dates as Date objects or numbers
              if (value instanceof Date) {
                value = value.toISOString();
              } else if (typeof value === 'number') {
                // Convert Excel date number to JavaScript date
                value = new Date((value - 25569) * 86400 * 1000).toISOString();
              } else {
                try {
                  value = new Date(value).toISOString();
                } catch (e) {
                  value = null;
                }
              }
            } else {
              value = null;
            }
          }
          
          // Handle numeric fields
          if (['price', 'profit_average', 'revenue_average', 'multiple', 'revenue_multiple'].includes(excelField)) {
            value = parseFloat(value) || 0;
          }
          
          record[dbField] = value;
        }
      }
      
      // Ensure we have an ID
      if (!record.id) {
        console.warn('⚠️  Skipping record without ID');
        errorCount++;
        continue;
      }
      
      records.push(record);
    }
    
    if (records.length > 0) {
      try {
        const { error } = await supabase
          .from('flippa_listings_enhanced')
          .upsert(records, { onConflict: 'id' });
        
        if (error) {
          console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
          errorCount += records.length;
        } else {
          successCount += records.length;
          console.log(`✅ Migrated batch ${i / batchSize + 1}: ${records.length} records (Total: ${successCount})`);
        }
      } catch (err) {
        console.error(`❌ Unexpected error in batch ${i / batchSize + 1}:`, err);
        errorCount += records.length;
      }
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully migrated: ${successCount} records`);
  console.log(`❌ Failed: ${errorCount} records`);
  console.log(`📋 Total processed: ${successCount + errorCount} records`);
  
  return { successCount, errorCount };
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  const { count } = await supabase
    .from('flippa_listings_enhanced')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Total records in enhanced table: ${count}`);
  
  // Get sample statistics
  const { data: stats } = await supabase
    .from('flippa_listings_enhanced')
    .select('category, property_type, status')
    .limit(1000);
  
  if (stats) {
    const categories = new Set(stats.map(s => s.category).filter(Boolean));
    const propertyTypes = new Set(stats.map(s => s.property_type).filter(Boolean));
    const statuses = new Set(stats.map(s => s.status).filter(Boolean));
    
    console.log(`📁 Unique categories: ${categories.size}`);
    console.log(`🏢 Unique property types: ${propertyTypes.size}`);
    console.log(`📍 Unique statuses: ${statuses.size}`);
  }
}

async function main() {
  console.log('🚀 Starting Enhanced Flippa Schema Migration (Using ExcelJS)');
  console.log('=========================================================\n');
  
  try {
    // Check if enhanced table exists
    const tableExists = await checkEnhancedTableExists();
    if (!tableExists) {
      console.log('\n⚠️  Please run the SQL script first:');
      console.log('   scripts/create-enhanced-flippa-schema.sql');
      process.exit(1);
    }
    
    // Load baseline data
    const baselineData = await loadBaselineData();
    
    // Migrate data
    const result = await migrateData(baselineData);
    
    // Verify migration
    await verifyMigration();
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();

/* 
Usage:
1. First run the SQL script in Supabase:
   scripts/create-enhanced-flippa-schema.sql

2. Run this migration:
   node scripts/migrate-to-enhanced-schema.js
*/