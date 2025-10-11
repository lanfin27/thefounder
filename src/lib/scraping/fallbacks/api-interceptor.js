// API request interception and data extraction
const playwright = require('playwright');

class APIInterceptor {
  constructor() {
    // Common API endpoint patterns
    this.apiPatterns = [
      /\/api\//,
      /\/graphql/,
      /\.json(\?|$)/,
      /\/listings\//,
      /\/data\//,
      /\/search/,
      /\/filter/,
      /\/marketplace/
    ];

    // Response data structures we're looking for
    this.dataStructures = {
      price: ['price', 'askingPrice', 'amount', 'value', 'cost'],
      revenue: ['revenue', 'monthlyRevenue', 'income', 'earnings', 'sales'],
      profit: ['profit', 'netProfit', 'netIncome', 'margin'],
      title: ['title', 'name', 'businessName', 'listingTitle', 'headline'],
      multiple: ['multiple', 'valuation', 'priceMultiple'],
      traffic: ['traffic', 'visitors', 'pageviews', 'users'],
      listingId: ['id', 'listingId', 'listing_id', 'uuid']
    };

    // Track intercepted data
    this.interceptedData = [];
    this.apiEndpoints = new Set();
  }

  /**
   * Set up network interception for a page
   */
  async interceptNetworkRequests(page, targetUrl) {
    console.log('🌐 Setting up API interception...');
    this.interceptedData = [];
    this.apiEndpoints.clear();

    // Set up request interception
    await page.route('**/*', async (route, request) => {
      const url = request.url();
      const method = request.method();
      
      // Track potential API endpoints
      if (this.isAPIEndpoint(url)) {
        this.apiEndpoints.add({
          url: url,
          method: method,
          headers: request.headers()
        });
      }

      // Continue with the request
      await route.continue();
    });

    // Set up response interception
    page.on('response', async response => {
      try {
        const url = response.url();
        const status = response.status();
        
        // Only process successful API responses
        if (status >= 200 && status < 300 && this.isAPIEndpoint(url)) {
          const contentType = response.headers()['content-type'] || '';
          
          if (contentType.includes('application/json')) {
            try {
              const data = await response.json();
              console.log(`  📥 Intercepted JSON from: ${this.truncateUrl(url)}`);
              
              // Extract and store relevant data
              const extracted = this.extractDataFromResponse(data, url);
              if (Object.keys(extracted).length > 0) {
                this.interceptedData.push({
                  url: url,
                  timestamp: new Date().toISOString(),
                  data: data,
                  extracted: extracted
                });
                console.log(`  ✓ Found data: ${Object.keys(extracted).join(', ')}`);
              }
            } catch (jsonError) {
              // Not valid JSON or error parsing
            }
          }
        }
      } catch (error) {
        // Ignore errors in response handling
      }
    });

    // Navigate to the page with improved error handling
    try {
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 // Increased to 60 seconds
      });

      // Wait for common elements that indicate page is ready
      try {
        await page.waitForSelector('body', { timeout: 5000 });
        await page.waitForSelector('[class*="listing"], [class*="search"], [class*="result"], main, article', {
          timeout: 5000
        });
      } catch (e) {
        // If specific elements not found, continue anyway
        console.log('  ⚠️ Some page elements not found, continuing...');
      }

