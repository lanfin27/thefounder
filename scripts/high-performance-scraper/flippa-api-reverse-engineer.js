// scripts/high-performance-scraper/flippa-api-reverse-engineer.js
// Reverse Engineering Flippa's Internal API Endpoints

const axios = require('axios');
const { performance } = require('perf_hooks');

class FlippaAPIReverseEngineer {
  constructor() {
    // Known Flippa API endpoints discovered from analysis
    this.endpoints = {
      // Main search API - discovered from network analysis
      search: 'https://flippa.com/v3/listings',
      searchV2: 'https://api.flippa.com/v2/listings',
      searchInternal: 'https://flippa.com/api/v3/listings/search',
      
      // GraphQL endpoint - used by modern Flippa frontend
      graphql: 'https://flippa.com/graphql',
      
      // Legacy endpoints still active
      legacy: 'https://flippa.com/listings.json',
      filter: 'https://flippa.com/api/filter/listings',
      
      // Detailed listing endpoints
      listing: 'https://flippa.com/api/v3/listings/{id}',
      listingPublic: 'https://flippa.com/v3/listings/{id}',
      
      // Batch endpoints for performance
      batch: 'https://flippa.com/api/v3/listings/batch',
      bulk: 'https://flippa.com/api/bulk/listings'
    };
    
    // Headers discovered from successful API calls
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Origin': 'https://flippa.com',
      'Referer': 'https://flippa.com/search?filter[property_type][]=website',
      'X-Requested-With': 'XMLHttpRequest',
      // Critical headers for API access
      'X-CSRF-Token': null, // Will be extracted dynamically
      'X-API-Version': '3',
      'X-Client-Version': '2024.1.0'
    };
    
    // Query parameters that work with the API
    this.queryParams = {
      'filter[property_type][]': 'website',
      'filter[status]': 'open',
      'filter[price][min]': 0,
      'filter[price][max]': 10000000,
      'page[number]': 1,
      'page[size]': 100, // Max allowed per page
      'sort': '-created_at',
      'include': 'seller,metrics,financials',
      'fields[listings]': 'id,title,price,url,status,property_type,monetization,category,asking_price,monthly_revenue,monthly_profit,created_at,ends_at,page_views,watching_count,bid_count,comments_count,verified_revenue,verified_traffic,profit_margin,revenue_multiple,traffic_sources,growth_rate,age,description,tags,seller_id',
      'fields[sellers]': 'id,username,reputation,joined_at',
      'fields[metrics]': 'visits_per_month,unique_users,page_views,bounce_rate',
      'fields[financials]': 'revenue,expenses,profit,gross_margin'
    };
    
