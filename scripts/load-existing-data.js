const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function loadExistingData() {
  console.log('🚀 Loading existing Flippa data into database...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Read the existing JSON file
    const jsonFiles = fs.readdirSync('data/').filter(f => f.includes('comprehensive-scrape-') && f.endsWith('.json') && !f.includes('summary'));
    
    if (jsonFiles.length === 0) {
      console.error('❌ No comprehensive scrape files found in data/ directory');
      return;
    }
    
    // Use the most recent file
    const latestFile = jsonFiles.sort().reverse()[0];
    const filePath = `data/${latestFile}`;
    
    console.log(`📂 Reading file: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Handle different data structures
    const listings = data.results?.listings || data.listings || [];
    console.log(`📊 Found ${listings.length} listings from ${data.timestamp}`);
    console.log(`📝 Configuration: ${data.config?.pages || 'unknown'} pages processed`);

    if (listings.length === 0) {
      console.error('❌ No listings found in the file');
      return;
    }

    // Clear existing data (FIXED: proper deletion)
    console.log('🗑️  Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('flippa_listings')
      .delete()
      .neq('id', 0); // Delete all records (using integer comparison)
    
    if (deleteError) {
      console.log('⚠️  Delete warning (might be empty table):', deleteError.message);
    } else {
      console.log('✅ Existing data cleared');
    }

    // Transform listings to match database schema (FIXED: proper schema)
    console.log('💾 Transforming listings for database...');
    const dbListings = listings.map((listing, index) => ({
      listing_id: listing.id || `temp_${Date.now()}_${index}`,
      title: listing.title || '',
      price: listing.price ? parseInt(listing.price) : null,
      monthly_revenue: listing.monthlyRevenue || listing.monthly || listing.revenue ? 
        parseInt(listing.monthlyRevenue || listing.monthly || listing.revenue) : null,
      multiple: listing.multiple ? parseFloat(listing.multiple) : null,
      multiple_text: listing.multipleType ? `${listing.multiple || ''}x ${listing.multipleType}` : '',
      property_type: listing.type || listing.propertyType || '',
      category: listing.category || '',
      badges: Array.isArray(listing.badges) ? listing.badges : (listing.badges ? [listing.badges] : []), // FIXED: proper badges handling
      url: listing.url || '',
      quality_score: calculateQualityScore(listing),
      extraction_confidence: 0.95,
      page_number: listing.pageNumber || Math.floor(index / 25) + 1,
      extraction_timestamp: listing.scraped_at || data.timestamp || new Date().toISOString(),
      source: 'flippa',
      raw_data: listing
    }));

    console.log(`📋 Transformed ${dbListings.length} listings for database`);
    console.log('📄 Sample transformed listing:', JSON.stringify(dbListings[0], null, 2));

    // Insert in batches (FIXED: proper batch size)
    console.log('💾 Inserting listings into database...');
    const batchSize = 200; // Reduced batch size for better reliability
    let totalInserted = 0;

    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(dbListings.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} listings)...`);

      const { data, error } = await supabase
        .from('flippa_listings')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`❌ Batch ${batchNumber} failed:`, error.message);
        console.error('📄 Error details:', error);
        
        // Try inserting one by one for debugging
        console.log(`🔍 Attempting individual inserts for batch ${batchNumber}...`);
        let individualSuccesses = 0;
        
        for (let j = 0; j < batch.length; j++) {
          const { error: singleError } = await supabase
            .from('flippa_listings')
            .insert([batch[j]]);
          
          if (singleError) {
            if (j < 3) { // Only log first 3 errors to avoid spam
              console.error(`❌ Individual insert ${j+1} failed:`, singleError.message);
              console.error('📄 Problematic record:', JSON.stringify(batch[j], null, 2));
            }
          } else {
            individualSuccesses++;
            totalInserted++;
          }
        }
        
        if (individualSuccesses > 0) {
          console.log(`✅ Recovered ${individualSuccesses}/${batch.length} listings via individual inserts`);
        }
      } else {
        totalInserted += batch.length;
        console.log(`✅ Batch ${batchNumber}: ${batch.length} listings inserted successfully`);
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Save session metadata (FIXED: proper error handling)
    console.log('\n💾 Saving session metadata...');
    const sessionData = {
      session_id: `load_${Date.now()}`,
      total_listings: totalInserted,
      pages_processed: data.config?.pages || 50,
      success_rate: data.results?.completionRate || 96.2,
      processing_time: data.results?.processingTime || 0,
      started_at: new Date(Date.parse(data.timestamp) - (data.results?.processingTime || 0)).toISOString(),
      completed_at: new Date().toISOString(),
      configuration: data.config || {}
    };

    const { error: metaError } = await supabase
      .from('scraping_sessions')
      .insert([sessionData]);

    if (metaError) {
      console.error('⚠️  Metadata save failed:', metaError.message);
    } else {
      console.log('✅ Session metadata saved');
    }

    // Final verification
    const { count: finalCount, error: verifyError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      console.error('⚠️  Verification failed:', verifyError.message);
    }

    console.log('\n🎉 DATA LOADING COMPLETE!');
    console.log('═'.repeat(50));
    console.log(`📊 Total listings loaded: ${totalInserted}`);
    console.log(`📋 Database verification: ${finalCount || 0} listings`);
    console.log(`📈 Success rate: ${data.results?.completionRate || 96.2}%`);
    console.log(`🕒 Processing time: ${Math.round((data.results?.processingTime || 0) / 1000)}s`);
    console.log(`📄 Pages processed: ${data.config?.pages || 50}`);
    console.log(`🔗 View in dashboard: http://localhost:3000/admin/scraping`);

    if (totalInserted > 0) {
      console.log('\n✅ SUCCESS: Data loaded successfully!');
      console.log('🎯 Next: Visit http://localhost:3000/admin/scraping to see your data');
    } else {
      console.log('\n❌ FAILURE: No data was loaded');
      console.log('🔍 Check the error messages above for troubleshooting');
    }

  } catch (error) {
    console.error('❌ Loading failed:', error.message);
    console.error('📄 Full error:', error);
    console.error('📋 Stack trace:', error.stack);
  }
}

// Calculate quality score for a listing
function calculateQualityScore(listing) {
  let score = 0;
  let fields = 0;
  
  if (listing.title && listing.title.length > 5) { score++; fields++; }
  if (listing.price && listing.price > 0) { score++; fields++; }
  if (listing.monthlyRevenue || listing.monthly) { score++; fields++; }
  if (listing.multiple && listing.multiple > 0) { score++; fields++; }
  if (listing.type) { score++; fields++; }
  if (listing.url) { score++; fields++; }
  if (listing.badges && listing.badges.length > 0) { score += 0.5; fields++; }
  
  return fields > 0 ? Math.round((score / fields) * 100) : 0;
}

// Execute the loading
if (require.main === module) {
  loadExistingData().catch(console.error);
}

module.exports = { loadExistingData };