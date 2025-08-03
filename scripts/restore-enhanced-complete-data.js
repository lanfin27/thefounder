/**
 * Restore Enhanced Complete Data
 * Restores 5,374 listings from the enhanced complete backup
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreEnhancedData() {
  console.log('🚀 RESTORING ENHANCED COMPLETE COLLECTION DATA');
  console.log('📊 Target: 5,374 listings (89.6% coverage)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Read backup file
    const backupPath = path.join(__dirname, '..', 'data', 'enhanced-complete-backup-1754230533989.json');
    console.log('📁 Reading backup file...');
    const backupContent = await fs.readFile(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    
    const listings = backupData.listings || [];
    console.log(`✅ Loaded ${listings.length} listings from backup`);
    
    // Analyze quality before restoration
    console.log('\n📊 Data Quality Analysis:');
    const qualityMetrics = {
      withTitle: listings.filter(l => l.title && l.title.length > 3).length,
      withPrice: listings.filter(l => l.price && l.price > 0).length,
      withRevenue: listings.filter(l => (l.monthlyRevenue && l.monthlyRevenue > 0) || (l.monthlyProfit && l.monthlyProfit > 0)).length,
      withMultiple: listings.filter(l => (l.profitMultiple && l.profitMultiple > 0) || (l.revenueMultiple && l.revenueMultiple > 0)).length,
      withUrl: listings.filter(l => l.url).length
    };
    
    const qualityRates = {
      title: (qualityMetrics.withTitle / listings.length * 100).toFixed(1),
      price: (qualityMetrics.withPrice / listings.length * 100).toFixed(1),
      revenue: (qualityMetrics.withRevenue / listings.length * 100).toFixed(1),
      multiple: (qualityMetrics.withMultiple / listings.length * 100).toFixed(1),
      url: (qualityMetrics.withUrl / listings.length * 100).toFixed(1)
    };
    
    console.log(`   📋 Title: ${qualityRates.title}% (${qualityMetrics.withTitle} listings)`);
    console.log(`   💰 Price: ${qualityRates.price}% (${qualityMetrics.withPrice} listings)`);
    console.log(`   📈 Revenue: ${qualityRates.revenue}% (${qualityMetrics.withRevenue} listings)`);
    console.log(`   📊 Multiple: ${qualityRates.multiple}% (${qualityMetrics.withMultiple} listings)`);
    console.log(`   🔗 URL: ${qualityRates.url}% (${qualityMetrics.withUrl} listings)`);
    
    // Clear existing data
    console.log('\n🗑️ Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('flippa_listings')
      .delete()
      .neq('id', 0);
    
    if (deleteError) {
      console.warn('⚠️ Delete warning:', deleteError.message);
    }
    
    // Transform data for database
    console.log('\n🔄 Transforming data for database...');
    const dbListings = listings.map((listing, index) => {
      // Build compatible listing
      const compatible = {
        listing_id: listing.id || `enhanced_${index}`,
        title: listing.title || '',
        price: listing.price || null,
        monthly_revenue: listing.monthlyProfit || listing.monthlyRevenue || null,
        multiple: listing.profitMultiple || listing.revenueMultiple || null,
        multiple_text: createMultipleText(listing),
        property_type: listing.propertyType || listing.category || '',
        category: listing.category || listing.propertyType || '',
        badges: listing.badges || [],
        url: listing.url || '',
        quality_score: listing.qualityScore || listing.extractionConfidence || 70,
        extraction_confidence: listing.extractionConfidence ? listing.extractionConfidence / 100 : 0.8,
        page_number: listing.page_number || Math.floor(index / 25) + 1,
        source: 'enhanced_complete_restore',
        raw_data: {
          ...listing,
          originalQualityScore: listing.qualityScore,
          originalExtraction: listing.extractionConfidence
        }
      };
      
      // Remove undefined fields
      Object.keys(compatible).forEach(key => {
        if (compatible[key] === undefined) {
          delete compatible[key];
        }
      });
      
      return compatible;
    });
    
    // Save in batches
    console.log('\n💾 Saving to database...');
    const batchSize = 500;
    let saved = 0;
    let errors = 0;
    
    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      const { data, error } = await supabase
        .from('flippa_listings')
        .insert(batch)
        .select();
      
      if (!error) {
        saved += batch.length;
        console.log(`✅ Batch ${batchNum}: Saved ${batch.length} listings (Total: ${saved}/${dbListings.length})`);
      } else {
        errors += batch.length;
        console.error(`❌ Batch ${batchNum} error:`, error.message);
      }
    }
    
    // Save session metadata
    if (saved > 0) {
      console.log('\n📊 Saving session metadata...');
      const sessionData = {
        session_id: `enhanced_restore_${Date.now()}`,
        total_listings: saved,
        pages_processed: Math.ceil(saved / 25),
        success_rate: (saved / dbListings.length * 100),
        processing_time: 0,
        configuration: {
          type: 'enhanced_complete_restore',
          source_file: 'enhanced-complete-backup-1754230533989.json',
          marketplace_size: 6000,
          coverage: '89.6%',
          qualityRates: qualityRates
        }
      };
      
      const { error: sessionError } = await supabase
        .from('scraping_sessions')
        .insert(sessionData);
      
      if (sessionError) {
        console.warn('⚠️ Session metadata warning:', sessionError.message);
      }
    }
    
    // Final report
    console.log('\n' + '='.repeat(50));
    console.log('🎉 RESTORATION COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Successfully restored: ${saved} listings`);
    console.log(`❌ Failed: ${errors} listings`);
    console.log(`📈 Success rate: ${((saved / dbListings.length) * 100).toFixed(1)}%`);
    console.log(`🎯 Coverage: ${saved} listings (89.6% of 6,000 marketplace)`);
    console.log('\n📊 Final Quality Rates:');
    console.log(`   📋 Title: ${qualityRates.title}%`);
    console.log(`   💰 Price: ${qualityRates.price}%`);
    console.log(`   📈 Revenue: ${qualityRates.revenue}%`);
    console.log(`   📊 Multiple: ${qualityRates.multiple}%`);
    console.log(`\n🔗 View your data at: http://localhost:3000/admin/scraping`);
    
  } catch (error) {
    console.error('\n❌ Fatal restore error:', error);
    console.error('Stack trace:', error.stack);
  }
}

function createMultipleText(listing) {
  if (listing.profitMultiple && listing.revenueMultiple) {
    return `${listing.profitMultiple}x profit | ${listing.revenueMultiple}x revenue`;
  } else if (listing.profitMultiple) {
    return `${listing.profitMultiple}x profit`;
  } else if (listing.revenueMultiple) {
    return `${listing.revenueMultiple}x revenue`;
  }
  return '';
}

// Execute
console.log('🚀 Starting Enhanced Complete Data Restoration');
console.log('==================================\n');

restoreEnhancedData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});