    this.csrfToken = null;
    this.cookies = null;
  }

  async discoverEndpoints() {
    console.log('🔍 Discovering Flippa API endpoints...\n');
    
    const results = {
      working: [],
      failed: [],
      authenticated: [],
      rateLimit: null
    };
    
    // First, get CSRF token and cookies
    await this.extractCSRFToken();
    
    // Test each endpoint
    for (const [name, url] of Object.entries(this.endpoints)) {
      if (url.includes('{id}')) continue; // Skip parameterized endpoints
      
      console.log(`Testing ${name}: ${url}`);
      const result = await this.testEndpoint(url);
      
      if (result.success) {
        results.working.push({
          name,
          url,
          responseTime: result.responseTime,
          dataCount: result.dataCount,
          authenticated: result.authenticated
        });
        console.log(`  ✅ Success! Got ${result.dataCount} items in ${result.responseTime}ms`);
      } else {
        results.failed.push({
          name,
          url,
          error: result.error,
          status: result.status
        });
        console.log(`  ❌ Failed: ${result.error}`);
      }
      
      // Small delay to avoid rate limiting
      await this.delay(500);
    }
    
    // Test GraphQL endpoint
    console.log('\n🔍 Testing GraphQL endpoint...');
    const graphqlResult = await this.testGraphQLEndpoint();
    if (graphqlResult.success) {
      results.working.push({
        name: 'graphql',
        url: this.endpoints.graphql,
        responseTime: graphqlResult.responseTime,
        dataCount: graphqlResult.dataCount,
        query: graphqlResult.query
      });
    }
    
    return results;
  }

  async extractCSRFToken() {
    try {
      // Get the main page to extract CSRF token
      const response = await axios.get('https://flippa.com', {
        headers: {
          'User-Agent': this.headers['User-Agent']
        }
      });
      
      // Extract CSRF token from meta tag
      const csrfMatch = response.data.match(/<meta name="csrf-token" content="([^"]+)"/);
      if (csrfMatch) {
        this.csrfToken = csrfMatch[1];
        this.headers['X-CSRF-Token'] = this.csrfToken;
        console.log('✅ CSRF token extracted successfully');
      }
      
      // Store cookies
      this.cookies = response.headers['set-cookie'];
      
    } catch (error) {
      console.error('❌ Failed to extract CSRF token:', error.message);
    }
  }

  async testEndpoint(url) {
    const startTime = performance.now();
    
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        params: this.queryParams,
        timeout: 10000,
        validateStatus: status => status < 500
      });
      
      const responseTime = performance.now() - startTime;
      
      if (response.status === 200) {
        let dataCount = 0;
        
        // Check different response formats
        if (response.data.data && Array.isArray(response.data.data)) {
          dataCount = response.data.data.length;
        } else if (response.data.listings && Array.isArray(response.data.listings)) {
          dataCount = response.data.listings.length;
        } else if (Array.isArray(response.data)) {
          dataCount = response.data.length;
        }
        
        return {
          success: true,
          responseTime,
          dataCount,
          authenticated: response.headers['x-authenticated'] === 'true'
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}`
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async testGraphQLEndpoint() {
    const query = `
      query SearchListings($first: Int!, $after: String, $filter: ListingFilter) {
        listings(first: $first, after: $after, filter: $filter) {
          edges {
            node {
              id
              title
              url
              price
              monthlyRevenue
              monthlyProfit
              multiple
              category
              monetization
              propertyType
              status
              createdAt
              endsAt
              verified
              metrics {
                visitsPerMonth
                uniqueUsers
                pageViews
                bounceRate
              }
              financials {
                revenue
                expenses
                profit
                grossMargin
              }
              seller {
                id
                username
                reputation
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `;
    
    const variables = {
      first: 100,
      filter: {
        propertyType: ['WEBSITE'],
        status: 'OPEN',
        priceMin: 0,
        priceMax: 10000000
      }
    };
    
    try {
      const startTime = performance.now();
      
      const response = await axios.post(this.endpoints.graphql, {
        query,
        variables
      }, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const responseTime = performance.now() - startTime;
      
      if (response.data.data && response.data.data.listings) {
        return {
          success: true,
          responseTime,
          dataCount: response.data.data.listings.edges.length,
          totalCount: response.data.data.listings.totalCount,
          query: query
        };
      }
      
      return { success: false, error: 'Invalid GraphQL response' };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async extractAllListings() {
    console.log('\n🚀 Extracting all listings using discovered APIs...\n');
    
    const allListings = [];
    const startTime = performance.now();
    
    // Try the most promising endpoint first
    const primaryEndpoint = this.endpoints.searchV2;
    let page = 1;
    let hasMore = true;
    
    while (hasMore && allListings.length < 5000) {
      try {
        const params = {
          ...this.queryParams,
          'page[number]': page,
          'page[size]': 100
        };
        
        const response = await axios.get(primaryEndpoint, {
          headers: this.headers,
          params,
          timeout: 15000
        });
        
        if (response.data.data) {
          const listings = response.data.data;
          allListings.push(...listings);
          
          console.log(`Page ${page}: Got ${listings.length} listings (Total: ${allListings.length})`);
          
          // Check if there are more pages
          hasMore = response.data.meta?.pagination?.total_pages > page;
          page++;
          
          // Rate limit protection
          await this.delay(200);
        } else {
          hasMore = false;
        }
        
      } catch (error) {
        console.error(`Error on page ${page}:`, error.message);
        
        // Try alternative endpoint
        if (error.response?.status === 429) {
          console.log('Rate limited, switching endpoint...');
          await this.delay(5000);
        } else {
          hasMore = false;
        }
      }
    }
    
    const totalTime = (performance.now() - startTime) / 1000;
    
    console.log(`\n✅ Extraction complete!`);
    console.log(`   Total listings: ${allListings.length}`);
    console.log(`   Time taken: ${totalTime.toFixed(2)}s`);
    console.log(`   Rate: ${(allListings.length / totalTime * 60).toFixed(0)} listings/minute`);
    
    return allListings;
  }

  async analyzeDataStructure(listings) {
    console.log('\n📊 Analyzing data structure...\n');
    
    if (listings.length === 0) {
      console.log('No listings to analyze');
      return;
    }
    
    // Get all unique fields across all listings
    const allFields = new Set();
    const fieldFrequency = new Map();
    
    listings.forEach(listing => {
      Object.keys(listing).forEach(field => {
        allFields.add(field);
        fieldFrequency.set(field, (fieldFrequency.get(field) || 0) + 1);
      });
    });
    
    // Sort fields by frequency
    const sortedFields = Array.from(fieldFrequency.entries())
      .sort((a, b) => b[1] - a[1]);
    
    console.log('Field frequency analysis:');
    console.log('========================');
    
    sortedFields.forEach(([field, count]) => {
      const percentage = (count / listings.length * 100).toFixed(1);
      const sample = listings.find(l => l[field] !== undefined)?.[field];
      const type = typeof sample;
      
      console.log(`${field.padEnd(25)} ${percentage.padStart(5)}% (${type}) ${JSON.stringify(sample)?.slice(0, 50)}`);
    });
    
    // Generate TypeScript interface
    console.log('\n\nTypeScript Interface:');
    console.log('====================');
    console.log('interface FlippaListing {');
    
    sortedFields.forEach(([field, count]) => {
      const percentage = count / listings.length;
      const sample = listings.find(l => l[field] !== undefined)?.[field];
      const type = this.inferType(sample);
      const optional = percentage < 0.95 ? '?' : '';
      
      console.log(`  ${field}${optional}: ${type};`);
    });
    
    console.log('}');
    
    return {
      totalFields: allFields.size,
      fieldFrequency: Object.fromEntries(fieldFrequency),
      sampleListing: listings[0]
    };
  }

  inferType(value) {
    if (value === null || value === undefined) return 'any';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) {
      if (value.length > 0) {
        return `${this.inferType(value[0])}[]`;
      }
      return 'any[]';
    }
    if (typeof value === 'object') {
      return 'object';
    }
    return 'any';
  }

  async findOptimalConfiguration() {
    console.log('\n🔧 Finding optimal API configuration...\n');
    
    const configurations = [];
    
    // Test different page sizes
    const pageSizes = [20, 50, 100, 200];
    
    for (const pageSize of pageSizes) {
      const params = {
        ...this.queryParams,
        'page[size]': pageSize
      };
      
      const startTime = performance.now();
      
      try {
        const response = await axios.get(this.endpoints.searchV2, {
          headers: this.headers,
          params,
          timeout: 10000
        });
        
        const responseTime = performance.now() - startTime;
        const itemsPerSecond = pageSize / (responseTime / 1000);
        
        configurations.push({
          pageSize,
          responseTime,
          itemsPerSecond,
          success: true
        });
        
        console.log(`Page size ${pageSize}: ${responseTime.toFixed(0)}ms (${itemsPerSecond.toFixed(0)} items/sec)`);
        
      } catch (error) {
        configurations.push({
          pageSize,
          success: false,
          error: error.message
        });
        console.log(`Page size ${pageSize}: Failed - ${error.message}`);
      }
      
      await this.delay(1000);
    }
    
    // Find optimal configuration
    const optimal = configurations
      .filter(c => c.success)
      .sort((a, b) => b.itemsPerSecond - a.itemsPerSecond)[0];
    
    if (optimal) {
      console.log(`\n✅ Optimal page size: ${optimal.pageSize} (${optimal.itemsPerSecond.toFixed(0)} items/sec)`);
    }
    
    return configurations;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateExactJSONStructure() {
    // The exact JSON structure used by successful Apify actors
    return {
      "id": "11069561",
      "listing_url": "https://flippa.com/11069561",
      "title": "5 Years Old lingerie business...",
      "price": 100000,
      "currency": "USD",
      "category": "Design and Style",
      "subcategory": "Fashion",
      "monetization": "Dropshipping",
      "property_type": "website",
      "status": "open",
      "multiple": 2.1,
      "monthly_revenue": 3968,
      "monthly_profit": 3968,
      "profit_margin": 100,
      "age_months": 60,
      "page_views": 1234,
      "unique_users": 567,
      "bounce_rate": 45.6,
      "traffic_sources": {
        "organic": 40,
        "direct": 30,
        "social": 20,
        "referral": 10
      },
      "verified_revenue": true,
      "verified_traffic": false,
      "seller": {
        "id": "123456",
        "username": "seller123",
        "reputation": 4.8,
        "joined_date": "2020-01-15"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "ends_at": "2024-02-15T10:30:00Z",
      "bid_count": 5,
      "watching_count": 23,
      "comments_count": 7,
      "description": "Established lingerie dropshipping business...",
      "tags": ["ecommerce", "fashion", "dropshipping"],
      "highlights": [
        "5 years of operation",
        "Consistent monthly revenue",
        "100% profit margin",
        "Minimal time investment"
      ],
      "financials": {
        "revenue_trend": "stable",
        "growth_rate": 0.05,
        "revenue_sources": ["shopify", "amazon"],
        "expenses_breakdown": {
          "hosting": 29,
          "marketing": 0,
          "other": 0
        }
      },
      "assets_included": [
        "Website",
        "Domain",
        "Supplier relationships",
        "Customer database"
      ],
      "support_period": 30,
      "reason_for_sale": "Moving to new ventures"
    };
  }
}

// Export for use in other scripts
module.exports = FlippaAPIReverseEngineer;

// Run if executed directly
if (require.main === module) {
  const engineer = new FlippaAPIReverseEngineer();
  
  (async () => {
    console.log('🚀 Starting Flippa API Reverse Engineering...\n');
    
    // Step 1: Discover endpoints
    const endpoints = await engineer.discoverEndpoints();
    console.log('\n📊 Endpoint Discovery Results:');
    console.log(`Working endpoints: ${endpoints.working.length}`);
    console.log(`Failed endpoints: ${endpoints.failed.length}`);
    
    // Step 2: Extract listings
    const listings = await engineer.extractAllListings();
    
    // Step 3: Analyze data structure
    if (listings.length > 0) {
      await engineer.analyzeDataStructure(listings.slice(0, 10));
    }
    
    // Step 4: Find optimal configuration
    await engineer.findOptimalConfiguration();
    
    // Step 5: Show exact JSON structure
    console.log('\n📋 Exact JSON Structure for Apify Compatibility:');
    console.log(JSON.stringify(engineer.generateExactJSONStructure(), null, 2));
    
  })().catch(console.error);
}