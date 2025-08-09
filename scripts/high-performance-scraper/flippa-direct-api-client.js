// scripts/high-performance-scraper/flippa-direct-api-client.js
// Direct API Client for Flippa - Implements discovered endpoints

const axios = require('axios');
const { performance } = require('perf_hooks');
const EventEmitter = require('events');

class FlippaDirectAPIClient extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxConcurrent: 10,
      pageSize: 100,
      retryAttempts: 3,
      rateLimitDelay: 200,
      timeout: 15000,
      ...config
    };
    
    // Primary API endpoints (discovered through reverse engineering)
    this.apiEndpoints = {
      // Main listing search - returns paginated results
      search: 'https://flippa.com/v3/listings',
      
      // Alternative search endpoints
      searchAlt: 'https://api.flippa.com/v2/listings',
      searchBeta: 'https://flippa.com/api/v3/listings/search',
      
      // GraphQL for rich data
      graphql: 'https://flippa.com/graphql',
      
      // Batch operations
      batch: 'https://flippa.com/api/v3/listings/batch'
    };
    
    // Optimized headers for API access
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Origin': 'https://flippa.com',
      'Referer': 'https://flippa.com/search?filter[property_type][]=website',
      'X-Requested-With': 'XMLHttpRequest',
      'X-API-Version': '3'
    };
    
    // Optimized query parameters
    this.defaultParams = {
      'filter[property_type][]': 'website',
      'filter[status]': 'open',
      'page[size]': this.config.pageSize,
      'sort': '-created_at',
      'include': 'seller,metrics,financials',
      'fields[listings]': this.getAllFields()
    };
    
    this.stats = {
      totalExtracted: 0,
      apiCalls: 0,
      errors: 0,
      startTime: null
    };
  }

  getAllFields() {
    // Comprehensive field list for maximum data extraction
    return [
      'id', 'title', 'url', 'price', 'currency', 'status',
      'property_type', 'category', 'subcategory', 'monetization',
      'asking_price', 'buy_it_now_price', 'minimum_bid',
      'monthly_revenue', 'annual_revenue', 'monthly_profit', 'annual_profit',
      'revenue_multiple', 'profit_multiple', 'profit_margin',
      'page_views', 'unique_users', 'bounce_rate', 'session_duration',
      'traffic_sources', 'traffic_countries', 'traffic_devices',
      'verified_revenue', 'verified_traffic', 'verified_google_analytics',
      'age', 'age_months', 'established_date',
      'bid_count', 'watching_count', 'comments_count',
      'created_at', 'updated_at', 'ends_at', 'starts_at',
      'description', 'summary', 'highlights', 'tags',
      'seller_id', 'seller_username', 'seller_reputation',
      'assets_included', 'support_period', 'reason_for_sale',
      'has_trademark', 'has_patent', 'inventory_included'
    ].join(',');
  }

  async extractAllListings(targetCount = 5000) {
    console.log(`🎯 Starting direct API extraction (target: ${targetCount} listings)...`);
    
    this.stats.startTime = performance.now();
    const allListings = [];
    
    try {
      // Method 1: Standard pagination
      const standardResults = await this.extractViaStandardAPI(targetCount);
      allListings.push(...standardResults);
      
      if (allListings.length < targetCount) {
        // Method 2: GraphQL for additional data
        const graphqlResults = await this.extractViaGraphQL(targetCount - allListings.length);
        allListings.push(...graphqlResults);
      }
      
      if (allListings.length < targetCount) {
        // Method 3: Parallel extraction from multiple filters
        const parallelResults = await this.extractViaParallelFilters(targetCount - allListings.length);
        allListings.push(...parallelResults);
      }
      
    } catch (error) {
      console.error('❌ Extraction error:', error.message);
    }
    
    const duration = (performance.now() - this.stats.startTime) / 1000;
    
    console.log('\n✅ Extraction Complete!');
    console.log(`   Total listings: ${allListings.length}`);
    console.log(`   Duration: ${duration.toFixed(2)}s`);
    console.log(`   Rate: ${(allListings.length / duration * 60).toFixed(0)} listings/minute`);
    console.log(`   API calls: ${this.stats.apiCalls}`);
    
    return this.transformToApifyFormat(allListings);
  }

  async extractViaStandardAPI(limit) {
    console.log('\n📡 Method 1: Standard API pagination...');
    
    const listings = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && listings.length < limit) {
      try {
        const params = {
          ...this.defaultParams,
          'page[number]': page
        };
        
        const response = await this.makeAPICall(this.apiEndpoints.search, { params });
        
        if (response.data && response.data.data) {
          const pageListings = response.data.data;
          listings.push(...pageListings);
          
          this.emit('progress', {
            method: 'standard',
            page,
            count: pageListings.length,
            total: listings.length
          });
          
          console.log(`   Page ${page}: ${pageListings.length} listings (Total: ${listings.length})`);
          
          // Check pagination
          const totalPages = response.data.meta?.pagination?.total_pages || 1;
          hasMore = page < totalPages && listings.length < limit;
          page++;
          
        } else {
          hasMore = false;
        }
        
        await this.rateLimitDelay();
        
      } catch (error) {
        console.error(`   Error on page ${page}:`, error.message);
        
        // Try alternative endpoint
        if (this.stats.errors < 3) {
          console.log('   Switching to alternative endpoint...');
          this.apiEndpoints.search = this.apiEndpoints.searchAlt;
          this.stats.errors++;
        } else {
          hasMore = false;
        }
      }
    }
    
    return listings;
  }

  async extractViaGraphQL(limit) {
    console.log('\n📡 Method 2: GraphQL extraction...');
    
    const listings = [];
    let cursor = null;
    let hasMore = true;
    
    const query = `
      query GetListings($first: Int!, $after: String, $filter: ListingFilterInput) {
        listings(first: $first, after: $after, filter: $filter) {
          edges {
            node {
              id
              title
              url
              price
              currency
              status
              propertyType
              category
              subcategory
              monetization
              monthlyRevenue
              monthlyProfit
              revenueMultiple
              profitMargin
              pageViews
              uniqueUsers
              verifiedRevenue
              verifiedTraffic
              age
              bidCount
              watchingCount
              createdAt
              endsAt
              seller {
                id
                username
                reputation
              }
              metrics {
                trafficSources
                bounceRate
                avgSessionDuration
              }
              financials {
                annualRevenue
                annualProfit
                expensesBreakdown
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    
    while (hasMore && listings.length < limit) {
      try {
        const variables = {
          first: Math.min(100, limit - listings.length),
          after: cursor,
          filter: {
            propertyType: 'WEBSITE',
            status: 'OPEN'
          }
        };
        
        const response = await this.makeAPICall(this.apiEndpoints.graphql, {
          method: 'POST',
          data: { query, variables }
        });
        
        if (response.data?.data?.listings) {
          const edges = response.data.data.listings.edges;
          const pageListings = edges.map(edge => edge.node);
          listings.push(...pageListings);
          
          console.log(`   GraphQL batch: ${pageListings.length} listings (Total: ${listings.length})`);
          
          const pageInfo = response.data.data.listings.pageInfo;
          hasMore = pageInfo.hasNextPage;
          cursor = pageInfo.endCursor;
        } else {
          hasMore = false;
        }
        
        await this.rateLimitDelay();
        
      } catch (error) {
        console.error('   GraphQL error:', error.message);
        hasMore = false;
      }
    }
    
    return listings;
  }

  async extractViaParallelFilters(limit) {
    console.log('\n📡 Method 3: Parallel filter extraction...');
    
    // Split by price ranges for parallel extraction
    const priceRanges = [
      { min: 0, max: 1000 },
      { min: 1000, max: 5000 },
      { min: 5000, max: 10000 },
      { min: 10000, max: 50000 },
      { min: 50000, max: 100000 },
      { min: 100000, max: 500000 },
      { min: 500000, max: 10000000 }
    ];
    
    const promises = priceRanges.map(range => 
      this.extractPriceRange(range, Math.ceil(limit / priceRanges.length))
    );
    
    const results = await Promise.all(promises);
    const allListings = results.flat();
    
    console.log(`   Parallel extraction complete: ${allListings.length} total listings`);
    
    return allListings.slice(0, limit);
  }

  async extractPriceRange(range, limit) {
    const listings = [];
    let page = 1;
    
    try {
      const params = {
        ...this.defaultParams,
        'filter[price][min]': range.min,
        'filter[price][max]': range.max,
        'page[number]': page,
        'page[size]': Math.min(100, limit)
      };
      
      const response = await this.makeAPICall(this.apiEndpoints.search, { params });
      
      if (response.data?.data) {
        listings.push(...response.data.data);
        console.log(`   Price range $${range.min}-${range.max}: ${response.data.data.length} listings`);
      }
      
    } catch (error) {
      console.error(`   Error in range $${range.min}-${range.max}:`, error.message);
    }
    
    return listings;
  }

  async makeAPICall(url, options = {}) {
    this.stats.apiCalls++;
    
    const config = {
      url,
      method: options.method || 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      },
      timeout: this.config.timeout,
      ...options
    };
    
    try {
      const response = await axios(config);
      return response;
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('⚠️ Rate limited, waiting...');
        await this.delay(5000);
        return this.makeAPICall(url, options); // Retry
      }
      throw error;
    }
  }

  transformToApifyFormat(listings) {
    // Transform to exact Apify actor format
    return listings.map(listing => ({
      id: String(listing.id),
      listing_url: `https://flippa.com/${listing.id}`,
      title: listing.title || '',
      price: this.parsePrice(listing.price || listing.asking_price),
      currency: listing.currency || 'USD',
      category: listing.category || '',
      subcategory: listing.subcategory || '',
      monetization: listing.monetization || '',
      property_type: listing.property_type || listing.propertyType || 'website',
      status: listing.status || 'open',
      multiple: this.parseFloat(listing.revenue_multiple || listing.revenueMultiple),
      monthly_revenue: this.parsePrice(listing.monthly_revenue || listing.monthlyRevenue),
      monthly_profit: this.parsePrice(listing.monthly_profit || listing.monthlyProfit),
      profit_margin: this.parseFloat(listing.profit_margin || listing.profitMargin),
      age_months: this.parseAge(listing.age || listing.age_months),
      page_views: parseInt(listing.page_views || listing.pageViews || 0),
      unique_users: parseInt(listing.unique_users || listing.uniqueUsers || 0),
      bounce_rate: this.parseFloat(listing.bounce_rate || listing.metrics?.bounceRate),
      traffic_sources: this.parseTrafficSources(listing.traffic_sources || listing.metrics?.trafficSources),
      verified_revenue: Boolean(listing.verified_revenue || listing.verifiedRevenue),
      verified_traffic: Boolean(listing.verified_traffic || listing.verifiedTraffic),
      seller: {
        id: String(listing.seller_id || listing.seller?.id || ''),
        username: listing.seller_username || listing.seller?.username || '',
        reputation: this.parseFloat(listing.seller_reputation || listing.seller?.reputation)
      },
      created_at: listing.created_at || listing.createdAt || '',
      ends_at: listing.ends_at || listing.endsAt || '',
      bid_count: parseInt(listing.bid_count || listing.bidCount || 0),
      watching_count: parseInt(listing.watching_count || listing.watchingCount || 0),
      comments_count: parseInt(listing.comments_count || listing.commentsCount || 0),
      description: listing.description || listing.summary || '',
      tags: this.parseTags(listing.tags),
      highlights: this.parseHighlights(listing.highlights),
      financials: {
        revenue_trend: listing.revenue_trend || 'stable',
        growth_rate: this.parseFloat(listing.growth_rate),
        revenue_sources: this.parseRevenueSources(listing.revenue_sources),
        expenses_breakdown: listing.expenses_breakdown || {}
      },
      assets_included: this.parseAssets(listing.assets_included),
      support_period: parseInt(listing.support_period || 30),
      reason_for_sale: listing.reason_for_sale || ''
    }));
  }

  // Helper parsing methods
  parsePrice(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  parseFloat(value) {
    if (!value) return 0;
    return parseFloat(value) || 0;
  }

  parseAge(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    // Convert "X years" to months
    const match = String(value).match(/(\d+)\s*(year|month)/i);
    if (match) {
      const num = parseInt(match[1]);
      return match[2].toLowerCase().includes('year') ? num * 12 : num;
    }
    return 0;
  }

  parseTrafficSources(sources) {
    if (!sources) {
      return { organic: 0, direct: 0, social: 0, referral: 0 };
    }
    if (typeof sources === 'object') return sources;
    return { organic: 0, direct: 0, social: 0, referral: 0 };
  }

  parseTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim());
    return [];
  }

  parseHighlights(highlights) {
    if (!highlights) return [];
    if (Array.isArray(highlights)) return highlights;
    if (typeof highlights === 'string') return [highlights];
    return [];
  }

  parseRevenueSources(sources) {
    if (!sources) return [];
    if (Array.isArray(sources)) return sources;
    if (typeof sources === 'string') return sources.split(',').map(s => s.trim());
    return [];
  }

  parseAssets(assets) {
    if (!assets) return ['Website', 'Domain'];
    if (Array.isArray(assets)) return assets;
    if (typeof assets === 'string') return assets.split(',').map(a => a.trim());
    return ['Website', 'Domain'];
  }

  async rateLimitDelay() {
    await this.delay(this.config.rateLimitDelay);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    const duration = this.stats.startTime ? (performance.now() - this.stats.startTime) / 1000 : 0;
    
    return {
      totalExtracted: this.stats.totalExtracted,
      apiCalls: this.stats.apiCalls,
      errors: this.stats.errors,
      duration: duration.toFixed(2),
      rate: duration > 0 ? (this.stats.totalExtracted / duration * 60).toFixed(0) : 0
    };
  }
}

module.exports = FlippaDirectAPIClient;