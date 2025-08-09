// enhanced-scraper.ts
// Enhanced scraping system built on the verified universal browser foundation

import { EventEmitter } from 'events';
import UniversalBrowserManager, { UniversalBrowser, UniversalPage } from './universal-browser';
import ProgressiveStealth, { StealthLevel, StealthConfig } from './progressive-stealth';
import BrowserDetector from './browser-detector';
import BrowserMethodTester from './method-tester';

export interface EnhancedScrapingConfig {
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
  stealth?: {
    level: StealthLevel;
    features: any;
    fallbackStrategies: boolean;
  };
  delays?: {
    navigation: number;
    interaction: number;
    reading: number;
  };
  retries?: {
    maxRetries: number;
    backoffMultiplier: number;
    baseDelay: number;
  };
  validation?: {
    runTests: boolean;
    testSuites: string[];
  };
}

export interface ScrapingResult {
  success: boolean;
  data: any[];
  metadata: {
    url: string;
    timestamp: Date;
    duration: number;
    pagesVisited: number;
    errors: string[];
    stealthLevel: StealthLevel;
    browserLibrary: string;
    fallbacksUsed: string[];
  };
}

export interface ScrapingProgress {
  stage: 'initializing' | 'testing' | 'scraping' | 'complete' | 'error';
  progress: number;
  message: string;
  data?: any;
}

export class EnhancedBrowserScraper extends EventEmitter {
  private browserManager: UniversalBrowserManager;
  private detector: BrowserDetector;
  private stealth: ProgressiveStealth;
  private tester: BrowserMethodTester;
  private browser: UniversalBrowser | null = null;
  private isInitialized: boolean = false;
  private config: EnhancedScrapingConfig;

  constructor(config: EnhancedScrapingConfig = {}) {
    super();
    
    this.config = {
      headless: true,
      timeout: 30000,
      viewport: { width: 1366, height: 768 },
      stealth: {
        level: 'basic',
        features: {
          webdriver: true,
          userAgent: true,
          navigator: true
        },
        fallbackStrategies: true
      },
      delays: {
        navigation: 2000,
        interaction: 1000,
        reading: 1500
      },
      retries: {
        maxRetries: 3,
        backoffMultiplier: 2,
        baseDelay: 1000
      },
      validation: {
        runTests: false,
        testSuites: ['basic']
      },
      ...config
    };

    this.browserManager = new UniversalBrowserManager();
    this.detector = new BrowserDetector();
    this.stealth = new ProgressiveStealth(this.detector);
    this.tester = new BrowserMethodTester(this.browserManager);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Enhanced Browser Scraper already initialized');
      return;
    }

    console.log('🚀 Initializing Enhanced Browser Scraper...');
    this.emitProgress('initializing', 0, 'Starting initialization...');

