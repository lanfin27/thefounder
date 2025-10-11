// Master Adaptive Scraper - Orchestrates all detection and learning strategies
const cheerio = require('cheerio');
const axios = require('axios');
const playwright = require('playwright');

// Import all strategies
const SemanticDetector = require('./strategies/semantic-detector');
const VisualDetector = require('./strategies/visual-detector');
const ContextDetector = require('./strategies/context-detector');

// Import learning systems
const PatternMemory = require('./learning/pattern-memory');
const SelectorGenerator = require('./learning/selector-generator');

// Import fallback systems
const SelectorCascade = require('./fallbacks/selector-cascade');
const ContentMiner = require('./fallbacks/content-miner');
const APIInterceptor = require('./fallbacks/api-interceptor');

// Import monitoring and healing
const HealthMonitor = require('./monitoring/health-monitor');
const AutoHealer = require('./healing/auto-healer');

// Import advanced features
const PatternLearner = require('./ml/pattern-learner');
const AdaptationEngine = require('./realtime/adaptation-engine');

class AdaptiveScraper {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: 60000, // Increased to 60 seconds for Flippa
      retryLimit: 3,
      adaptationLevel: 'aggressive', // 'conservative', 'moderate', 'aggressive'
      learningEnabled: true,
      waitUntil: 'domcontentloaded', // Changed from networkidle for faster loading
      ...options
    };

    // Initialize all components
    this.patternMemory = new PatternMemory();
    this.selectorGenerator = new SelectorGenerator();
    this.selectorCascade = new SelectorCascade();
    this.contentMiner = new ContentMiner();
    this.apiInterceptor = new APIInterceptor();
    this.healthMonitor = new HealthMonitor();
    this.autoHealer = new AutoHealer();
    this.patternLearner = new PatternLearner();
    this.adaptationEngine = new AdaptationEngine();

    // Performance tracking
    this.stats = {
      totalScrapes: 0,
      successfulScrapes: 0,
      adaptationTriggered: 0,
      strategiesUsed: {},
      averageConfidence: 0
    };

    // Browser instance
    this.browser = null;
  }

  /**
   * Main scraping method with full adaptation
   */
  async scrapeWithAdaptation(url, targetData) {
    console.log(`🎯 Adaptive Scraping: ${url}`);
    console.log(`📋 Target Data: ${Object.keys(targetData).join(', ')}`);
    
    this.stats.totalScrapes++;
    const startTime = Date.now();
    const results = {};
    
    try {
      // Phase 1: Try known successful patterns
      console.log('\n📊 Phase 1: Checking known patterns...');
      const knownResults = await this.tryKnownPatterns(url, targetData);
      
      if (this.isCompleteResult(knownResults, targetData)) {
        console.log('✅ Known patterns successful!');
        await this.recordSuccess(knownResults, 'known-patterns');
        return this.finalizeResults(knownResults, startTime);
      }
      
      Object.assign(results, knownResults);
      
      // Phase 2: Deploy detection strategies
      console.log('\n🔍 Phase 2: Deploying detection strategies...');
      const detectionResults = await this.deployCascadeStrategies(url, targetData, results);
      
      if (this.isCompleteResult(detectionResults, targetData)) {
        console.log('✅ Detection strategies successful!');
        await this.recordSuccess(detectionResults, 'detection-strategies');
        return this.finalizeResults(detectionResults, startTime);
      }
      
      Object.assign(results, detectionResults);
      
      // Phase 3: Content mining fallback
      console.log('\n⛏️ Phase 3: Attempting content mining...');
      const minedResults = await this.executeContentMining(url, targetData, results);
      
      if (this.isCompleteResult(minedResults, targetData)) {
        console.log('✅ Content mining successful!');
        await this.recordSuccess(minedResults, 'content-mining');
        return this.finalizeResults(minedResults, startTime);
      }
      
      Object.assign(results, minedResults);
      
      // Phase 4: API interception
      console.log('\n🌐 Phase 4: Attempting API interception...');
      const apiResults = await this.interceptAPICalls(url, targetData, results);
      
      if (this.isCompleteResult(apiResults, targetData)) {
        console.log('✅ API interception successful!');
        await this.recordSuccess(apiResults, 'api-interception');
        return this.finalizeResults(apiResults, startTime);
      }
      
      Object.assign(results, apiResults);
      
      // Phase 5: Adaptive learning and retry
      if (this.options.adaptationLevel !== 'conservative') {
        console.log('\n🧠 Phase 5: Triggering adaptive learning...');
        const adaptedResults = await this.adaptToChanges(url, targetData, results);
        Object.assign(results, adaptedResults);
      }
      
      // Final attempt with all collected data
      if (Object.keys(results).length > 0) {
        console.log('\n📦 Partial results collected');
        await this.recordPartialSuccess(results);
        return this.finalizeResults(results, startTime);
      }
      
      // Complete failure - report for analysis
      console.log('\n❌ All strategies failed');
      await this.reportFailureForAnalysis(url, targetData);
      throw new Error('Unable to extract required data despite all adaptation attempts');
      
    } catch (error) {
      console.error('Scraping error:', error.message);
      this.stats.successfulScrapes--;
      throw error;
    } finally {
      // Cleanup
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  /**
   * Phase 1: Try known successful patterns
   */
  async tryKnownPatterns(url, targetData) {
    const results = {};
    
    for (const dataType of Object.keys(targetData)) {
      const suggestion = await this.patternMemory.suggestNextAttempt(dataType);
      
      if (suggestion && suggestion.primary) {
        console.log(`  → Trying known pattern for ${dataType}: ${suggestion.primary.selector}`);
        
        try {
          const html = await this.fetchPage(url);
          const $ = cheerio.load(html);
          const element = $(suggestion.primary.selector);
          
          if (element.length > 0) {
            const value = this.extractValue(element, dataType);
            if (value !== null) {
              results[dataType] = {
                value: value,
                text: element.text().trim(),
                selector: suggestion.primary.selector,
                confidence: suggestion.primary.confidence,
                method: 'known-pattern'
              };
              console.log(`  ✓ Found ${dataType}: ${value}`);
            }
          }
        } catch (error) {
          console.log(`  ✗ Pattern failed: ${error.message}`);
        }
      }
    }
    
    return results;
  }

  /**
   * Phase 2: Deploy cascade strategies
   */
  async deployCascadeStrategies(url, targetData, existingResults) {
    const results = { ...existingResults };
    const html = await this.fetchPageWithBrowser(url);
    const $ = cheerio.load(html);
    
    for (const dataType of Object.keys(targetData)) {
      if (results[dataType]) continue; // Skip if already found
      
      console.log(`  → Cascade strategies for ${dataType}...`);
      
      const cascadeResult = await this.selectorCascade.executeStrategy($, dataType, {
        container: this.detectListingContainer($)
      });
      
      if (cascadeResult && cascadeResult.value !== null) {
        results[dataType] = cascadeResult;
        console.log(`  ✓ Found ${dataType} via ${cascadeResult.strategy}: ${cascadeResult.value}`);
        
        // Learn from success
        if (this.options.learningEnabled && cascadeResult.selector) {
          await this.patternMemory.recordSuccessfulPattern(
            cascadeResult.selector,
            dataType,
            cascadeResult.confidence,
            { strategy: cascadeResult.strategy, url: url }
          );
        }
      }
    }
    
    return results;
  }

  /**
   * Phase 3: Execute content mining
   */
  async executeContentMining(url, targetData, existingResults) {
    const results = { ...existingResults };
    const html = await this.fetchPageWithBrowser(url);
    
    console.log('  → Mining raw content...');
    const minedData = await this.contentMiner.extractFromRawText(html);
    
    for (const dataType of Object.keys(targetData)) {
      if (results[dataType]) continue;
      
      if (minedData[dataType]) {
        results[dataType] = minedData[dataType];
        console.log(`  ✓ Mined ${dataType}: ${minedData[dataType].value}`);
      }
    }
    
    // Also try deep content analysis
    if (Object.keys(results).length < Object.keys(targetData).length) {
      console.log('  → Deep content analysis...');
      const deepData = await this.contentMiner.deepContentAnalysis(html);
      
      for (const dataType of Object.keys(targetData)) {
        if (!results[dataType] && deepData[dataType]) {
          results[dataType] = deepData[dataType];
          console.log(`  ✓ Deep mined ${dataType}: ${deepData[dataType].value}`);
        }
      }
    }
    
    return results;
  }

  /**
   * Phase 4: Intercept API calls
   */
  async interceptAPICalls(url, targetData, existingResults) {
    const results = { ...existingResults };
    
    if (!this.browser) {
      this.browser = await playwright.chromium.launch({
        headless: this.options.headless
      });
    }
    
    const page = await this.browser.newPage();
    
    try {
      console.log('  → Setting up API interception...');
      const apiData = await this.apiInterceptor.interceptNetworkRequests(page, url);
      
      // Extract data from API responses
      for (const dataType of Object.keys(targetData)) {
        if (results[dataType]) continue;
        
        const extracted = this.extractFromAPIData(apiData, dataType);
        if (extracted) {
          results[dataType] = {
            ...extracted,
            method: 'api-interception'
          };
          console.log(`  ✓ API data for ${dataType}: ${extracted.value}`);
        }
      }
      
      // Also check for API endpoints we can call directly
      const endpoints = await this.apiInterceptor.discoverAPIEndpoints(page);
      if (endpoints.length > 0) {
        console.log(`  → Found ${endpoints.length} API endpoints`);
        const directData = await this.callDiscoveredAPIs(endpoints, targetData);
        Object.assign(results, directData);
      }
      
    } finally {
      await page.close();
    }
    
    return results;
  }

  /**
   * Phase 5: Adapt to changes
   */
  async adaptToChanges(url, targetData, currentResults) {
    console.log('  → Analyzing page structure changes...');
    this.stats.adaptationTriggered++;
    
    const results = { ...currentResults };
    const html = await this.fetchPageWithBrowser(url);
    const $ = cheerio.load(html);
    
    // Use pattern learner to predict new selectors
    const predictions = await this.patternLearner.predictLikelySelectors($, targetData);
    
    for (const prediction of predictions) {
      if (results[prediction.dataType]) continue;
      
      console.log(`  → Testing predicted selector for ${prediction.dataType}: ${prediction.selector}`);
      
      try {
        const element = $(prediction.selector);
        if (element.length > 0) {
          const value = this.extractValue(element, prediction.dataType);
          if (value !== null) {
            results[prediction.dataType] = {
              value: value,
              text: element.text().trim(),
              selector: prediction.selector,
              confidence: prediction.confidence,
              method: 'adaptive-prediction'
            };
            console.log(`  ✓ Prediction successful: ${value}`);
            
            // Record this new pattern
            if (this.options.learningEnabled) {
              await this.patternMemory.recordSuccessfulPattern(
                prediction.selector,
                prediction.dataType,
                prediction.confidence,
                { method: 'ml-prediction', url: url }
              );
            }
          }
        }
      } catch (error) {
        console.log(`  ✗ Prediction failed: ${error.message}`);
      }
    }
    
    // Try real-time adaptation
    const adapted = await this.adaptationEngine.adaptDuringExecution({
      url: url,
      targetData: targetData,
      currentResults: results,
      $: $
    });
    
    Object.assign(results, adapted);
    
    return results;
  }

  /**
   * Helper methods
   */
  async fetchPage(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: this.options.timeout
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch page: ${error.message}`);
    }
  }

  async fetchPageWithBrowser(url) {
    if (!this.browser) {
      this.browser = await playwright.chromium.launch({
        headless: this.options.headless
      });
    }
    
    const page = await this.browser.newPage();
    try {
      await page.goto(url, { 
        waitUntil: this.options.waitUntil || 'domcontentloaded',
        timeout: this.options.timeout 
      });
      
      // Wait for dynamic content and specific elements
      try {
        // Try to wait for common listing elements
        await page.waitForSelector('[class*="listing"], [class*="search"], [class*="result"]', {
          timeout: 5000
        }).catch(() => {});
      } catch (e) {
        // If no specific elements found, just wait a bit
        await page.waitForTimeout(2000);
      }
      
      return await page.content();
    } finally {
      await page.close();
    }
  }

  detectListingContainer($) {
    // Try to detect the main listing container
    const selectors = [
      '[class*="listing"]',
      '[class*="detail"]',
      '[class*="content"]',
      'main',
      'article'
    ];
    
    for (const selector of selectors) {
      const container = $(selector).first();
      if (container.length > 0 && container.text().length > 100) {
        return selector;
      }
    }
    
    return 'body';
  }

  extractValue(element, dataType) {
    const text = element.text().trim();
    
    switch (dataType) {
      case 'price':
      case 'revenue':
      case 'profit':
        const match = text.match(/\$?([\d,]+(?:\.\d{2})?)/);
        return match ? parseFloat(match[1].replace(/,/g, '')) : null;
        
      case 'title':
        return text.length >= 5 && text.length <= 200 ? text : null;
        
      case 'multiple':
        const multipleMatch = text.match(/([\d.]+)x?/i);
        return multipleMatch ? parseFloat(multipleMatch[1]) : null;
        
      default:
        return text;
    }
  }

  extractFromAPIData(apiData, dataType) {
    for (const response of apiData) {
      if (response.data) {
        // Look for data in common API response structures
        const paths = [
          `data.${dataType}`,
          `listing.${dataType}`,
          `result.${dataType}`,
          dataType
        ];
        
        for (const path of paths) {
          const value = this.getNestedValue(response.data, path);
          if (value !== null && value !== undefined) {
            return {
              value: value,
              text: String(value),
              confidence: 85
            };
          }
        }
      }
    }
    
    return null;
  }

  async callDiscoveredAPIs(endpoints, targetData) {
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        console.log(`  → Calling API: ${endpoint.url}`);
        const response = await axios.get(endpoint.url, {
          timeout: 5000
        });
        
        if (response.data) {
          for (const dataType of Object.keys(targetData)) {
            if (!results[dataType]) {
              const extracted = this.extractFromAPIData([response], dataType);
              if (extracted) {
                results[dataType] = {
                  ...extracted,
                  method: 'direct-api-call'
                };
              }
            }
          }
        }
      } catch (error) {
        console.log(`  ✗ API call failed: ${error.message}`);
      }
    }
    
    return results;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : null, obj
    );
  }

  isCompleteResult(results, targetData) {
    const requiredKeys = Object.keys(targetData);
    const foundKeys = Object.keys(results);
    return requiredKeys.every(key => foundKeys.includes(key));
  }

  async recordSuccess(results, method) {
    this.stats.successfulScrapes++;
    this.stats.strategiesUsed[method] = (this.stats.strategiesUsed[method] || 0) + 1;
    
    // Update pattern memory with successful patterns
    if (this.options.learningEnabled) {
      for (const [dataType, result] of Object.entries(results)) {
        if (result.selector) {
          await this.patternMemory.recordSuccessfulPattern(
            result.selector,
            dataType,
            result.confidence || 80,
            { method: method, strategy: result.strategy }
          );
        }
      }
    }
  }

  async recordPartialSuccess(results) {
    // Record what worked and what didn't
    const successRate = Object.keys(results).length / this.stats.totalScrapes;
    console.log(`  📊 Partial success rate: ${(successRate * 100).toFixed(1)}%`);
    
    // Update health monitor
    await this.healthMonitor.recordExtractionResult({
      success: false,
      partial: true,
      extracted: Object.keys(results),
      method: 'mixed'
    });
  }

  async reportFailureForAnalysis(url, targetData) {
    const failureReport = {
      url: url,
      targetData: Object.keys(targetData),
      timestamp: new Date().toISOString(),
      attemptedStrategies: Object.keys(this.stats.strategiesUsed),
      adaptationLevel: this.options.adaptationLevel
    };
    
    // Record failure for learning
    if (this.options.learningEnabled) {
      for (const dataType of Object.keys(targetData)) {
        await this.patternMemory.recordFailedPattern(
          'unknown',
          dataType,
          'Complete extraction failure',
          failureReport
        );
      }
    }
    
    // Trigger auto-healing
    await this.autoHealer.analyzeFailure(failureReport);
    
    console.log('  📋 Failure report generated for analysis');
  }

  finalizeResults(results, startTime) {
    const elapsed = Date.now() - startTime;
    
    // Calculate average confidence
    const confidences = Object.values(results)
      .map(r => r.confidence || 50)
      .filter(c => c > 0);
    
    this.stats.averageConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b) / confidences.length
      : 0;
    
    console.log(`\n✅ Scraping completed in ${elapsed}ms`);
    console.log(`📊 Average confidence: ${this.stats.averageConfidence.toFixed(1)}%`);
    console.log(`🎯 Success rate: ${((this.stats.successfulScrapes / this.stats.totalScrapes) * 100).toFixed(1)}%`);
    
    return {
      data: results,
      metadata: {
        elapsed: elapsed,
        confidence: this.stats.averageConfidence,
        strategiesUsed: Object.keys(this.stats.strategiesUsed),
        adaptationTriggered: this.stats.adaptationTriggered > 0
      }
    };
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalScrapes > 0 
        ? (this.stats.successfulScrapes / this.stats.totalScrapes * 100).toFixed(1) + '%'
        : 'N/A',
      cascadePerformance: this.selectorCascade.getPerformanceStats(),
      memoryInsights: this.patternMemory.getLearningInsights()
    };
  }

  /**
   * Manual pattern training
   */
  async trainPattern(selector, dataType, exampleValue) {
    console.log(`📚 Training pattern: ${selector} for ${dataType}`);
    
    // Validate the pattern works
    const html = await this.fetchPage(exampleValue.url);
    const $ = cheerio.load(html);
    const element = $(selector);
    
    if (element.length > 0) {
      const value = this.extractValue(element, dataType);
      if (value !== null) {
        await this.patternMemory.recordSuccessfulPattern(
          selector,
          dataType,
          90, // High confidence for manual training
          { method: 'manual-training', trainedValue: value }
        );
        console.log(`✅ Pattern trained successfully`);
        return true;
      }
    }
    
    console.log(`❌ Pattern validation failed`);
    return false;
  }

  /**
   * Force adaptation refresh
   */
  async refreshAdaptation() {
    console.log('🔄 Refreshing adaptation strategies...');
    
    // Clean up old patterns
    await this.patternMemory.cleanup(7, 30); // 7 days, 30% confidence
    
    // Recalibrate strategies
    await this.autoHealer.recalibrateStrategies();
    
    // Update ML predictions
    await this.patternLearner.retrainModels();
    
    console.log('✅ Adaptation refreshed');
  }
}

module.exports = AdaptiveScraper;