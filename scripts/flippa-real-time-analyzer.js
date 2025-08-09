// scripts/flippa-real-time-analyzer.js
// Comprehensive Real-Time Analysis of Flippa.com Structure

const puppeteer = require('puppeteer');
const axios = require('axios');
const { performance } = require('perf_hooks');

class FlippaRealTimeAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      urls: {},
      selectors: {},
      javascript: {},
      api: {},
      issues: [],
      recommendations: []
    };
  }

  async analyze() {
    console.log('🔍 FLIPPA.COM REAL-TIME STRUCTURE ANALYSIS');
    console.log('==========================================\n');
    
    try {
      // Step 1: URL Structure Analysis
      await this.analyzeURLStructure();
      
      // Step 2: Page Loading Analysis
      await this.analyzePageLoading();
      
      // Step 3: CSS Selector Analysis
      await this.analyzeCSSSelectors();
      
      // Step 4: JavaScript Loading Patterns
      await this.analyzeJavaScriptPatterns();
      
      // Step 5: API Endpoint Discovery
      await this.analyzeAPIEndpoints();
      
      // Step 6: Common Issues Detection
      await this.detectCommonIssues();
      
      // Generate report
      this.generateReport();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      this.results.issues.push({
        type: 'critical',
        message: error.message,
        stack: error.stack
      });
      return this.results;
    }
  }

  async analyzeURLStructure() {
    console.log('📍 Step 1: Analyzing URL Structure...\n');
    
    const urlTests = [
      {
        name: 'Homepage',
        url: 'https://flippa.com',
        expectedStatus: 200
      },
      {
        name: 'Search Page (Websites)',
        url: 'https://flippa.com/search?filter[property_type][]=website',
        expectedStatus: 200
      },
      {
        name: 'Businesses Search',
        url: 'https://flippa.com/businesses',
        expectedStatus: 200
      },
      {
        name: 'Websites for Sale',
        url: 'https://flippa.com/websites-for-sale',
        expectedStatus: 200
      },
      {
        name: 'Sample Listing',
        url: 'https://flippa.com/11591883-technology',
        expectedStatus: 200
      }
    ];
    
    for (const test of urlTests) {
      try {
        const startTime = performance.now();
        const response = await axios.get(test.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          maxRedirects: 5,
          validateStatus: () => true
        });
        
        const responseTime = performance.now() - startTime;
        
        this.results.urls[test.name] = {
          url: test.url,
          status: response.status,
          responseTime: Math.round(responseTime),
          redirected: response.request.res.responseUrl !== test.url,
          finalUrl: response.request.res.responseUrl,
          headers: response.headers,
          success: response.status === test.expectedStatus
        };
        
        console.log(`✅ ${test.name}: ${response.status} (${Math.round(responseTime)}ms)`);
        
        if (response.status !== test.expectedStatus) {
          this.results.issues.push({
            type: 'url',
            severity: 'high',
            message: `${test.name} returned unexpected status ${response.status}`
          });
        }
        
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.results.urls[test.name] = {
          url: test.url,
          error: error.message,
          success: false
        };
      }
    }
  }

  async analyzePageLoading() {
    console.log('\n🌐 Step 2: Analyzing Page Loading...\n');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Track network requests
      const requests = [];
      const responses = [];
      
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
          timestamp: Date.now()
        });
      });
      
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          timestamp: Date.now()
        });
      });
      
      // Navigate to search page
      console.log('Loading Flippa search page...');
      const startTime = performance.now();
      
      try {
        await page.goto('https://flippa.com/search?filter[property_type][]=website', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
      } catch (navError) {
        console.log('⚠️ Navigation timeout, continuing with analysis...');
      }
      
      const loadTime = performance.now() - startTime;
      
      // Wait for content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for various loading states
      const loadingStates = await page.evaluate(() => {
        return {
          documentReady: document.readyState,
          jqueryLoaded: typeof jQuery !== 'undefined',
          reactLoaded: typeof React !== 'undefined' || typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
          angularLoaded: typeof angular !== 'undefined',
          vueLoaded: typeof Vue !== 'undefined' || document.querySelector('#app')?.__vue__,
          customFramework: Object.keys(window).filter(key => key.includes('app') || key.includes('App'))
        };
      });
      
      this.results.javascript.loadingStates = loadingStates;
      this.results.javascript.pageLoadTime = Math.round(loadTime);
      
      // Analyze network requests
      const apiRequests = requests.filter(r => 
        r.url.includes('/api/') || 
        r.url.includes('/v3/') || 
        r.url.includes('.json') ||
        r.resourceType === 'xhr' ||
        r.resourceType === 'fetch'
      );
      
      this.results.javascript.totalRequests = requests.length;
      this.results.javascript.apiRequests = apiRequests.length;
      this.results.javascript.apiEndpoints = [...new Set(apiRequests.map(r => {
        const url = new URL(r.url);
        return url.pathname;
      }))];
      
      console.log(`✅ Page loaded in ${Math.round(loadTime)}ms`);
      console.log(`   Total requests: ${requests.length}`);
      console.log(`   API requests: ${apiRequests.length}`);
      console.log(`   Framework detected: ${loadingStates.reactLoaded ? 'React' : loadingStates.vueLoaded ? 'Vue' : 'Unknown'}`);
      
      // Save page state
      this.browser = browser;
      this.page = page;
      
    } catch (error) {
      console.error('❌ Page loading error:', error.message);
      this.results.issues.push({
        type: 'loading',
        severity: 'critical',
        message: `Page loading failed: ${error.message}`
      });
      await browser.close();
    }
  }

  async analyzeCSSSelectors() {
    console.log('\n🎯 Step 3: Analyzing CSS Selectors...\n');
    
    if (!this.page) {
      console.log('⚠️ Skipping selector analysis - page not loaded');
      return;
    }
    
    try {
      // Test various selector patterns
      const selectorTests = [
        // Listing cards
        { name: 'Listing Cards', selectors: [
          '[data-testid="listing-card"]',
          '.listing-card',
          'div[class*="ListingCard"]',
          'div[class*="listing-card"]',
          'article[class*="listing"]',
          'div[class*="sc-"][class*="listing"]',
          '.css-1ht1nxu', // Emotion CSS
          'a[href^="/"][class*="block"]'
        ]},
        
        // Titles
        { name: 'Listing Titles', selectors: [
          '[data-testid="listing-title"]',
          '.listing-title',
          'h3.title',
          'h3[class*="title"]',
          'a[href^="/"] h3',
          'div[class*="title"] > span'
        ]},
        
        // Prices
        { name: 'Prices', selectors: [
          '[data-testid="listing-price"]',
          '.listing-price',
          'span[class*="price"]',
          'div[class*="price"]',
          'span:contains("$")',
          '[class*="currency"]'
        ]},
        
        // Revenue
        { name: 'Revenue', selectors: [
          '[data-testid="listing-revenue"]',
          '.revenue',
          'span[class*="revenue"]',
          'div[class*="revenue"]',
          '[data-metric="revenue"]'
        ]},
        
        // Categories
        { name: 'Categories', selectors: [
          '[data-testid="listing-category"]',
          '.category',
          'span[class*="category"]',
          'div[class*="category"]',
          '[class*="badge"]'
        ]}
      ];
      
      const workingSelectors = {};
      
      for (const test of selectorTests) {
        console.log(`Testing ${test.name}...`);
        
        for (const selector of test.selectors) {
          try {
            const elements = await this.page.$$(selector);
            if (elements.length > 0) {
              const count = elements.length;
              const sampleText = await elements[0].evaluate(el => el.textContent?.trim().substring(0, 50));
              
              if (!workingSelectors[test.name]) {
                workingSelectors[test.name] = [];
              }
              
              workingSelectors[test.name].push({
                selector,
                count,
                sampleText
              });
              
              console.log(`  ✅ "${selector}" - Found ${count} elements`);
            }
          } catch (error) {
            // Selector failed, continue
          }
        }
        
        if (!workingSelectors[test.name] || workingSelectors[test.name].length === 0) {
          console.log(`  ❌ No working selectors found for ${test.name}`);
          this.results.issues.push({
            type: 'selector',
            severity: 'high',
            message: `No working selectors for ${test.name}`
          });
        }
      }
      
      this.results.selectors = workingSelectors;
      
      // Check for dynamic content loading
      console.log('\n🔄 Checking for dynamic content...');
      
      const isDynamic = await this.page.evaluate(() => {
        const initialHTML = document.body.innerHTML;
        return new Promise(resolve => {
          setTimeout(() => {
            const currentHTML = document.body.innerHTML;
            resolve({
              isDynamic: initialHTML !== currentHTML,
              hasInfiniteScroll: window.IntersectionObserver && document.querySelector('[data-infinite-scroll]'),
              hasLazyLoad: document.querySelectorAll('[data-lazy]').length > 0
            });
          }, 2000);
        });
      });
      
      this.results.javascript.dynamicContent = isDynamic;
      
    } catch (error) {
      console.error('❌ Selector analysis error:', error.message);
      this.results.issues.push({
        type: 'selector',
        severity: 'high',
        message: `Selector analysis failed: ${error.message}`
      });
    }
  }

  async analyzeJavaScriptPatterns() {
    console.log('\n📜 Step 4: Analyzing JavaScript Patterns...\n');
    
    if (!this.page) {
      console.log('⚠️ Skipping JavaScript analysis - page not loaded');
      return;
    }
    
    try {
      const jsAnalysis = await this.page.evaluate(() => {
        const analysis = {
          globalVariables: [],
          dataStores: {},
          apiPatterns: [],
          eventListeners: []
        };
        
        // Check for global variables that might contain data
        const interestingGlobals = Object.keys(window).filter(key => {
          return (
            key.includes('data') ||
            key.includes('Data') ||
            key.includes('store') ||
            key.includes('Store') ||
            key.includes('state') ||
            key.includes('State') ||
            key.includes('config') ||
            key.includes('Config') ||
            key.includes('flippa') ||
            key.includes('Flippa') ||
            key.includes('__')
          ) && typeof window[key] === 'object';
        });
        
        analysis.globalVariables = interestingGlobals;
        
        // Check for React/Redux stores
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          analysis.dataStores.react = true;
          
          // Try to find Redux store
          const reduxStore = window.store || window.__store__ || window.reduxStore;
          if (reduxStore && reduxStore.getState) {
            try {
              analysis.dataStores.reduxState = Object.keys(reduxStore.getState());
            } catch (e) {}
          }
        }
        
        // Check for data in window
        if (window.__INITIAL_STATE__) {
          analysis.dataStores.initialState = Object.keys(window.__INITIAL_STATE__);
        }
        
        // Check localStorage
        analysis.dataStores.localStorage = Object.keys(localStorage);
        
        // Check for API patterns in scripts
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerHTML);
        const apiPatterns = scripts.join(' ').match(/\/api\/[^\s"']+/g) || [];
        analysis.apiPatterns = [...new Set(apiPatterns)];
        
        // Check for AJAX libraries
        analysis.ajaxLibraries = {
          jquery: typeof $ !== 'undefined' && $.ajax,
          axios: typeof axios !== 'undefined',
          fetch: typeof fetch !== 'undefined'
        };
        
        return analysis;
      });
      
      this.results.javascript.patterns = jsAnalysis;
      
      console.log('✅ JavaScript analysis complete');
      console.log(`   Global variables: ${jsAnalysis.globalVariables.length}`);
      console.log(`   API patterns found: ${jsAnalysis.apiPatterns.length}`);
      console.log(`   AJAX libraries:`, Object.keys(jsAnalysis.ajaxLibraries).filter(k => jsAnalysis.ajaxLibraries[k]).join(', '));
      
    } catch (error) {
      console.error('❌ JavaScript analysis error:', error.message);
    }
  }

  async analyzeAPIEndpoints() {
    console.log('\n🔌 Step 5: Analyzing API Endpoints...\n');
    
    // Test known and discovered endpoints
    const endpoints = [
      // Known endpoints
      { path: '/v3/listings', method: 'GET', params: { 'page[size]': 10 } },
      { path: '/api/v3/listings', method: 'GET', params: { 'page[size]': 10 } },
      { path: '/api/listings', method: 'GET', params: { limit: 10 } },
      { path: '/listings.json', method: 'GET', params: {} },
      
      // GraphQL
      { path: '/graphql', method: 'POST', data: { query: '{ listings { id title } }' } },
      { path: '/api/graphql', method: 'POST', data: { query: '{ listings { id title } }' } }
    ];
    
    // Add discovered endpoints
    if (this.results.javascript.apiEndpoints) {
      this.results.javascript.apiEndpoints.forEach(endpoint => {
        if (!endpoints.find(e => e.path === endpoint)) {
          endpoints.push({ path: endpoint, method: 'GET', params: {} });
        }
      });
    }
    
    const workingEndpoints = [];
    
    for (const endpoint of endpoints) {
      try {
        const url = `https://flippa.com${endpoint.path}`;
        const config = {
          method: endpoint.method,
          url,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 5000,
          validateStatus: () => true
        };
        
        if (endpoint.params) config.params = endpoint.params;
        if (endpoint.data) config.data = endpoint.data;
        
        const response = await axios(config);
        
        const result = {
          path: endpoint.path,
          method: endpoint.method,
          status: response.status,
          hasData: false,
          dataType: null,
          sampleData: null
        };
        
        if (response.status === 200) {
          if (response.data) {
            result.hasData = true;
            result.dataType = Array.isArray(response.data) ? 'array' : typeof response.data;
            
            if (response.data.data) {
              result.dataStructure = 'wrapped';
              result.sampleData = response.data.data[0] || response.data.data;
            } else {
              result.dataStructure = 'direct';
              result.sampleData = Array.isArray(response.data) ? response.data[0] : response.data;
            }
          }
          
          workingEndpoints.push(result);
          console.log(`✅ ${endpoint.path} - Status ${response.status}`);
        } else {
          console.log(`❌ ${endpoint.path} - Status ${response.status}`);
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint.path} - ${error.message}`);
      }
    }
    
    this.results.api.endpoints = workingEndpoints;
    this.results.api.workingCount = workingEndpoints.length;
  }

  async detectCommonIssues() {
    console.log('\n⚠️ Step 6: Detecting Common Issues...\n');
    
    // Check for Cloudflare protection
    if (this.page) {
      const hasCloudflare = await this.page.evaluate(() => {
        return document.body.innerHTML.includes('Cloudflare') || 
               window.location.hostname.includes('cloudflare') ||
               document.querySelector('script[src*="cloudflare"]') !== null;
      });
      
      if (hasCloudflare) {
        this.results.issues.push({
          type: 'protection',
          severity: 'high',
          message: 'Cloudflare protection detected'
        });
      }
    }
    
    // Check for rate limiting headers
    if (this.results.urls['Search Page (Websites)']?.headers) {
      const headers = this.results.urls['Search Page (Websites)'].headers;
      if (headers['x-ratelimit-limit'] || headers['retry-after']) {
        this.results.issues.push({
          type: 'ratelimit',
          severity: 'medium',
          message: 'Rate limiting headers detected'
        });
      }
    }
    
    // Check for authentication requirements
    const needsAuth = this.results.api.endpoints?.some(e => e.status === 401 || e.status === 403);
    if (needsAuth) {
      this.results.issues.push({
        type: 'authentication',
        severity: 'medium',
        message: 'Some API endpoints require authentication'
      });
    }
    
    // Check for dynamic content issues
    if (this.results.javascript.dynamicContent?.isDynamic) {
      this.results.issues.push({
        type: 'dynamic',
        severity: 'low',
        message: 'Page uses dynamic content loading'
      });
    }
    
    console.log(`Found ${this.results.issues.length} potential issues`);
  }

  generateReport() {
    console.log('\n📊 ANALYSIS REPORT');
    console.log('==================\n');
    
    // Generate recommendations based on findings
    if (this.results.api.workingCount > 0) {
      this.results.recommendations.push({
        priority: 'high',
        action: 'Use direct API endpoints for fastest extraction',
        details: `Found ${this.results.api.workingCount} working API endpoints`
      });
    }
    
    if (Object.keys(this.results.selectors).length < 3) {
      this.results.recommendations.push({
        priority: 'high',
        action: 'Update CSS selectors - current selectors may be outdated',
        details: 'Many expected selectors are not working'
      });
    }
    
    if (this.results.javascript.loadingStates?.reactLoaded) {
      this.results.recommendations.push({
        priority: 'medium',
        action: 'Implement React-aware scraping with proper wait conditions',
        details: 'Site uses React - ensure dynamic content is loaded'
      });
    }
    
    if (this.results.issues.some(i => i.type === 'protection')) {
      this.results.recommendations.push({
        priority: 'high',
        action: 'Implement anti-bot detection measures',
        details: 'Use residential proxies and browser fingerprint randomization'
      });
    }
    
    // Summary
    console.log('🔍 Key Findings:');
    console.log(`   Working URLs: ${Object.values(this.results.urls).filter(u => u.success).length}/${Object.keys(this.results.urls).length}`);
    console.log(`   Working selectors: ${Object.keys(this.results.selectors).length} categories`);
    console.log(`   API endpoints: ${this.results.api.workingCount || 0} working`);
    console.log(`   Issues found: ${this.results.issues.length}`);
    console.log(`   Page load time: ${this.results.javascript.pageLoadTime}ms`);
    
    console.log('\n📋 Top Recommendations:');
    this.results.recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`   ${i + 1}. [${rec.priority}] ${rec.action}`);
    });
    
    // Clean up
    if (this.browser) {
      this.browser.close();
    }
  }
}

// Export and run
module.exports = FlippaRealTimeAnalyzer;

if (require.main === module) {
  const analyzer = new FlippaRealTimeAnalyzer();
  analyzer.analyze()
    .then(results => {
      // Save detailed results
      const fs = require('fs');
      fs.writeFileSync(
        'flippa-analysis-results.json',
        JSON.stringify(results, null, 2)
      );
      console.log('\n💾 Detailed results saved to flippa-analysis-results.json');
    })
    .catch(console.error);
}