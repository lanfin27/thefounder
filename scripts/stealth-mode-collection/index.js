// index.js
// Main integration file for Stealth-Mode Data Collection Architecture

const ProxyRotationSystem = require('./proxy-rotation-system');
const HeadlessBrowserOptimizer = require('./headless-browser-optimizer');
const IntelligentDataExtractor = require('./intelligent-data-extractor');
const ErrorHandlerRecovery = require('./error-handler-recovery');
const AdaptiveLearningSystem = require('./adaptive-learning-system');

class StealthModeCollectionSystem {
  constructor(config = {}) {
    this.config = {
      maxConcurrentSessions: 10,
      proxyProviders: ['luminati', 'smartproxy', 'oxylabs', 'geosurf'],
      captchaSolving: true,
      adaptiveLearning: true,
      errorRecovery: true,
      dataValidation: true,
      ...config
    };

    // Initialize all subsystems
    this.proxySystem = new ProxyRotationSystem({
      providers: this.config.proxyProviders,
      geoDistribution: this.config.geoDistribution
    });

    this.browserOptimizer = new HeadlessBrowserOptimizer({
      captchaSolving: {
        enabled: this.config.captchaSolving
      }
    });

    this.dataExtractor = new IntelligentDataExtractor({
      extractionStrategy: 'human-like',
      semanticUnderstanding: true
    });

    this.errorHandler = new ErrorHandlerRecovery({
      learningEnabled: this.config.adaptiveLearning
    });

    this.learningSystem = new AdaptiveLearningSystem({
      learningRate: 0.1,
      persistenceEnabled: true
    });

    // Active sessions
    this.activeSessions = new Map();

    // Metrics tracking
    this.metrics = {
      sessionsCreated: 0,
      dataExtracted: 0,
      errorsRecovered: 0,
      adaptationsMade: 0,
      startTime: Date.now()
    };

    // Setup event handlers
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Error handler events
    this.errorHandler.on('detection', async (event) => {
      console.log('🚨 Detection event:', event.type);
      
      // Learn from detection
      await this.learningSystem.learnFromInteraction({
        success: false,
        url: event.context.url,
        errors: [{ type: 'detection', details: event }],
        detections: [event.type]
      });
    });

    this.errorHandler.on('fallback_needed', async (event) => {
      console.log('⚠️ Manual intervention needed:', event.error.message);
    });

    // Learning system events
    this.learningSystem.on('adaptation', async (adaptation) => {
      console.log('🔄 Applying adaptation:', adaptation.recommendations[0]?.type);
      this.metrics.adaptationsMade++;
      
      // Apply adaptations to all systems
      await this.applyAdaptations(adaptation.recommendations);
    });

    this.learningSystem.on('learning', (event) => {
      console.log('📚 Learning event:', event.errorType, '->', event.successfulStrategy);
    });
  }

