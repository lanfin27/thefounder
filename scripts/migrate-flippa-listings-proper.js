const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class FlippaListingsMigrator {
  constructor() {
    this.sessionId = null;
    this.successCount = 0;
    this.errorCount = 0;
    this.duplicateCount = 0;
  }

  async migrate() {
    console.log('🚀 Starting Flippa Listings Migration\n');
    
    try {
      // Step 1: Create scraping session
      await this.createScrapingSession();
      
      // Step 2: Read Excel data
      const excelData = await this.readExcelFile();
      console.log(`📊 Found ${excelData.length} records in Excel file\n`);
      
      // Step 3: Transform data to match flippa_listings schema
      const transformedData = this.transformData(excelData);
      
      // Step 4: Insert data in batches
      await this.insertBatches(transformedData);
      
      // Step 5: Update session status
      await this.updateSessionStatus('completed');
      
      // Step 6: Show summary
      this.showSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      if (this.sessionId) {
        await this.updateSessionStatus('failed');
      }
    }
  }

  async createScrapingSession() {
    console.log('📝 Creating scraping session...');
    
    const { data, error } = await supabase
      .from('scraping_sessions')
      .insert({
        source: 'excel_migration',
        status: 'running',
        started_at: new Date().toISOString(),
        stats: {
          total_records: 0,
          processed: 0,
          errors: 0
        }
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
    
    this.sessionId = data.id;
    console.log(`✅ Created session: ${this.sessionId}\n`);
  }

  async readExcelFile() {
    const excelPath = path.join(__dirname, 'flippa_data_20241219_verified.xlsx');
    console.log(`📖 Reading Excel file: ${excelPath}`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    
    const worksheet = workbook.getWorksheet(1);
    const data = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      data.push({
        url: row.getCell(1).value,
        title: row.getCell(2).value,
        asking_price: row.getCell(3).value,
        monthly_revenue: row.getCell(4).value,
        monthly_profit: row.getCell(5).value,
        age_months: row.getCell(6).value,
        page_views_monthly: row.getCell(7).value,
        category: row.getCell(8).value,
        description: row.getCell(9).value,
        technologies: row.getCell(19).value // Column S
      });
    });
    
    return data;
  }

  transformData(excelData) {
    console.log('🔄 Transforming data to match database schema...\n');
    
    return excelData.map((record, index) => {
      // Parse numeric values
      const askingPrice = this.parsePrice(record.asking_price);
      const monthlyRevenue = this.parsePrice(record.monthly_revenue);
      const monthlyProfit = this.parsePrice(record.monthly_profit);
      const ageMonths = parseInt(record.age_months) || 0;
      const pageViews = parseInt(record.page_views_monthly) || 0;
      
      return {
        session_id: this.sessionId,
        url: String(record.url || ''),
        title: String(record.title || 'Untitled Listing'),
        asking_price: askingPrice,
        monthly_revenue: monthlyRevenue,
        monthly_profit: monthlyProfit,
        age_months: ageMonths,
        page_views_monthly: pageViews,
        category: String(record.category || 'Website'),
        description: String(record.description || ''),
        technologies: record.technologies ? String(record.technologies) : null,
        scraped_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
    });
  }

  parsePrice(value) {
    if (!value) return 0;
    
    // Remove currency symbols and commas
    const cleaned = String(value).replace(/[$,]/g, '');
    const parsed = parseInt(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }

  async insertBatches(data) {
    const batchSize = 100;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    console.log(`📦 Inserting data in ${totalBatches} batches...\n`);
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batch = data.slice(i, i + batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches}...`);
      
      try {
        const { data: insertedData, error } = await supabase
          .from('flippa_listings')
          .upsert(batch, {
            onConflict: 'url',
            ignoreDuplicates: false
          })
          .select();
        
        if (error) {
          console.error(`❌ Batch ${batchNumber} error:`, error.message);
          this.errorCount += batch.length;
          
          // Try individual inserts for this batch
          await this.insertIndividual(batch);
        } else {
          this.successCount += insertedData.length;
          console.log(`✅ Batch ${batchNumber} completed: ${insertedData.length} records`);
        }
      } catch (err) {
        console.error(`❌ Batch ${batchNumber} failed:`, err.message);
        this.errorCount += batch.length;
      }
      
      // Update session progress
      await this.updateSessionProgress();
    }
  }

  async insertIndividual(batch) {
    console.log(`  Attempting individual inserts for failed batch...`);
    
    for (const record of batch) {
      try {
        const { error } = await supabase
          .from('flippa_listings')
          .upsert(record, {
            onConflict: 'url',
            ignoreDuplicates: false
          });
        
        if (error) {
          if (error.message.includes('duplicate')) {
            this.duplicateCount++;
          } else {
            console.error(`    ❌ Failed: ${record.title} - ${error.message}`);
            this.errorCount++;
          }
        } else {
          this.successCount++;
        }
      } catch (err) {
        this.errorCount++;
      }
    }
  }

  async updateSessionProgress() {
    const { error } = await supabase
      .from('scraping_sessions')
      .update({
        stats: {
          total_records: this.successCount + this.errorCount + this.duplicateCount,
          processed: this.successCount,
          errors: this.errorCount,
          duplicates: this.duplicateCount
        }
      })
      .eq('id', this.sessionId);
    
    if (error) {
      console.error('Failed to update session progress:', error.message);
    }
  }

  async updateSessionStatus(status) {
    const { error } = await supabase
      .from('scraping_sessions')
      .update({
        status: status,
        completed_at: new Date().toISOString()
      })
      .eq('id', this.sessionId);
    
    if (error) {
      console.error('Failed to update session status:', error.message);
    }
  }

  showSummary() {
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    console.log(`✅ Successfully inserted: ${this.successCount} records`);
    console.log(`⚠️  Duplicates skipped: ${this.duplicateCount} records`);
    console.log(`❌ Errors: ${this.errorCount} records`);
    console.log(`📋 Total processed: ${this.successCount + this.errorCount + this.duplicateCount} records`);
    console.log(`🆔 Session ID: ${this.sessionId}`);
    console.log('\n✨ Migration completed!');
  }
}

// Run migration
const migrator = new FlippaListingsMigrator();
migrator.migrate().catch(console.error);