import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { URL } from 'url';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define the 31 monitored fields
const MONITORED_FIELDS = [
  'category', 'country_name', 'currency_label', 'end_at', 'established_at',
  'formatted_age_in_years', 'id', 'key_data_label_0', 'key_data_value_0',
  'key_data_label_1', 'key_data_value_1', 'key_data_label_2', 'key_data_value_2',
  'key_data_label_3', 'key_data_value_3', 'key_data_label_4', 'key_data_value_4',
  'listing_url', 'monetization', 'multiple', 'price', 'primary_platform',
  'profit_average', 'property_name', 'property_type', 'revenue_average',
  'revenue_multiple', 'sale_method', 'sale_method_title', 'status',
  'summary', 'title'
];

interface ListingData {
  id: string;
  [key: string]: any;
}

interface ChangeDetection {
  type: 'new' | 'modified' | 'deleted';
  listing: ListingData;
  changes?: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  changeScore?: number;
}

export class SmartFlippaScanner {
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  private scanId: string;
  private stats = {
    totalProcessed: 0,
    newListings: 0,
    modifiedListings: 0,
    deletedListings: 0,
    errors: 0,
    startTime: Date.now()
  };

  constructor() {
    this.scanId = `scan_${Date.now()}`;
  }

  // Main scan method
  async performIncrementalScan(options: {
    maxPages?: number;
    checkModified?: boolean;
    notifyHighValue?: boolean;
  } = {}) {
    console.log(`🚀 Starting incremental scan ${this.scanId}`);
    console.log('==================================================');
    
    try {
      // 1. Get current baseline from database
      const baseline = await this.getBaseline();
      console.log(`📊 Baseline loaded: ${baseline.size} listings for comparison`);
      
      // Verify we have the expected baseline count
      if (baseline.size < 5635) {
        console.warn(`⚠️  Warning: Expected 5,635 baseline records but only found ${baseline.size}`);
        console.warn(`   This may affect change detection accuracy.`);
      }
      
      // 2. Fetch current listing IDs from Flippa
      const currentIds = await this.fetchCurrentListingIds(options.maxPages || 5);
      console.log(`🔍 Found ${currentIds.size} current listings`);
      
      // 3. Quick detection of new and deleted listings
      const { newIds, deletedIds, possiblyModifiedIds } = this.compareIds(baseline, currentIds);
      
      console.log(`📈 Quick analysis:`);
      console.log(`   - New: ${newIds.size}`);
      console.log(`   - Deleted: ${deletedIds.size}`);
      console.log(`   - Possibly modified: ${possiblyModifiedIds.size}`);
      
      // 4. Process changes
      const changes: ChangeDetection[] = [];
      
      // Process new listings
      for (const id of newIds) {
        const listing = await this.fetchListingDetails(id);
        if (listing) {
          changes.push({
            type: 'new',
            listing,
            changeScore: this.calculateChangeScore('new', listing)
          });
          this.stats.newListings++;
        }
        await this.delay(1000, 3000); // Rate limiting
      }
      
      // Process deleted listings
      for (const id of deletedIds) {
        const baselineListing = baseline.get(id);
        if (baselineListing) {
          changes.push({
            type: 'deleted',
            listing: baselineListing,
            changeScore: this.calculateChangeScore('deleted', baselineListing)
          });
          this.stats.deletedListings++;
        }
      }
      
      // Process possibly modified listings (if enabled)
      if (options.checkModified !== false) {
        const modifiedBatch = Array.from(possiblyModifiedIds).slice(0, 50); // Limit to 50 for performance
        
        for (const id of modifiedBatch) {
          const currentListing = await this.fetchListingDetails(id);
          const baselineListing = baseline.get(id);
          
          if (currentListing && baselineListing) {
            const fieldChanges = this.detectFieldChanges(baselineListing, currentListing);
            
            if (fieldChanges.length > 0) {
              changes.push({
                type: 'modified',
                listing: currentListing,
                changes: fieldChanges,
                changeScore: this.calculateModifiedScore(baselineListing, currentListing, fieldChanges)
              });
              this.stats.modifiedListings++;
            }
          }
          
          await this.delay(1000, 3000); // Rate limiting
        }
      }
      
      // 5. Save changes to database
      await this.saveChanges(changes);
      
      // 6. Update statistics
      await this.updateStats();
      
      // 7. Send notifications for high-value changes
      if (options.notifyHighValue) {
        await this.notifyHighValueChanges(changes);
      }
      
      const duration = Math.round((Date.now() - this.stats.startTime) / 1000);
      console.log(`\n✅ Scan completed in ${duration}s`);
      console.log(`📊 Final stats:`, this.stats);
      
      return {
        scanId: this.scanId,
        stats: this.stats,
        changes,
        duration
      };
      
    } catch (error) {
      console.error('❌ Scan error:', error);
      throw error;
    }
  }