  async createStealthSession(options = {}) {
    console.log('\n🥷 Creating stealth data collection session...');
    
    const sessionId = `stealth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Step 1: Get optimized proxy
      const proxy = await this.proxySystem.getNextProxy({
        type: options.proxyType || 'residential',
        country: options.targetCountry,
        preferSticky: true
      });
      
      console.log(`🌐 Proxy: ${proxy.type} - ${proxy.country} (${proxy.isp})`);
      
      // Step 2: Create optimized browser
      const { browser, context } = await this.browserOptimizer.createOptimizedBrowser({
        strategy: options.optimizationStrategy || 'balanced',
        proxy: this.proxySystem.exportProxyConfig(proxy),
        fingerprint: options.fingerprint
      });
      
      // Step 3: Create page with optimizations
      const page = await this.browserOptimizer.createOptimizedPage(context, {
        blockAds: true,
        blockTrackers: true
      });
      
      // Step 4: Create session object
      const session = {
        id: sessionId,
        browser,
        context,
        page,
        proxy,
        startTime: Date.now(),
        dataExtracted: [],
        errors: [],
        adaptations: []
      };
      
      this.activeSessions.set(sessionId, session);
      this.metrics.sessionsCreated++;
      
      console.log(`✅ Stealth session created: ${sessionId}`);
      
      return session;
      
    } catch (error) {
      console.error('Failed to create stealth session:', error.message);
      
      // Try to recover
      const recovery = await this.handleSessionCreationError(error, options);
      if (recovery.success) {
        return await this.createStealthSession(recovery.adjustedOptions);
      }
      
      throw error;
    }
  }

  async collectDataStealthily(sessionId, targetUrl, extractionConfig = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    console.log(`\n📊 Starting stealth data collection from ${targetUrl}`);
    
    const collectionStart = Date.now();
    
    try {
      // Step 1: Navigate with patience
      await this.browserOptimizer.navigateWithPatience(session.page, targetUrl, {
        waitUntil: 'networkidle',
        retries: 3
      });
      
      // Step 2: Extract data with human-like patterns
      const extractionResult = await this.dataExtractor.extractWithHumanPattern(
        session.page,
        extractionConfig.dataType || 'listing'
      );
      
      console.log(`✅ Extracted ${extractionResult.data.length} items`);
      console.log(`   Pattern used: ${extractionResult.metadata.pattern}`);
      console.log(`   Confidence: ${(extractionResult.metadata.confidence.overall * 100).toFixed(1)}%`);
      
      // Step 3: Validate and store data
      session.dataExtracted.push({
        url: targetUrl,
        timestamp: Date.now(),
        data: extractionResult.data,
        metadata: extractionResult.metadata
      });
      
      this.metrics.dataExtracted += extractionResult.data.length;
      
      // Step 4: Learn from successful extraction
      await this.learningSystem.learnFromInteraction({
        success: true,
        url: targetUrl,
        pageType: extractionConfig.dataType,
        sessionDuration: Date.now() - session.startTime,
        responseTime: Date.now() - collectionStart,
        dataQuality: extractionResult.metadata.confidence.overall,
        fingerprint: session.fingerprint,
        proxy: session.proxy,
        behaviorProfile: 'stealth'
      });
      
      return extractionResult;
      
    } catch (error) {
      console.error('❌ Data collection failed:', error.message);
      
      // Handle error with recovery system
      const handled = await this.handleCollectionError(error, session, targetUrl);
      
      if (handled.success && handled.retry) {
        // Retry with adjustments
        return await this.collectDataStealthily(sessionId, targetUrl, extractionConfig);
      }
      
      throw error;
    }
  }

  async handleCollectionError(error, session, targetUrl) {
    // Enhance error with context
    error.url = targetUrl;
    error.pageContent = await session.page.content().catch(() => '');
    
    try {
      const recovery = await this.errorHandler.handleError(error, {
        page: session.page,
        url: targetUrl,
        proxySystem: this.proxySystem,
        fingerprintSystem: this.browserOptimizer,
        behaviorEngine: this.dataExtractor,
        captchaSolver: this.browserOptimizer
      });
      
      // Apply adjustments to session
      if (recovery.adjustment) {
        session.adaptations.push({
          timestamp: Date.now(),
          type: recovery.strategy,
          adjustments: recovery.adjustment
        });
        
        // Update proxy if rotated
        if (recovery.adjustment.proxy) {
          session.proxy = recovery.adjustment.proxy;
        }
      }
      
      this.metrics.errorsRecovered++;
      
      // Learn from error recovery
      await this.learningSystem.learnFromInteraction({
        success: false,
        url: targetUrl,
        errors: [{ type: error.type || 'unknown', message: error.message }],
        recoveryStrategy: recovery.strategy,
        recovered: recovery.success
      });
      
      return {
        success: true,
        retry: recovery.strategy !== 'fallback'
      };
      
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError.message);
      session.errors.push({
        timestamp: Date.now(),
        error: error.message,
        recovery: 'failed'
      });
      
      return { success: false };
    }
  }

  async handleSessionCreationError(error, options) {
    // Try alternative proxy
    if (error.message.includes('proxy')) {
      const alternativeProxy = await this.proxySystem.getNextProxy({
        type: 'datacenter', // Try different type
        excludeBlocked: true
      });
      
      return {
        success: true,
        adjustedOptions: {
          ...options,
          proxy: alternativeProxy,
          optimizationStrategy: 'minimal'
        }
      };
    }
    
    return { success: false };
  }

  async applyAdaptations(recommendations) {
    for (const rec of recommendations) {
      switch (rec.type) {
        case 'timing':
          if (rec.action === 'adjust_delays') {
            this.dataExtractor.config.readingSpeed = rec.value;
          }
          break;
          
        case 'behavior':
          if (rec.action === 'switch_profile') {
            // Apply to future sessions
            this.config.defaultBehaviorProfile = rec.value;
          }
          break;
          
        case 'detection':
          if (rec.action === 'increase_stealth') {
            this.browserOptimizer.config.headless = true;
            this.dataExtractor.config.extractionStrategy = 'ultra-cautious';
          }
          break;
          
        case 'performance':
          if (rec.action === 'optimize_resources') {
            this.config.maxConcurrentSessions = Math.max(
              1,
              this.config.maxConcurrentSessions - 2
            );
          }
          break;
      }
    }
  }

  async runBatchCollection(urls, options = {}) {
    console.log(`\n🚀 Starting batch collection for ${urls.length} URLs`);
    
    const results = [];
    const concurrency = Math.min(
      this.config.maxConcurrentSessions,
      urls.length
    );
    
    // Process in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(urls.length / concurrency)}`);
      
