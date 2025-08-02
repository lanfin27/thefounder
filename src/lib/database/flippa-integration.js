// Database integration for Flippa scraping with deduplication and updates
const { createClient } = require('@supabase/supabase-js');

class FlippaDatabase {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.stats = {
      totalProcessed: 0,
      newListings: 0,
      updatedListings: 0,
      errors: 0
    };
  }
  
  // Get all existing listings for comparison
  async getExistingListings() {
    try {
      const { data, error } = await this.supabase
        .from('flippa_listings')
        .select('listing_id, asking_price, profit_multiple, revenue_multiple, raw_data, last_updated');
      
      if (error) throw error;
      
      const listingsMap = new Map();
      data.forEach(listing => {
        listingsMap.set(listing.listing_id, listing);
      });
      
      return listingsMap;
    } catch (error) {
      console.error('Error fetching existing listings:', error);
      return new Map();
    }
  }
  
  // Check if listing data has changed
  hasListingChanged(newListing, existingListing) {
    // Price changes
    if (newListing.asking_price !== existingListing.asking_price) {
      return true;
    }
    
    // Multiple changes
    if (newListing.profit_multiple !== existingListing.profit_multiple ||
        newListing.revenue_multiple !== existingListing.revenue_multiple) {
      return true;
    }
    
    // Status changes (asking -> sold)
    const existingStatus = existingListing.raw_data?.listing_status;
    const newStatus = newListing.raw_data?.listing_status;
    if (existingStatus !== newStatus) {
      return true;
    }
    
    return false;
  }
  
  // Batch save listings with deduplication
  async saveListings(listings) {
    const existingListings = await this.getExistingListings();
    const toInsert = [];
    const toUpdate = [];
    
    for (const listing of listings) {
      this.stats.totalProcessed++;
      
      if (existingListings.has(listing.listing_id)) {
        const existing = existingListings.get(listing.listing_id);
        
        if (this.hasListingChanged(listing, existing)) {
          // Preserve original created date, update last_updated
          listing.last_updated = new Date().toISOString();
          toUpdate.push(listing);
          this.stats.updatedListings++;
        }
      } else {
        // New listing
        listing.scraped_at = new Date().toISOString();
        listing.last_updated = new Date().toISOString();
        toInsert.push(listing);
        this.stats.newListings++;
      }
    }
    
    // Batch insert new listings
    if (toInsert.length > 0) {
      await this.batchInsert(toInsert);
    }
    
    // Batch update existing listings
    if (toUpdate.length > 0) {
      await this.batchUpdate(toUpdate);
    }
    
    return this.stats;
  }
  
  // Batch insert with error handling
  async batchInsert(listings, batchSize = 50) {
    console.log(`💾 Inserting ${listings.length} new listings...`);
    
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      
      try {
        const { error } = await this.supabase
          .from('flippa_listings')
          .insert(batch);
        
        if (error) {
          console.error(`Batch insert error:`, error);
          this.stats.errors += batch.length;
        }
      } catch (error) {
        console.error(`Batch insert failed:`, error);
        this.stats.errors += batch.length;
      }
    }
  }
  
  // Batch update with error handling
  async batchUpdate(listings) {
    console.log(`🔄 Updating ${listings.length} existing listings...`);
    
    // Updates need to be done individually due to Supabase limitations
    for (const listing of listings) {
      try {
        const { error } = await this.supabase
          .from('flippa_listings')
          .update(listing)
          .eq('listing_id', listing.listing_id);
        
        if (error) {
          console.error(`Update error for ${listing.listing_id}:`, error);
          this.stats.errors++;
        }
      } catch (error) {
        console.error(`Update failed for ${listing.listing_id}:`, error);
        this.stats.errors++;
      }
    }
  }
  
  // Track price history
  async savePriceHistory(listingId, oldPrice, newPrice, priceType = 'asking') {
    try {
      await this.supabase
        .from('flippa_price_history')
        .insert({
          listing_id: listingId,
          old_price: oldPrice,
          new_price: newPrice,
          price_type: priceType,
          changed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving price history:', error);
    }
  }
  
  // Get scraping statistics
  async getScrapingStats(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    try {
      // Total listings
      const { count: totalCount } = await this.supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true });
      
      // Recent listings
      const { count: recentCount } = await this.supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true })
        .gte('scraped_at', startDate.toISOString());
      
      // Recently sold
      const { count: soldCount } = await this.supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true })
        .eq('raw_data->listing_status', 'sold');
      
      return {
        totalListings: totalCount || 0,
        recentListings: recentCount || 0,
        soldListings: soldCount || 0,
        lastScraped: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }
  
  // Clean duplicate listings
  async cleanDuplicates() {
    try {
      // Get all listings grouped by listing_id
      const { data } = await this.supabase
        .from('flippa_listings')
        .select('id, listing_id, scraped_at')
        .order('scraped_at', { ascending: false });
      
      // Find duplicates
      const seen = new Set();
      const toDelete = [];
      
      data.forEach(listing => {
        if (seen.has(listing.listing_id)) {
          toDelete.push(listing.id);
        } else {
          seen.add(listing.listing_id);
        }
      });
      
      // Delete duplicates
      if (toDelete.length > 0) {
        const { error } = await this.supabase
          .from('flippa_listings')
          .delete()
          .in('id', toDelete);
        
        if (!error) {
          console.log(`🧹 Cleaned ${toDelete.length} duplicate listings`);
        }
      }
      
      return toDelete.length;
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      return 0;
    }
  }
}

module.exports = FlippaDatabase;