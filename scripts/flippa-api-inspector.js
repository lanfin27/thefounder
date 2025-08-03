/**
 * Flippa API Inspector
 * Reverse engineers Flippa's API structure to achieve Apify-level extraction
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config({ path: '.env.local' });

class FlippaAPIInspector {
  constructor() {
    this.apiCalls = [];
    this.dataPatterns = [];
    this.uniqueEndpoints = new Set();
  }

  async inspectFlippaAPIs() {
    console.log('🔍 FLIPPA API INSPECTION - APIFY REVERSE ENGINEERING');
    console.log('🎯 Target: Discover API endpoints for 100% data extraction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Intercept all network requests to find API endpoints
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      
      // Log potential API calls
      if (url.includes('api') || url.includes('search') || url.includes('listings') || 
          url.includes('graphql') || url.includes('_next/data')) {
        
        console.log(`🌐 API Call: ${request.method()} ${url}`);
        
        this.apiCalls.push({
          method: request.method(),
          url: url,
          headers: request.headers(),
          postData: request.postData()
        });
        
        // Extract endpoint pattern
        const endpoint = this.extractEndpointPattern(url);
        if (endpoint) {
          this.uniqueEndpoints.add(endpoint);
        }
      }
      request.continue();
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      
      if ((url.includes('api') || url.includes('search') || url.includes('listings') || 
           url.includes('graphql') || url.includes('_next/data')) && 
          response.status() === 200) {
        
        try {
          const contentType = response.headers()['content-type'] || '';
          
          if (contentType.includes('json')) {
            const data = await response.json();
            console.log(`📊 API Response from: ${url}`);
            console.log('   Status:', response.status());
            console.log('   Data structure:', this.analyzeDataStructure(data));
            
            this.dataPatterns.push({
              url: url,
              endpoint: this.extractEndpointPattern(url),
              status: response.status(),
              headers: response.headers(),
              dataStructure: this.analyzeDataStructure(data),
              sampleData: this.extractSampleData(data)
            });
          }
          
        } catch (error) {
          // Not JSON response or parsing error
        }
      }
    });
    
    try {
      console.log('🔍 Loading Flippa search page...');
      await page.goto('https://flippa.com/search?filter[property_type][]=website', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      console.log('⏳ Waiting for page to fully load...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Analyze page structure
      const pageAnalysis = await page.evaluate(() => {
        // Look for React/Next.js data
        const analysis = {
          reactFound: !!window.React || !!window._next,
          nextjsFound: !!window.__NEXT_DATA__,
          apolloFound: !!window.__APOLLO_STATE__,
          reduxFound: !!window.__REDUX_STATE__,
          globalData: {}
        };
        
        // Check for Next.js build data
        if (window.__NEXT_DATA__) {
          analysis.nextjsData = {
            props: window.__NEXT_DATA__.props,
            page: window.__NEXT_DATA__.page,
            query: window.__NEXT_DATA__.query,
            buildId: window.__NEXT_DATA__.buildId
          };
        }
        
        // Look for global data stores
        const globalVars = Object.keys(window).filter(key => 
          key.includes('data') || key.includes('state') || 
          key.includes('listings') || key.includes('search')
        );
        
        globalVars.forEach(key => {
          try {
            const value = window[key];
            if (value && typeof value === 'object') {
              analysis.globalData[key] = typeof value;
            }
          } catch (e) {}
        });
        
        return analysis;
      });
      
      console.log('\n📊 Page Technology Analysis:', pageAnalysis);
      
      // Scroll to trigger more API calls
      console.log('\n📜 Scrolling to trigger lazy loading...');
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try pagination
      console.log('\n📄 Attempting pagination...');
      try {
        await page.click('a[href*="page=2"], .pagination a:nth-child(2), [data-testid="next-page"]');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (e) {
        console.log('⚠️ Pagination click failed, continuing...');
      }
      
      // Try to open a listing detail page
      console.log('\n🔍 Attempting to open listing detail...');
      try {
        const listingLink = await page.$('a[href*="/listings/"], a[href^="/"][href*="-website"]');
        if (listingLink) {
          await listingLink.click();
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (e) {
        console.log('⚠️ Could not open listing detail');
      }
      
      console.log(`\n🎯 Captured ${this.apiCalls.length} API calls`);
      console.log(`📊 Captured ${this.dataPatterns.length} data responses`);
      console.log(`🔗 Unique endpoints: ${this.uniqueEndpoints.size}`);
      
      // Analyze the captured data
      await this.analyzeAPIPatterns();
      
    } catch (error) {
      console.error('❌ Inspection failed:', error);
    } finally {
      await browser.close();
    }
  }

  extractEndpointPattern(url) {
    try {
      const urlObj = new URL(url);
      // Remove query parameters and IDs to get endpoint pattern
      let pattern = urlObj.pathname;
      
      // Replace numeric IDs with placeholders
      pattern = pattern.replace(/\/\d+/g, '/{id}');
      
      // Special handling for Next.js data endpoints
      if (pattern.includes('_next/data')) {
        pattern = pattern.replace(/\/[a-zA-Z0-9-_]+\.json$/, '/{page}.json');
      }
      
      return pattern;
    } catch (e) {
      return null;
    }
  }

  analyzeDataStructure(data) {
    const structure = {
      type: Array.isArray(data) ? 'array' : typeof data,
      keys: [],
      listingsFound: false,
      sampleListingKeys: []
    };
    
    if (typeof data === 'object' && data !== null) {
      structure.keys = Object.keys(data);
      
      // Look for listings arrays
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          const firstItem = value[0];
          if (firstItem && typeof firstItem === 'object') {
            // Check if this looks like listings data
            const hasListingFields = 
              firstItem.id || firstItem.title || firstItem.price || 
              firstItem.listing_id || firstItem.name || firstItem.url;
            
            if (hasListingFields) {
              structure.listingsFound = true;
              structure.listingsKey = key;
              structure.listingsCount = value.length;
              structure.sampleListingKeys = Object.keys(firstItem);
            }
          }
        }
      });
    }
    
    return structure;
  }

  extractSampleData(data) {
    if (!data || typeof data !== 'object') return null;
    
    // Look for listings in the data
    let listings = null;
    
    if (Array.isArray(data)) {
      listings = data;
    } else {
      // Search for listings array in object
      const possibleKeys = ['listings', 'data', 'results', 'items', 'properties', 'websites'];
      
      for (const key of possibleKeys) {
        if (data[key] && Array.isArray(data[key]) && data[key].length > 0) {
          listings = data[key];
          break;
        }
      }
    }
    
    if (listings && listings.length > 0) {
      // Return first listing as sample
      return {
        totalCount: listings.length,
        firstListing: listings[0],
        fields: Object.keys(listings[0] || {})
      };
    }
    
    return null;
  }

  async analyzeAPIPatterns() {
    console.log('\n🧠 ANALYZING FLIPPA API PATTERNS...');
    
    // Find the main listings API
    const listingsAPIs = this.apiCalls.filter(call => 
      call.url.includes('listings') || 
      call.url.includes('search') ||
      call.url.includes('api') ||
      call.url.includes('graphql')
    );
    
    console.log('\n📡 Discovered API Endpoints:');
    this.uniqueEndpoints.forEach((endpoint, index) => {
      console.log(`   ${index + 1}. ${endpoint}`);
    });
    
    // Analyze successful data responses
    const successfulAPIs = this.dataPatterns.filter(pattern => pattern.dataStructure.listingsFound);
    
    if (successfulAPIs.length > 0) {
      console.log('\n✅ APIs with Listings Data:');
      successfulAPIs.forEach((api, index) => {
        console.log(`\n--- Listings API ${index + 1} ---`);
        console.log(`   Endpoint: ${api.endpoint}`);
        console.log(`   URL: ${api.url}`);
        console.log(`   Listings Count: ${api.dataStructure.listingsCount}`);
        console.log(`   Listings Key: "${api.dataStructure.listingsKey}"`);
        console.log(`   Fields (${api.dataStructure.sampleListingKeys.length}):`, 
          api.dataStructure.sampleListingKeys.slice(0, 10).join(', '));
        
        if (api.sampleData && api.sampleData.firstListing) {
          console.log('\n   Sample Listing:');
          const sample = api.sampleData.firstListing;
          console.log(`     - ID: ${sample.id || sample.listing_id || 'N/A'}`);
          console.log(`     - Title: ${sample.title || sample.name || sample.property_name || 'N/A'}`);
          console.log(`     - Price: ${sample.price || sample.asking_price || 'N/A'}`);
          console.log(`     - URL: ${sample.url || sample.listing_url || 'N/A'}`);
        }
      });
    }
    
    // GraphQL analysis
    const graphqlAPIs = this.apiCalls.filter(call => call.url.includes('graphql'));
    if (graphqlAPIs.length > 0) {
      console.log('\n🔷 GraphQL APIs Found:');
      graphqlAPIs.forEach((api, index) => {
        console.log(`   ${index + 1}. ${api.url}`);
        if (api.postData) {
          try {
            const query = JSON.parse(api.postData);
            console.log(`      Query: ${query.operationName || 'Unknown'}`);
          } catch (e) {}
        }
      });
    }
    
    // Save analysis results
    const analysisResult = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAPICalls: this.apiCalls.length,
        uniqueEndpoints: Array.from(this.uniqueEndpoints),
        successfulDataResponses: this.dataPatterns.length,
        listingsAPIsFound: successfulAPIs.length
      },
      apiCalls: this.apiCalls,
      dataPatterns: this.dataPatterns,
      recommendations: this.generateRecommendations()
    };
    
    await fs.writeFile(
      'data/flippa-api-analysis.json', 
      JSON.stringify(analysisResult, null, 2)
    );
    
    console.log('\n💾 Analysis saved to: data/flippa-api-analysis.json');
  }

  generateRecommendations() {
    const hasListingsAPI = this.dataPatterns.some(p => p.dataStructure.listingsFound);
    const hasGraphQL = this.apiCalls.some(call => call.url.includes('graphql'));
    const hasNextJS = this.dataPatterns.some(p => p.url.includes('_next/data'));
    
    return {
      extractionStrategy: hasListingsAPI ? 
        'Use discovered API endpoints for direct data extraction' : 
        'Implement advanced DOM parsing with multiple fallback strategies',
      
      apiEndpoints: Array.from(this.uniqueEndpoints),
      
      technologyStack: {
        graphql: hasGraphQL,
        nextjs: hasNextJS,
        spa: true
      },
      
      dataFields: hasListingsAPI ? 
        'Extract all fields from API response for Apify-level completeness' :
        'Target 75+ fields through comprehensive DOM analysis',
      
      qualityTarget: '100% extraction rate for all critical fields',
      
      implementationSteps: [
        'Use discovered API endpoints if available',
        'Implement GraphQL query replication if GraphQL is used',
        'Create comprehensive field mapping based on discovered structure',
        'Add fallback DOM parsing for any missing fields',
        'Validate against Apify dataset structure'
      ]
    };
  }
}

// Execute inspection
async function main() {
  console.log('🚀 Starting Flippa API Inspection');
  console.log('🎯 Goal: Achieve Apify-level data extraction');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const inspector = new FlippaAPIInspector();
  await inspector.inspectFlippaAPIs();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { FlippaAPIInspector };