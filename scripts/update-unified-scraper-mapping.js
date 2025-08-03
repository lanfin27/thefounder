/**
 * Updates the unified-marketplace-scraper.js to use schema-compatible mappings
 * This ensures future runs won't fail with profit_multiple errors
 */

const fs = require('fs').promises;
const path = require('path');

async function updateScraperMapping() {
  console.log('🔧 Updating unified scraper to use compatible schema mapping...');
  
  const scraperPath = path.join(__dirname, 'unified-marketplace-scraper.js');
  
  try {
    // Read the current scraper code
    let scraperContent = await fs.readFile(scraperPath, 'utf8');
    
    // Find the database mapping section
    const oldMapping = `    const dbListings = scrapingResult.listings.map((listing, index) => ({
      listing_id: listing.id,
      title: listing.title || '',
      price: listing.price || null,
      monthly_profit: listing.monthlyProfit || null,
      monthly_revenue: listing.monthlyRevenue || null,
      profit_multiple: listing.profitMultiple || null,
      revenue_multiple: listing.revenueMultiple || null,
      multiple_text: createMultipleText(listing),
      property_type: listing.propertyType || '',
      category: listing.category || '',
      badges: listing.badges || [],
      url: listing.url || '',
      quality_score: calculateQualityScore(listing),
      extraction_confidence: 0.95,
      page_number: Math.floor(index / 25) + 1,
      source: 'flippa_unified',
      raw_data: listing
    }));`;
    
    const newMapping = `    const dbListings = scrapingResult.listings.map((listing, index) => ({
      listing_id: listing.id,
      title: listing.title || '',
      price: listing.price || null,
      monthly_revenue: listing.monthlyProfit || listing.monthlyRevenue || null, // Map profit to revenue column temporarily
      multiple: listing.profitMultiple || listing.revenueMultiple || null, // Use single multiple column
      multiple_text: createMultipleText(listing),
      property_type: listing.propertyType || '',
      category: listing.category || '',
      badges: listing.badges || [],
      url: listing.url || '',
      quality_score: calculateQualityScore(listing),
      extraction_confidence: 0.95,
      page_number: Math.floor(index / 25) + 1,
      source: 'flippa_unified',
      raw_data: {
        ...listing,
        // Preserve actual values for future migration
        monthly_profit_actual: listing.monthlyProfit,
        monthly_revenue_actual: listing.monthlyRevenue,
        profit_multiple_actual: listing.profitMultiple,
        revenue_multiple_actual: listing.revenueMultiple
      }
    }));`;
    
    // Replace the mapping
    if (scraperContent.includes(oldMapping)) {
      scraperContent = scraperContent.replace(oldMapping, newMapping);
      
      // Save the updated file
      await fs.writeFile(scraperPath, scraperContent);
      console.log('✅ Successfully updated unified scraper mapping');
      console.log('📝 Changes made:');
      console.log('   - Removed profit_multiple and revenue_multiple fields');
      console.log('   - Map profit data to monthly_revenue column');
      console.log('   - Map multiple data to single multiple column');
      console.log('   - Preserve original values in raw_data for future migration');
    } else {
      console.log('⚠️ Could not find the expected mapping pattern');
      console.log('💡 The scraper may have already been updated or has a different structure');
    }
    
  } catch (error) {
    console.error('❌ Error updating scraper:', error);
  }
}

// Run the update
updateScraperMapping();