      const batchPromises = batch.map(async (url) => {
        try {
          // Create session
          const session = await this.createStealthSession(options);
          
          // Collect data
          const result = await this.collectDataStealthily(
            session.id,
            url,
            options.extractionConfig
          );
          
          // Close session
          await this.closeSession(session.id);
          
          return {
            url,
            success: true,
            data: result.data,
            metadata: result.metadata
          };
          
        } catch (error) {
          console.error(`Failed to collect from ${url}:`, error.message);
          
          return {
            url,
            success: false,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Pause between batches
      if (i + concurrency < urls.length) {
        const pauseDuration = 5000 + Math.random() * 5000;
        console.log(`⏸️ Pausing ${(pauseDuration / 1000).toFixed(1)}s between batches...`);
        await new Promise(resolve => setTimeout(resolve, pauseDuration));
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`\n📊 Batch collection complete:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   🎯 Success rate: ${((successful / results.length) * 100).toFixed(1)}%`);
    
    return results;
  }

  async closeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    try {
      // Close browser
      await session.browser.close();
      
      // Update proxy stats
      if (session.proxy) {
        await this.proxySystem.handleProxyFailure(session.proxy, new Error('Session ended'));
      }
      
      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      
      console.log(`🔚 Session ${sessionId} closed`);
      
    } catch (error) {
      console.error('Error closing session:', error.message);
    }
  }

  async shutdown() {
    console.log('\n🛑 Shutting down stealth collection system...');
    
    // Close all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.closeSession(sessionId);
    }
    
    // Get final metrics
    const metrics = this.getMetrics();
    console.log('\n📊 Final metrics:', metrics);
    
    // Persist learning data
    await this.learningSystem.persistLearningData();
    
    console.log('✅ Shutdown complete');
  }

  getMetrics() {
    const runtime = (Date.now() - this.metrics.startTime) / 1000;
    
    return {
      runtime: `${Math.floor(runtime / 60)}m ${Math.floor(runtime % 60)}s`,
      sessions: {
        created: this.metrics.sessionsCreated,
        active: this.activeSessions.size
      },
      data: {
        itemsExtracted: this.metrics.dataExtracted,
        extractionRate: (this.metrics.dataExtracted / (runtime / 60)).toFixed(2) + '/min'
      },
      reliability: {
        errorsRecovered: this.metrics.errorsRecovered,
        adaptationsMade: this.metrics.adaptationsMade
      },
      subsystems: {
        proxy: this.proxySystem.getProxyStats(),
        browser: this.browserOptimizer.getMetrics(),
        errorHandler: this.errorHandler.getMetrics(),
        learning: this.learningSystem.getMetrics()
      }
    };
  }
}

module.exports = StealthModeCollectionSystem;

// Example usage
if (require.main === module) {
  (async () => {
    const collector = new StealthModeCollectionSystem({
      maxConcurrentSessions: 5,
      geoDistribution: {
        'US': 0.5,
        'CA': 0.2,
        'GB': 0.2,
        'AU': 0.1
      }
    });

    try {
      // Example 1: Single URL collection
      const session = await collector.createStealthSession({
        targetCountry: 'US',
        optimizationStrategy: 'balanced'
      });

      const result = await collector.collectDataStealthily(
        session.id,
        'https://flippa.com/websites',
        { dataType: 'listing' }
      );

      console.log('\nCollected data:', result.data.slice(0, 3));

      await collector.closeSession(session.id);

      // Example 2: Batch collection
      const urls = [
        'https://flippa.com/websites?filter[property_type][]=website',
        'https://flippa.com/websites?filter[property_type][]=ecommerce',
        'https://flippa.com/websites?filter[property_type][]=app'
      ];

      const batchResults = await collector.runBatchCollection(urls, {
        targetCountry: 'US',
        extractionConfig: { dataType: 'listing' }
      });

      console.log('\nBatch results:', batchResults);

      // Shutdown
      await collector.shutdown();

    } catch (error) {
      console.error('Fatal error:', error);
      await collector.shutdown();
    }
  })();
}