  // Get baseline data from database with pagination to handle Supabase's 1000 row limit
  private async getBaseline(): Promise<Map<string, ListingData>> {
    console.log('📚 Loading baseline data from database...');
    const baseline = new Map<string, ListingData>();
    
    // First, get the total count
    const { count, error: countError } = await supabase
      .from('flippa_listings_enhanced')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);
    
    if (countError) throw countError;
    
    console.log(`📊 Total baseline records in database: ${count}`);
    
    // Load data in batches of 1000 (Supabase's default limit)
    const batchSize = 1000;
    const totalBatches = Math.ceil((count || 0) / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const from = batch * batchSize;
      const to = from + batchSize - 1;
      
      console.log(`📦 Loading batch ${batch + 1}/${totalBatches} (records ${from + 1}-${Math.min(to + 1, count || 0)})`);
      
      const { data, error } = await supabase
        .from('flippa_listings_enhanced')
        .select('*')
        .eq('is_deleted', false)
        .range(from, to)
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      // Add to baseline map
      for (const listing of data || []) {
        baseline.set(listing.id, listing);
      }
    }
    
    console.log(`✅ Successfully loaded ${baseline.size} unique listings into baseline map`);
    
    if (baseline.size !== count) {
      console.warn(`⚠️  Warning: Expected ${count} records but loaded ${baseline.size}`);
    }
    