    try {
      // Step 1: Initialize browser manager
      this.emitProgress('initializing', 20, 'Detecting browser environment...');
      await this.browserManager.initialize();
      
      // Step 2: Initialize stealth system
      this.emitProgress('initializing', 40, 'Setting up stealth capabilities...');
      await this.stealth.initialize();

      // Step 3: Run validation tests if enabled
      if (this.config.validation?.runTests) {
        this.emitProgress('testing', 60, 'Running compatibility tests...');
        await this.runValidationTests();
      }

      // Step 4: Launch browser
      this.emitProgress('initializing', 80, 'Launching browser...');
      this.browser = await this.browserManager.launch({
        headless: this.config.headless,
        timeout: this.config.timeout,
        viewport: this.config.viewport
      });

      this.isInitialized = true;
      this.emitProgress('initializing', 100, 'Initialization complete');
      
      console.log('✅ Enhanced Browser Scraper initialized successfully');
      this.emit('initialized', {
        browserAPI: this.detector.getDetectedAPI(),
        stealthCapabilities: this.stealth.getCapabilities()
      });

    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Browser Scraper:', error);
      this.emitProgress('error', 0, `Initialization failed: ${error.message}`);
      throw error;
    }
  }

  private async runValidationTests(): Promise<void> {
    console.log('🧪 Running validation tests...');

    const testSuites = this.config.validation?.testSuites || ['basic'];
    
    for (const suiteName of testSuites) {
      let suite;
      
      switch (suiteName) {
        case 'basic':
          suite = BrowserMethodTester.createBasicTestSuite();
          break;
        case 'stealth':
          suite = BrowserMethodTester.createStealthTestSuite();
          break;
        case 'compatibility':
          suite = BrowserMethodTester.createCompatibilityTestSuite();
          break;
        default:
          console.warn(`Unknown test suite: ${suiteName}`);
          continue;
      }

      try {
        const report = await this.tester.runTestSuite(suite);
        console.log(`Test suite ${suiteName}: ${report.passed}/${report.totalTests} passed`);
        
        if (report.passed === 0) {
          throw new Error(`All tests failed in suite: ${suiteName}`);
        }
        
        this.emit('testResults', report);
      } catch (error) {
        console.error(`Test suite ${suiteName} failed:`, error);
        throw error;
      }
    }
  }

  async scrapeWebsite(
    url: string,
    extractorFunction: (page: UniversalPage) => Promise<any>,
    options: {
      maxPages?: number;
      followLinks?: boolean;
      linkSelector?: string;
    } = {}
  ): Promise<ScrapingResult> {
    if (!this.isInitialized || !this.browser) {
      throw new Error('Enhanced Browser Scraper not initialized');
    }

    const startTime = Date.now();
    const result: ScrapingResult = {
      success: false,
      data: [],
      metadata: {
        url,
        timestamp: new Date(),
        duration: 0,
        pagesVisited: 0,
        errors: [],
        stealthLevel: this.config.stealth?.level || 'basic',
        browserLibrary: this.detector.getDetectedAPI()?.library || 'unknown',
        fallbacksUsed: []
      }
    };

    this.emitProgress('scraping', 0, `Starting to scrape: ${url}`);

    try {
      const page = await this.browser.newPage();
      
      try {
        // Apply stealth features
        await this.applyStealthFeatures(page);
        
        // Navigate to initial URL
        await this.navigateWithRetry(page, url);
        result.metadata.pagesVisited = 1;
        
        this.emitProgress('scraping', 20, 'Page loaded, extracting data...');
        
        // Extract data from current page
        const pageData = await this.extractWithRetry(page, extractorFunction);
        if (pageData) {
          result.data.push(pageData);
        }

        this.emitProgress('scraping', 50, `Data extracted from main page`);

        // Follow links if requested
        if (options.followLinks && options.maxPages && options.maxPages > 1) {
          await this.followLinks(page, extractorFunction, options, result);
        }

        result.success = result.data.length > 0;
        this.emitProgress('scraping', 100, `Scraping complete: ${result.data.length} items`);

      } finally {
        await page.close();
      }

    } catch (error) {
      console.error('❌ Scraping failed:', error);
      result.metadata.errors.push(error.message);
      this.emitProgress('error', 0, `Scraping failed: ${error.message}`);
    } finally {
      result.metadata.duration = Date.now() - startTime;
    }

    this.emit('scrapingComplete', result);
    return result;
  }

  private async applyStealthFeatures(page: UniversalPage): Promise<void> {
    if (!this.config.stealth) return;

    try {
      const stealthConfig: StealthConfig = {
        level: this.config.stealth.level,
        features: this.config.stealth.features,
        fallbackStrategies: this.config.stealth.fallbackStrategies,
        testMode: false
      };

      const stealthResult = await this.stealth.applyStealth(page, stealthConfig);
      
      if (stealthResult.success) {
        console.log(`✅ Stealth applied: ${stealthResult.appliedFeatures.length} features`);
        this.metadata?.fallbacksUsed.push(...stealthResult.fallbacksUsed);
      } else {
        console.warn('⚠️ Stealth application had issues:', stealthResult.warnings);
      }

    } catch (error) {
      console.warn('⚠️ Stealth application failed:', error.message);
    }
  }

  private async navigateWithRetry(page: UniversalPage, url: string): Promise<void> {
    const retries = this.config.retries!;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries.maxRetries; attempt++) {
      try {
        console.log(`🌐 Navigating to ${url} (attempt ${attempt + 1})`);
        
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.config.timeout
        });

        // Add human-like delay
        await this.humanDelay(this.config.delays!.navigation);
        
        console.log('✅ Navigation successful');
        return;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Navigation attempt ${attempt + 1} failed:`, error.message);

        if (attempt < retries.maxRetries) {
          const delay = retries.baseDelay * Math.pow(retries.backoffMultiplier, attempt);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Navigation failed after all retries');
  }

  private async extractWithRetry(
    page: UniversalPage,
    extractorFunction: (page: UniversalPage) => Promise<any>
  ): Promise<any> {
    const retries = this.config.retries!;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries.maxRetries; attempt++) {
      try {
        console.log(`📊 Extracting data (attempt ${attempt + 1})`);
        
        // Add reading delay to simulate human behavior
        await this.humanDelay(this.config.delays!.reading);
        
        const data = await extractorFunction(page);
        console.log('✅ Data extraction successful');
        return data;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Extraction attempt ${attempt + 1} failed:`, error.message);

        if (attempt < retries.maxRetries) {
          const delay = retries.baseDelay * Math.pow(retries.backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ All extraction attempts failed');
    throw lastError || new Error('Data extraction failed after all retries');
  }

  private async followLinks(
    page: UniversalPage,
    extractorFunction: (page: UniversalPage) => Promise<any>,
    options: any,
    result: ScrapingResult
  ): Promise<void> {
    try {
      const linkSelector = options.linkSelector || 'a[href]';
      const maxPages = options.maxPages || 5;
      
      console.log(`🔗 Looking for links with selector: ${linkSelector}`);
      
      // Get links from current page
      const links = await page.evaluate((selector: string) => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements)
          .map(el => (el as HTMLAnchorElement).href)
          .filter(href => href && href.startsWith('http'))
          .slice(0, 10); // Limit to prevent too many requests
      }, linkSelector);

      console.log(`📋 Found ${links.length} links to follow`);

      // Follow each link
      for (let i = 0; i < Math.min(links.length, maxPages - 1); i++) {
        const link = links[i];
        
        try {
          this.emitProgress('scraping', 50 + (i / links.length) * 40, `Following link ${i + 1}/${links.length}`);
          
          await this.navigateWithRetry(page, link);
          result.metadata.pagesVisited++;
          
          const linkData = await this.extractWithRetry(page, extractorFunction);
          if (linkData) {
            result.data.push(linkData);
          }

          // Human-like delay between pages
          await this.humanDelay(this.config.delays!.navigation);

        } catch (error) {
          console.warn(`⚠️ Failed to process link ${link}:`, error.message);
          result.metadata.errors.push(`Link ${link}: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Link following failed:', error);
      result.metadata.errors.push(`Link following: ${error.message}`);
    }
  }

  private async humanDelay(baseMs: number): Promise<void> {
    const variance = baseMs * 0.3; // 30% variance
    const actualDelay = baseMs + (Math.random() - 0.5) * variance;
    await new Promise(resolve => setTimeout(resolve, Math.max(100, actualDelay)));
  }

  private emitProgress(stage: ScrapingProgress['stage'], progress: number, message: string, data?: any): void {
    this.emit('progress', {
      stage,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      data
    });
  }

  // Convenience method for simple data extraction
  async scrapeSimpleData(
    url: string,
    selectors: { [key: string]: string },
    options?: any
  ): Promise<ScrapingResult> {
    const extractorFunction = async (page: UniversalPage) => {
      const data: any = {};
      
      for (const [key, selector] of Object.entries(selectors)) {
        try {
          const element = await page.$(selector);
          if (element) {
            data[key] = await page.evaluate(el => el.textContent?.trim(), element);
          }
        } catch (error) {
          console.warn(`Failed to extract ${key}:`, error.message);
          data[key] = null;
        }
      }
      
      return data;
    };

    return await this.scrapeWebsite(url, extractorFunction, options);
  }

  // Generate comprehensive report
  generateReport(): string {
    const api = this.detector.getDetectedAPI();
    const capabilities = this.stealth.getCapabilities();

    if (!api || !capabilities) {
      return 'Enhanced Browser Scraper not initialized';
    }

    const compatibilityReport = this.detector.generateCompatibilityReport();
    
    const report = [
      `🤖 Enhanced Browser Scraper Report`,
      ``,
      `📊 Configuration:`,
      `  Headless: ${this.config.headless}`,
      `  Timeout: ${this.config.timeout}ms`,
      `  Stealth Level: ${this.config.stealth?.level}`,
      `  Validation: ${this.config.validation?.runTests ? 'Enabled' : 'Disabled'}`,
      ``,
      compatibilityReport,
      ``,
      `🥷 Stealth Capabilities:`,
      `  User Agent Spoofing: ${capabilities.userAgentSpoofing ? '✅' : '❌'}`,
      `  Navigator Overrides: ${capabilities.navigatorOverrides ? '✅' : '❌'}`,
      `  WebGL Fingerprinting: ${capabilities.webglFingerprinting ? '✅' : '❌'}`,
      `  Canvas Fingerprinting: ${capabilities.canvasFingerprinting ? '✅' : '❌'}`,
      `  Plugin Spoofing: ${capabilities.pluginSpoofing ? '✅' : '❌'}`,
      ``,
      `🎯 Ready for Production: ${this.isInitialized ? '✅' : '❌'}`
    ].join('\n');

    return report;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    await this.browserManager.cleanup();
    this.isInitialized = false;
    
    console.log('🧹 Enhanced Browser Scraper cleaned up');
    this.emit('cleanup');
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      browserLibrary: this.detector.getDetectedAPI()?.library || 'unknown',
      stealthLevel: this.config.stealth?.level || 'none',
      hasBrowser: !!this.browser
    };
  }
}

export default EnhancedBrowserScraper;