      // Wait a bit more for any lazy-loaded content
      await page.waitForTimeout(2000);
    } catch (navigationError) {
      console.error('  ❌ Navigation error:', navigationError.message);
      // Continue anyway to see if we intercepted any data before failure
    }

    // Return all intercepted data
    return this.interceptedData;
  }

  /**
   * Discover API endpoints by analyzing page scripts
   */
  async discoverAPIEndpoints(page) {
    console.log('🔍 Discovering API endpoints...');
    const endpoints = [];

    // Method 1: Extract from JavaScript
    const scriptEndpoints = await page.evaluate(() => {
      const found = [];
      
      // Look for fetch calls
      const scripts = Array.from(document.scripts);
      scripts.forEach(script => {
        const content = script.textContent || '';
        
        // Common patterns
        const patterns = [
          /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g,
          /axios\.\w+\s*\(\s*["'`]([^"'`]+)["'`]/g,
          /\$\.ajax\s*\(\s*{[^}]*url\s*:\s*["'`]([^"'`]+)["'`]/g,
          /apiUrl\s*[:=]\s*["'`]([^"'`]+)["'`]/g,
          /endpoint\s*[:=]\s*["'`]([^"'`]+)["'`]/g
        ];
        
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            if (match[1] && (match[1].includes('/api') || match[1].includes('/data'))) {
              found.push(match[1]);
            }
          }
        });
      });
      
      return [...new Set(found)];
    });

    scriptEndpoints.forEach(endpoint => {
      endpoints.push({
        url: this.resolveUrl(endpoint, page.url()),
        source: 'javascript-analysis',
        confidence: 70
      });
    });

    // Method 2: Check window object for API configurations
    const windowAPIs = await page.evaluate(() => {
      const apis = [];
      
      // Common places where API configs are stored
      const checkPaths = [
        'window.API_URL',
        'window.api',
        'window.config.api',
        'window.__INITIAL_STATE__',
        'window.env.API_URL'
      ];
      
      checkPaths.forEach(path => {
        try {
          const value = path.split('.').reduce((obj, key) => obj?.[key], window);
          if (value && typeof value === 'string' && value.includes('/')) {
            apis.push(value);
          }
        } catch (e) {
          // Path doesn't exist
        }
      });
      
      return apis;
    });

    windowAPIs.forEach(api => {
      endpoints.push({
        url: this.resolveUrl(api, page.url()),
        source: 'window-object',
        confidence: 80
      });
    });

    // Method 3: Analyze network requests made during page load
    this.apiEndpoints.forEach(endpoint => {
      endpoints.push({
        url: endpoint.url,
        source: 'network-observation',
        confidence: 90
      });
    });

    // Method 4: Check for GraphQL endpoints
    const graphqlEndpoints = await this.findGraphQLEndpoints(page);
    endpoints.push(...graphqlEndpoints);

    // Remove duplicates and return
    const unique = this.deduplicateEndpoints(endpoints);
    console.log(`  📍 Found ${unique.length} unique API endpoints`);
    
    return unique;
  }

  /**
   * Find GraphQL endpoints
   */
  async findGraphQLEndpoints(page) {
    const endpoints = [];
    
    // Check for GraphQL in network requests
    const hasGraphQL = Array.from(this.apiEndpoints).some(e => 
      e.url.includes('graphql') || e.url.includes('gql')
    );
    
    if (hasGraphQL) {
      const graphqlUrls = Array.from(this.apiEndpoints)
        .filter(e => e.url.includes('graphql') || e.url.includes('gql'))
        .map(e => ({
          url: e.url,
          source: 'graphql-detection',
          confidence: 95
        }));
      
      endpoints.push(...graphqlUrls);
    }
    
    // Check for GraphQL schema
    const hasSchema = await page.evaluate(() => {
      return !!(window.__APOLLO_CLIENT__ || window.graphql);
    });
    
    if (hasSchema) {
      console.log('  🔷 GraphQL client detected');
    }
    
    return endpoints;
  }

  /**
   * Extract data from API response
   */
  extractDataFromResponse(responseData, url) {
    const extracted = {};
    
    // Handle different response structures
    if (Array.isArray(responseData)) {
      // Array of items (likely listings)
      if (responseData.length > 0) {
        const firstItem = responseData[0];
        this.extractFromObject(firstItem, extracted);
      }
    } else if (typeof responseData === 'object' && responseData !== null) {
      // Single object or nested structure
      this.extractFromObject(responseData, extracted);
      
      // Check common wrapper properties
      const wrappers = ['data', 'result', 'listing', 'payload', 'body'];
      for (const wrapper of wrappers) {
        if (responseData[wrapper]) {
          this.extractFromObject(responseData[wrapper], extracted);
        }
      }
    }
    
    return extracted;
  }

  /**
   * Extract data from object recursively
   */
  extractFromObject(obj, extracted, depth = 0) {
    if (depth > 5 || !obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check each data type
      for (const [dataType, patterns] of Object.entries(this.dataStructures)) {
        for (const pattern of patterns) {
          if (lowerKey.includes(pattern.toLowerCase())) {
            // Extract based on value type
            if (typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))) {
              extracted[dataType] = {
                value: typeof value === 'string' ? parseFloat(value) : value,
                key: key,
                confidence: 90
              };
            } else if (typeof value === 'string' && dataType === 'title') {
              extracted[dataType] = {
                value: value,
                key: key,
                confidence: 90
              };
            }
          }
        }
      }
      
      // Special handling for nested price objects
      if (lowerKey.includes('price') && typeof value === 'object' && value !== null) {
        if (value.amount !== undefined) {
          extracted.price = {
            value: parseFloat(value.amount),
            key: `${key}.amount`,
            confidence: 95
          };
        } else if (value.value !== undefined) {
          extracted.price = {
            value: parseFloat(value.value),
            key: `${key}.value`,
            confidence: 95
          };
        }
      }
      
      // Recurse into nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractFromObject(value, extracted, depth + 1);
      }
    }
  }

  /**
   * Intercept and modify requests to extract data
   */
  async interceptAndModifyRequests(page, modifications = {}) {
    console.log('🔧 Setting up request modification...');
    
    await page.route('**/*', async (route, request) => {
      const url = request.url();
      
      // Check if this is an API request we want to modify
      if (this.isAPIEndpoint(url)) {
        const headers = {
          ...request.headers(),
          ...modifications.headers
        };
        
        // Log the request for analysis
        console.log(`  🔄 Modifying request to: ${this.truncateUrl(url)}`);
        
        await route.continue({ headers });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Try different API parameter combinations
   */
  async tryAPIVariations(baseUrl, page) {
    const variations = [];
    const results = [];
    
    // Common parameter variations
    const parameters = [
      { limit: 100 },
      { per_page: 50 },
      { include: 'all' },
      { fields: 'all' },
      { expand: true },
      { full: true },
      { detailed: true }
    ];
    
    for (const params of parameters) {
      const url = this.buildUrlWithParams(baseUrl, params);
      variations.push(url);
    }
    
    // Try each variation
    for (const url of variations) {
      try {
        console.log(`  🔄 Trying API variation: ${this.truncateUrl(url)}`);
        
        const response = await page.evaluate(async (url) => {
          try {
            const response = await fetch(url);
            const data = await response.json();
            return { success: true, data };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }, url);
        
        if (response.success) {
          const extracted = this.extractDataFromResponse(response.data, url);
          if (Object.keys(extracted).length > 0) {
            results.push({
              url: url,
              extracted: extracted,
              confidence: 70
            });
          }
        }
      } catch (error) {
        // Continue with next variation
      }
    }
    
    return results;
  }

  /**
   * Analyze WebSocket connections for real-time data
   */
  async interceptWebSockets(page) {
    console.log('🔌 Monitoring WebSocket connections...');
    const wsData = [];
    
    page.on('websocket', ws => {
      console.log(`  📡 WebSocket connected: ${ws.url()}`);
      
      ws.on('framereceived', event => {
        try {
          const data = JSON.parse(event.payload);
          const extracted = this.extractDataFromResponse(data, ws.url());
          
          if (Object.keys(extracted).length > 0) {
            wsData.push({
              url: ws.url(),
              type: 'websocket',
              extracted: extracted,
              timestamp: new Date().toISOString()
            });
            console.log(`  ✓ WebSocket data: ${Object.keys(extracted).join(', ')}`);
          }
        } catch (error) {
          // Not JSON or parsing error
        }
      });
    });
    
    return wsData;
  }

  /**
   * Helper methods
   */
  isAPIEndpoint(url) {
    // Check against patterns
    for (const pattern of this.apiPatterns) {
      if (pattern.test(url)) return true;
    }
    
    // Check for JSON responses
    if (url.includes('.json')) return true;
    
    // Check for API-like paths
    const apiIndicators = ['api', 'data', 'graphql', 'rest', 'v1', 'v2'];
    const urlLower = url.toLowerCase();
    
    return apiIndicators.some(indicator => urlLower.includes(`/${indicator}/`));
  }

  truncateUrl(url) {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname + parsed.search;
      return path.length > 50 ? path.substring(0, 50) + '...' : path;
    } catch {
      return url.length > 50 ? url.substring(0, 50) + '...' : url;
    }
  }

  resolveUrl(endpoint, baseUrl) {
    try {
      // Already absolute URL
      if (endpoint.startsWith('http')) {
        return endpoint;
      }
      
      // Relative URL
      const base = new URL(baseUrl);
      return new URL(endpoint, base.origin).href;
    } catch {
      return endpoint;
    }
  }

  buildUrlWithParams(baseUrl, params) {
    try {
      const url = new URL(baseUrl);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return url.href;
    } catch {
      return baseUrl;
    }
  }

  deduplicateEndpoints(endpoints) {
    const seen = new Map();
    
    endpoints.forEach(endpoint => {
      const existing = seen.get(endpoint.url);
      if (!existing || endpoint.confidence > existing.confidence) {
        seen.set(endpoint.url, endpoint);
      }
    });
    
    return Array.from(seen.values());
  }

  /**
   * Extract API calls from browser's fetch history
   */
  async extractFromFetchHistory(page) {
    return await page.evaluate(() => {
      const calls = [];
      
      // Override fetch to capture calls
      const originalFetch = window.fetch;
      const capturedCalls = [];
      
      window.fetch = function(...args) {
        capturedCalls.push({
          url: args[0],
          options: args[1] || {},
          timestamp: new Date().toISOString()
        });
        return originalFetch.apply(this, args);
      };
      
      // Wait a bit and restore
      setTimeout(() => {
        window.fetch = originalFetch;
      }, 5000);
      
      return capturedCalls;
    });
  }

  /**
   * Get all intercepted data
   */
  getInterceptedData() {
    return this.interceptedData;
  }

  /**
   * Get discovered API endpoints
   */
  getDiscoveredEndpoints() {
    return Array.from(this.apiEndpoints);
  }

  /**
   * Clear intercepted data
   */
  clearData() {
    this.interceptedData = [];
    this.apiEndpoints.clear();
  }
}

module.exports = APIInterceptor;