    return baseline;
  }

  // Fetch current listing IDs from Flippa
  private async fetchCurrentListingIds(maxPages: number): Promise<Set<string>> {
    const ids = new Set<string>();
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const html = await this.fetchPage(`https://flippa.com/search?page=${page}`);
        const pageIds = this.extractListingIds(html);
        
        console.log(`📄 Page ${page}: Found ${pageIds.length} listings`);
        pageIds.forEach(id => ids.add(id));
        
        if (pageIds.length === 0) break; // No more listings
        
        await this.delay(2000, 5000); // Rate limiting between pages
      } catch (error) {
        console.error(`❌ Error fetching page ${page}:`, error);
        this.stats.errors++;
      }
    }
    
    return ids;
  }

  // Extract listing IDs from HTML
  private extractListingIds(html: string): string[] {
    const ids: string[] = [];
    
    // Multiple patterns to extract IDs
    const patterns = [
      /data-listing-id="([^"]+)"/g,
      /listing-(\d+)/g,
      /\/listings\/(\d+)(?:-|")/g,
      /property\/(\d+)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const id = match[1];
        if (id && !ids.includes(id)) {
          ids.push(id);
        }
      }
    }
    
    return ids;
  }

  // Compare IDs to detect changes
  private compareIds(baseline: Map<string, any>, current: Set<string>) {
    const baselineIds = new Set(baseline.keys());
    
    const newIds = new Set<string>();
    const deletedIds = new Set<string>();
    const possiblyModifiedIds = new Set<string>();
    
    // Find new IDs
    for (const id of current) {
      if (!baselineIds.has(id)) {
        newIds.add(id);
      } else {
        possiblyModifiedIds.add(id);
      }
    }
    
    // Find deleted IDs
    for (const id of baselineIds) {
      if (!current.has(id)) {
        deletedIds.add(id);
      }
    }
    
    return { newIds, deletedIds, possiblyModifiedIds };
  }

  // Fetch detailed listing data
  private async fetchListingDetails(id: string): Promise<ListingData | null> {
    try {
      const url = `https://flippa.com/listings/${id}`;
      const html = await this.fetchPage(url);
      
      // Extract listing data from HTML
      const listing = this.parseListingHtml(id, html);
      return listing;
      
    } catch (error) {
      console.error(`❌ Error fetching listing ${id}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  // Parse listing HTML to extract all 31 monitored fields
  private parseListingHtml(id: string, html: string): ListingData {
    const listing: ListingData = { id };
    
    // Extract title
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (titleMatch) listing.title = titleMatch[1].trim();
    
    // Extract price (multiple patterns)
    const pricePatterns = [
      /price[^>]*>\$([0-9,]+)/i,
      /asking-price[^>]*>\$([0-9,]+)/i,
      /\$([0-9,]+)\s*<\/span>/,
      /data-price="([0-9]+)"/
    ];
    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        listing.price = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    // Extract property type
    const propertyMatch = html.match(/property-type[^>]*>([^<]+)</i);
    if (propertyMatch) listing.property_type = propertyMatch[1].trim();
    
    // Extract status
    const statusMatch = html.match(/(?:listing-)?status[^>]*>([^<]+)</i);
    if (statusMatch) listing.status = statusMatch[1].trim();
    
    // Extract category
    const categoryMatch = html.match(/(?:listing-)?category[^>]*>([^<]+)</i);
    if (categoryMatch) listing.category = categoryMatch[1].trim();
    
    // Extract monetization
    const monetizationMatch = html.match(/monetization[^>]*>([^<]+)</i);
    if (monetizationMatch) listing.monetization = monetizationMatch[1].trim();
    
    // Extract sale method
    const saleMethodMatch = html.match(/sale-method[^>]*>([^<]+)</i);
    if (saleMethodMatch) {
      listing.sale_method = saleMethodMatch[1].trim();
      listing.sale_method_title = saleMethodMatch[1].trim();
    }
    
    // Extract country
    const countryMatch = html.match(/country[^>]*>([^<]+)</i);
    if (countryMatch) listing.country_name = countryMatch[1].trim();
    
    // Extract currency
    const currencyMatch = html.match(/currency[^>]*>([A-Z]{3})</i);
    if (currencyMatch) listing.currency_label = currencyMatch[1];
    
    // Extract summary
    const summaryMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    if (summaryMatch) listing.summary = summaryMatch[1].trim();
    
    // Extract property name
    const propertyNameMatch = html.match(/property-name[^>]*>([^<]+)</i);
    if (propertyNameMatch) listing.property_name = propertyNameMatch[1].trim();
    
    // Extract platform
    const platformMatch = html.match(/primary-platform[^>]*>([^<]+)</i);
    if (platformMatch) listing.primary_platform = platformMatch[1].trim();
    
    // Extract key data fields (metrics like revenue, profit, etc.)
    const keyDataPatterns = [
      /data-metric-label="([^"]+)"[^>]*>([^<]+)</g,
      /metric-label[^>]*>([^<]+)<\/[^>]+>\s*<[^>]+class="[^"]*metric-value[^"]*"[^>]*>([^<]+)</g
    ];
    
    let keyDataIndex = 0;
    for (const pattern of keyDataPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && keyDataIndex < 5) {
        listing[`key_data_label_${keyDataIndex}`] = match[1].trim();
        listing[`key_data_value_${keyDataIndex}`] = match[2].trim();
        
        // Extract specific metrics
        const label = match[1].trim().toLowerCase();
        const value = match[2].trim().replace(/[\$,]/g, '');
        
        if (label.includes('revenue')) {
          listing.revenue_average = parseFloat(value) || 0;
        } else if (label.includes('profit')) {
          listing.profit_average = parseFloat(value) || 0;
        }
        
        keyDataIndex++;
      }
    }
    
    // Extract multiples
    const multipleMatch = html.match(/multiple[^>]*>([0-9.]+)x?</i);
    if (multipleMatch) {
      listing.multiple = parseFloat(multipleMatch[1]);
      listing.revenue_multiple = parseFloat(multipleMatch[1]);
    }
    
    // Extract dates
    const endAtMatch = html.match(/(?:end-date|auction-end)[^>]*>([^<]+)</i);
    if (endAtMatch) {
      try {
        listing.end_at = new Date(endAtMatch[1].trim()).toISOString();
      } catch (e) {
        // Invalid date format
      }
    }
    
    const establishedMatch = html.match(/(?:established|founded)[^>]*>([^<]+)</i);
    if (establishedMatch) {
      try {
        listing.established_at = new Date(establishedMatch[1].trim()).toISOString();
      } catch (e) {
        // Invalid date format
      }
    }
    
    // Extract age
    const ageMatch = html.match(/(?:age|years-old)[^>]*>([0-9]+)\s*(?:years?)?/i);
    if (ageMatch) {
      listing.formatted_age_in_years = `${ageMatch[1]} years`;
    }
    
    // Set listing URL
    listing.listing_url = `https://flippa.com/listings/${id}`;
    
    // Ensure all required fields have at least default values
    const defaults = {
      category: 'Unknown',
      country_name: 'Unknown',
      currency_label: 'USD',
      status: 'active',
      property_type: 'Unknown',
      sale_method: 'Unknown',
      monetization: 'Unknown',
      primary_platform: 'Unknown'
    };
    
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!listing[key]) {
        listing[key] = defaultValue;
      }
    }
    
    return listing;
  }

  // Detect field changes between baseline and current
  private detectFieldChanges(baseline: ListingData, current: ListingData): Array<{
    field: string;
    old_value: any;
    new_value: any;
  }> {
    const changes: Array<{ field: string; old_value: any; new_value: any }> = [];
    
    for (const field of MONITORED_FIELDS) {
      const oldValue = baseline[field];
      const newValue = current[field];
      
      // Skip if both are null/undefined
      if (!oldValue && !newValue) continue;
      
      // Detect change
      if (oldValue !== newValue) {
        // Special handling for numeric fields
        if (['price', 'profit_average', 'revenue_average'].includes(field)) {
          const oldNum = parseFloat(oldValue) || 0;
          const newNum = parseFloat(newValue) || 0;
          if (Math.abs(oldNum - newNum) > 0.01) {
            changes.push({ field, old_value: oldNum, new_value: newNum });
          }
        } else {
          changes.push({ field, old_value: oldValue, new_value: newValue });
        }
      }
    }
    
    return changes;
  }

  // Calculate change score for prioritization
  private calculateChangeScore(type: string, listing: ListingData): number {
    let score = 0;
    
    if (type === 'new') {
      score = 50;
      if (listing.price > 100000) score += 30;
      else if (listing.price > 50000) score += 20;
      else if (listing.price > 25000) score += 10;
    } else if (type === 'deleted') {
      score = 30;
    }
    
    return Math.min(score, 100);
  }

  // Calculate score for modified listings
  private calculateModifiedScore(baseline: ListingData, current: ListingData, changes: any[]): number {
    let score = 20;
    
    // Price change scoring
    const priceChange = changes.find(c => c.field === 'price');
    if (priceChange) {
      const oldPrice = priceChange.old_value;
      const newPrice = priceChange.new_value;
      const changePercent = Math.abs((newPrice - oldPrice) / oldPrice * 100);
      
      if (changePercent > 50) score += 40;
      else if (changePercent > 30) score += 30;
      else if (changePercent > 20) score += 20;
      else if (changePercent > 10) score += 10;
    }
    
    // Status change scoring
    const statusChange = changes.find(c => c.field === 'status');
    if (statusChange) {
      score += 20;
      if (statusChange.new_value === 'sold') score += 10;
    }
    
    return Math.min(score, 100);
  }

  // Save changes to database
  private async saveChanges(changes: ChangeDetection[]) {
    console.log(`\n💾 Saving ${changes.length} changes to database...`);
    
    for (const change of changes) {
      try {
        if (change.type === 'new') {
          // Insert new listing
          await supabase
            .from('flippa_listings_enhanced')
            .insert({
              ...change.listing,
              is_new: true,
              first_seen_at: new Date().toISOString(),
              last_updated_at: new Date().toISOString()
            });
        } else if (change.type === 'deleted') {
          // Mark as deleted
          await supabase
            .from('flippa_listings_enhanced')
            .update({
              is_deleted: true,
              deletion_detected_at: new Date().toISOString(),
              last_updated_at: new Date().toISOString()
            })
            .eq('id', change.listing.id);
        } else if (change.type === 'modified' && change.changes) {
          // Update modified fields
          const updates: any = {
            last_updated_at: new Date().toISOString(),
            change_count: change.listing.change_count + 1
          };
          
          // Update changed fields
          for (const fieldChange of change.changes) {
            updates[fieldChange.field] = fieldChange.new_value;
            
            if (fieldChange.field === 'price') {
              updates.has_price_change = true;
              updates.last_price_change = fieldChange.new_value;
              updates.last_price_change_date = new Date().toISOString();
            } else if (fieldChange.field === 'status') {
              updates.has_status_change = true;
            }
          }
          
          await supabase
            .from('flippa_listings_enhanced')
            .update(updates)
            .eq('id', change.listing.id);
        }
        
        // Log change
        await supabase
          .from('flippa_change_log')
          .insert({
            listing_id: change.listing.id,
            change_type: change.type,
            changed_fields: change.changes || [],
            change_score: change.changeScore || 0,
            scan_id: this.scanId
          });
        
      } catch (error) {
        console.error(`❌ Error saving change for ${change.listing.id}:`, error);
        this.stats.errors++;
      }
    }
  }

  // Update monitoring statistics
  private async updateStats() {
    const duration = Math.round((Date.now() - this.stats.startTime) / 1000);
    
    await supabase
      .from('flippa_monitoring_stats')
      .insert({
        total_listings: this.stats.totalProcessed,
        new_listings: this.stats.newListings,
        modified_listings: this.stats.modifiedListings,
        deleted_listings: this.stats.deletedListings,
        scan_duration_seconds: duration,
        errors_count: this.stats.errors
      });
  }

  // Send notifications for high-value changes
  private async notifyHighValueChanges(changes: ChangeDetection[]) {
    const highValueChanges = changes.filter(c => 
      (c.changeScore || 0) > 70 || 
      (c.listing.price > 100000)
    );
    
    if (highValueChanges.length > 0) {
      console.log(`\n🔔 ${highValueChanges.length} high-value changes detected!`);
      // Implement notification logic here
    }
  }

  // Utility methods
  private async fetchPage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache'
        }
      };
      
      https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  private async delay(min: number, max: number) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}