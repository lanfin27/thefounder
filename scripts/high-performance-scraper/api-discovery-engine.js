// scripts/high-performance-scraper/api-discovery-engine.js
// Advanced API Discovery Engine for High-Performance Scraping

const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class APIDiscoveryEngine {
  constructor() {
    this.discoveredEndpoints = new Map();
    this.apiPatterns = {
      rest: [
        /api\/v\d+\/listings/,
        /api\/search/,
        /api\/businesses/,
        /graphql/,
        /query/,
        /data\/listings/,
        /listings\.json/,
        /search\.json/
      ],
      graphql: [
        /graphql/,
        /gql/,
        /query/
      ]
    };
    this.successfulAPIs = [];
    this.browser = null;
  }

  async discoverAPIs(targetUrl) {
    console.log('🔍 Starting Advanced API Discovery Engine...');
    console.log(`🎯 Target: ${targetUrl}\n`);

    try {
      // Phase 1: Network Interception Discovery
      const networkAPIs = await this.discoverViaNetworkInterception(targetUrl);
      
      // Phase 2: JavaScript State Analysis
      const stateAPIs = await this.analyzeJavaScriptState(targetUrl);
      
      // Phase 3: Source Code Analysis
      const sourceAPIs = await this.analyzeSourceCode(targetUrl);
      
      // Phase 4: GraphQL Introspection
      const graphqlAPIs = await this.performGraphQLIntrospection(targetUrl);
      
      // Phase 5: Test Discovered Endpoints
      await this.testDiscoveredEndpoints();
      
      return this.generateDiscoveryReport();
    } catch (error) {
      console.error('API Discovery failed:', error);
      throw error;
    } finally {
      if (this.browser) await this.browser.close();
    }
  }

  async discoverViaNetworkInterception(targetUrl) {
    console.log('📡 Phase 1: Network Interception Discovery');
    
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const page = await this.browser.newPage();
    const interceptedRequests = [];

    // Enable request interception
    await page.setRequestInterception(true);
    
    // Intercept all network requests
    page.on('request', request => {
      const url = request.url();
      const method = request.method();
      const headers = request.headers();
      
      // Log API-like requests
      if (this.isAPIRequest(url)) {
        interceptedRequests.push({
          url,
          method,
          headers,
          timestamp: Date.now()
        });
      }
      
      request.continue();
    });

    // Intercept responses
    page.on('response', async response => {
      const url = response.url();
      const status = response.status();
      
      if (this.isAPIRequest(url) && status === 200) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            const data = await response.json();
            this.discoveredEndpoints.set(url, {
              method: response.request().method(),
              status,
              hasData: this.containsListingData(data),
              sampleData: JSON.stringify(data).substring(0, 500)
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });

    // Navigate and interact with the page
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    
    // Trigger dynamic content loading
    await this.triggerDynamicContent(page);
    
    console.log(`✅ Intercepted ${interceptedRequests.length} API requests`);
    return interceptedRequests;
  }

  async analyzeJavaScriptState(targetUrl) {
    console.log('\n🔧 Phase 2: JavaScript State Analysis');
    
    const page = await this.browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    
    const jsState = await page.evaluate(() => {
      const state = {
        window: {},
        localStorage: {},
        sessionStorage: {},
        globalVars: {}
      };
      
      // Extract window properties
      for (const key in window) {
        if (key.includes('api') || key.includes('config') || key.includes('endpoint')) {
          try {
            state.window[key] = window[key];
          } catch (e) {}
        }
      }
      
      // Extract localStorage
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          state.localStorage[key] = localStorage.getItem(key);
        }
      } catch (e) {}
      
      // Look for API configurations in global objects
      const checkObj = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return;
        
        for (const key in obj) {
          const value = obj[key];
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string' && (
            value.includes('/api/') || 
            value.includes('graphql') ||
            value.includes('endpoint')
          )) {
            state.globalVars[currentPath] = value;
          } else if (typeof value === 'object' && currentPath.length < 50) {
            checkObj(value, currentPath);
          }
        }
      };
      
      // Check common global objects
      ['__NEXT_DATA__', '__APP_CONFIG__', 'window.config', 'window.env'].forEach(path => {
        try {
          const obj = path.split('.').reduce((o, k) => o?.[k], window);
          if (obj) checkObj(obj, path);
        } catch (e) {}
      });
      
      return state;
    });
    
    // Extract API endpoints from state
    const apis = new Set();
    const extractAPIs = (obj) => {
      if (!obj) return;
      
      Object.values(obj).forEach(value => {
        if (typeof value === 'string' && this.isAPIEndpoint(value)) {
          apis.add(value);
        } else if (typeof value === 'object') {
          extractAPIs(value);
        }
      });
    };
    
    extractAPIs(jsState);
    console.log(`✅ Found ${apis.size} potential API endpoints in JS state`);
    
    await page.close();
    return Array.from(apis);
  }

  async analyzeSourceCode(targetUrl) {
    console.log('\n📝 Phase 3: Source Code Analysis');
    
    const page = await this.browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    
    const sources = await page.evaluate(() => {
      const scripts = Array.from(document.scripts)
        .map(s => s.src || s.innerHTML)
        .filter(s => s.length > 0);
      
      const inlineScripts = Array.from(document.scripts)
        .filter(s => !s.src && s.innerHTML)
        .map(s => s.innerHTML);
      
      return { scripts, inlineScripts };
    });
    
    // Extract API patterns from scripts
    const foundAPIs = new Set();
    const apiRegex = /["'](https?:\/\/[^"']*(?:api|graphql|query|data)[^"']*|\/api\/[^"']*)["']/g;
    
    sources.scripts.concat(sources.inlineScripts).forEach(script => {
      const matches = script.match(apiRegex) || [];
      matches.forEach(match => {
        const url = match.slice(1, -1); // Remove quotes
        if (this.isAPIEndpoint(url)) {
          foundAPIs.add(url);
        }
      });
    });
    
    console.log(`✅ Found ${foundAPIs.size} API patterns in source code`);
    
    await page.close();
    return Array.from(foundAPIs);
  }

  async performGraphQLIntrospection(targetUrl) {
    console.log('\n🔮 Phase 4: GraphQL Introspection');
    
    const potentialGraphQLEndpoints = [
      '/graphql',
      '/api/graphql',
      '/gql',
      '/api/gql',
      '/query'
    ];
    
    const baseUrl = new URL(targetUrl).origin;
    const discoveredSchemas = [];
    
    for (const endpoint of potentialGraphQLEndpoints) {
      try {
        const introspectionQuery = {
          query: `
            {
              __schema {
                types {
                  name
                  fields {
                    name
                    type {
                      name
                    }
                  }
                }
              }
            }
          `
        };
        
        const response = await axios.post(
          baseUrl + endpoint,
          introspectionQuery,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 5000
          }
        );
        
        if (response.data && response.data.data) {
          console.log(`✅ GraphQL endpoint found: ${endpoint}`);
          discoveredSchemas.push({
            endpoint: baseUrl + endpoint,
            schema: response.data.data.__schema
          });
          
          // Try to find listing-related queries
          await this.discoverGraphQLQueries(baseUrl + endpoint, response.data.data.__schema);
        }
      } catch (error) {
        // Endpoint doesn't exist or doesn't support introspection
      }
    }
    
    console.log(`✅ Discovered ${discoveredSchemas.length} GraphQL endpoints`);
    return discoveredSchemas;
  }

  async discoverGraphQLQueries(endpoint, schema) {
    // Find queries related to listings
    const listingQueries = schema.types
      .filter(type => type.name.toLowerCase().includes('listing') || 
                     type.name.toLowerCase().includes('business') ||
                     type.name.toLowerCase().includes('search'))
      .map(type => ({
        name: type.name,
        fields: type.fields?.map(f => f.name) || []
      }));
    
    if (listingQueries.length > 0) {
      this.successfulAPIs.push({
        type: 'graphql',
        endpoint,
        queries: listingQueries
      });
    }
  }

  async triggerDynamicContent(page) {
    try {
      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(2000);
      
      // Click on filters or search to trigger API calls
      const filterButtons = await page.$$('[class*="filter"], [class*="search"], button');
      for (const button of filterButtons.slice(0, 3)) {
        try {
          await button.click();
          await page.waitForTimeout(1000);
        } catch (e) {}
      }
    } catch (error) {
      // Ignore errors during interaction
    }
  }

  async testDiscoveredEndpoints() {
    console.log('\n🧪 Phase 5: Testing Discovered Endpoints');
    
    for (const [url, info] of this.discoveredEndpoints) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          },
          timeout: 5000
        });
        
        if (response.data && this.containsListingData(response.data)) {
          this.successfulAPIs.push({
            type: 'rest',
            endpoint: url,
            method: 'GET',
            sampleData: response.data
          });
          console.log(`✅ Working API found: ${url}`);
        }
      } catch (error) {
        // API test failed
      }
    }
  }

  isAPIRequest(url) {
    return this.apiPatterns.rest.some(pattern => pattern.test(url)) ||
           url.includes('/api/') ||
           url.includes('.json') ||
           (url.includes('?') && url.includes('query'));
  }

  isAPIEndpoint(url) {
    return url && (
      url.includes('/api/') ||
      url.includes('graphql') ||
      url.includes('/query') ||
      url.includes('/data/') ||
      url.endsWith('.json')
    );
  }

  containsListingData(data) {
    if (!data) return false;
    
    const dataStr = JSON.stringify(data).toLowerCase();
    const listingIndicators = [
      'listing', 'price', 'revenue', 'business',
      'title', 'description', 'category', 'profit'
    ];
    
    return listingIndicators.filter(indicator => 
      dataStr.includes(indicator)
    ).length >= 3;
  }

  async generateDiscoveryReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalEndpointsDiscovered: this.discoveredEndpoints.size,
      successfulAPIs: this.successfulAPIs.length,
      endpoints: this.successfulAPIs,
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    await fs.writeFile(
      path.join(__dirname, 'api-discovery-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📊 API Discovery Report Generated');
    console.log(`Total Endpoints Discovered: ${report.totalEndpointsDiscovered}`);
    console.log(`Working APIs Found: ${report.successfulAPIs.length}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.successfulAPIs.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Implement direct API scraping',
        impact: 'Up to 200x performance improvement',
        implementation: 'Use discovered endpoints for direct data extraction'
      });
    }
    
    if (this.successfulAPIs.some(api => api.type === 'graphql')) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Optimize GraphQL queries',
        impact: 'Reduce data transfer by 80%',
        implementation: 'Request only required fields in GraphQL queries'
      });
    }
    
    if (this.discoveredEndpoints.size > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Implement API response caching',
        impact: 'Reduce redundant requests by 60%',
        implementation: 'Cache API responses with intelligent invalidation'
      });
    }
    
    return recommendations;
  }
}

// Execute API Discovery
if (require.main === module) {
  const engine = new APIDiscoveryEngine();
  engine.discoverAPIs('https://flippa.com/search?filter[property_type][]=website')
    .then(report => {
      console.log('\n✅ API Discovery Complete!');
      console.log('Report saved to: api-discovery-report.json');
    })
    .catch(error => {
      console.error('API Discovery failed:', error);
      process.exit(1);
    });
}

module.exports = APIDiscoveryEngine;