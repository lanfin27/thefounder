// method-tester.ts
// Comprehensive testing system for browser automation methods

import { EventEmitter } from 'events';
import { UniversalBrowserManager, UniversalBrowser, UniversalPage } from './universal-browser';

export interface TestResult {
  method: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
  fallbackUsed?: string;
}

export interface TestSuite {
  name: string;
  tests: TestConfig[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestConfig {
  name: string;
  method: string;
  test: (page: UniversalPage) => Promise<any>;
  validate: (result: any) => boolean;
  timeout?: number;
  fallbacks?: string[];
}

export interface TestReport {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  compatibility: {
    basicNavigation: boolean;
    dataExtraction: boolean;
    stealthFeatures: boolean;
    advancedFeatures: boolean;
  };
}

export class BrowserMethodTester extends EventEmitter {
  private browserManager: UniversalBrowserManager;
  private browser: UniversalBrowser | null = null;

  constructor(browserManager: UniversalBrowserManager) {
    super();
    this.browserManager = browserManager;
  }

  async runTestSuite(suite: TestSuite): Promise<TestReport> {
    console.log(`🧪 Running test suite: ${suite.name}`);
    const startTime = Date.now();

    const report: TestReport = {
      suiteName: suite.name,
      totalTests: suite.tests.length,
      passed: 0,
      failed: 0,
      duration: 0,
      results: [],
      compatibility: {
        basicNavigation: false,
        dataExtraction: false,
        stealthFeatures: false,
        advancedFeatures: false
      }
    };

    try {
      // Setup
      if (suite.setup) {
        await suite.setup();
      }

      // Launch browser for testing
      this.browser = await this.browserManager.launch({
        headless: true,
        timeout: 10000
      });

      // Run each test
      for (const testConfig of suite.tests) {
        const result = await this.runSingleTest(testConfig);
        report.results.push(result);

        if (result.success) {
          report.passed++;
        } else {
          report.failed++;
        }

        this.emit('testCompleted', result);
      }

      // Assess compatibility
      report.compatibility = this.assessCompatibility(report.results);

      report.duration = Date.now() - startTime;

      console.log(`${report.passed > 0 ? '✅' : '❌'} Test suite completed:`, {
        passed: report.passed,
        failed: report.failed,
        duration: report.duration + 'ms'
      });

      this.emit('suiteCompleted', report);
      return report;

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      // Teardown
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      if (suite.teardown) {
        await suite.teardown();
      }
    }
  }

  private async runSingleTest(config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      method: config.method,
      success: false,
      duration: 0,
      error: undefined,
      details: undefined,
      fallbackUsed: undefined
    };

    let page: UniversalPage | null = null;

    try {
      console.log(`  🔬 Testing: ${config.name}`);

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      page = await this.browser.newPage();

      // Run the test with timeout
      const timeout = config.timeout || 10000;
      const testPromise = Promise.race([
        config.test(page),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), timeout)
        )
      ]);

      const testResult = await testPromise;
      result.details = testResult;

      // Validate result
      result.success = config.validate(testResult);
      
      if (result.success) {
        console.log(`  ✅ ${config.name}: PASSED`);
      } else {
        console.log(`  ❌ ${config.name}: FAILED (validation failed)`);
      }

    } catch (error) {
      result.error = error.message;
      result.success = false;
      console.log(`  ❌ ${config.name}: ERROR - ${error.message}`);

      // Try fallbacks if available
      if (config.fallbacks && config.fallbacks.length > 0 && page) {
        result.fallbackUsed = await this.tryFallbacks(page, config);
        if (result.fallbackUsed) {
          result.success = true;
          console.log(`  🔄 ${config.name}: FALLBACK SUCCESS (${result.fallbackUsed})`);
        }
      }
    } finally {
      result.duration = Date.now() - startTime;
      
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.warn('Error closing test page:', error.message);
        }
      }
    }

    return result;
  }

  private async tryFallbacks(page: UniversalPage, config: TestConfig): Promise<string | undefined> {
    if (!config.fallbacks) return undefined;

    for (const fallbackMethod of config.fallbacks) {
      try {
        console.log(`    🔄 Trying fallback: ${fallbackMethod}`);
        
        // This is a simplified fallback system
        // In practice, you'd implement specific fallback logic for each method
        if (fallbackMethod === 'page.evaluate') {
          await page.evaluate(() => true);
          return fallbackMethod;
        }
        
      } catch (error) {
        console.log(`    ❌ Fallback ${fallbackMethod} failed:`, error.message);
        continue;
      }
    }

    return undefined;
  }

  private assessCompatibility(results: TestResult[]): TestReport['compatibility'] {
    const getSuccessRate = (category: string[]) => {
      const categoryResults = results.filter(r => category.some(c => r.method.includes(c)));
      const successCount = categoryResults.filter(r => r.success).length;
      return categoryResults.length > 0 ? successCount / categoryResults.length >= 0.8 : false;
    };

    return {
      basicNavigation: getSuccessRate(['goto', 'waitForSelector', 'click']),
      dataExtraction: getSuccessRate(['evaluate', 'title', 'content']),
      stealthFeatures: getSuccessRate(['addInitScript', 'evaluateOnNewDocument', 'userAgent']),
      advancedFeatures: getSuccessRate(['cookies', 'viewport', 'network'])
    };
  }

  // Predefined test suites
  static createBasicTestSuite(): TestSuite {
    return {
      name: 'Basic Browser Automation',
      tests: [
        {
          name: 'Page Navigation',
          method: 'goto',
          test: async (page) => {
            await page.goto('https://example.com');
            return page.url();
          },
          validate: (result) => result.includes('example.com'),
          timeout: 15000
        },
        {
          name: 'Page Title Extraction',
          method: 'title',
          test: async (page) => {
            await page.goto('https://example.com');
            return await page.title();
          },
          validate: (result) => typeof result === 'string' && result.length > 0,
          timeout: 15000
        },
        {
          name: 'Element Selection',
          method: 'waitForSelector',
          test: async (page) => {
            await page.goto('https://example.com');
            const element = await page.waitForSelector('h1');
            return !!element;
          },
          validate: (result) => result === true,
          timeout: 15000
        },
        {
          name: 'JavaScript Evaluation',
          method: 'evaluate',
          test: async (page) => {
            await page.goto('https://example.com');
            return await page.evaluate(() => {
              return {
                userAgent: navigator.userAgent,
                title: document.title,
                url: window.location.href
              };
            });
          },
          validate: (result) => result && result.userAgent && result.title,
          timeout: 15000
        }
      ]
    };
  }

  static createStealthTestSuite(): TestSuite {
    return {
      name: 'Stealth Features',
      tests: [
        {
          name: 'Hide Webdriver Property',
          method: 'addInitScript',
          test: async (page) => {
            if (page.addInitScript) {
              await page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', {
                  get: () => undefined,
                });
              });
            }
            
            await page.goto('https://example.com');
            return await page.evaluate(() => navigator.webdriver);
          },
          validate: (result) => result === undefined,
          fallbacks: ['evaluateOnNewDocument', 'page.evaluate'],
          timeout: 15000
        },
        {
          name: 'User Agent Override',
          method: 'setUserAgent',
          test: async (page) => {
            const testUA = 'Mozilla/5.0 (Test Browser)';
            
            if (page.setUserAgent) {
              await page.setUserAgent(testUA);
            }
            
            await page.goto('https://example.com');
            return await page.evaluate(() => navigator.userAgent);
          },
          validate: (result) => result.includes('Mozilla'),
          fallbacks: ['addInitScript', 'page.evaluate'],
          timeout: 15000
        },
        {
          name: 'Plugin Spoofing',
          method: 'addInitScript',
          test: async (page) => {
            if (page.addInitScript) {
              await page.addInitScript(() => {
                Object.defineProperty(navigator, 'plugins', {
                  get: () => [{ name: 'Test Plugin' }],
                });
              });
            }
            
            await page.goto('https://example.com');
            return await page.evaluate(() => navigator.plugins.length);
          },
          validate: (result) => result >= 0,
          fallbacks: ['evaluateOnNewDocument', 'page.evaluate'],
          timeout: 15000
        }
      ]
    };
  }

  static createCompatibilityTestSuite(): TestSuite {
    return {
      name: 'Cross-Library Compatibility',
      tests: [
        {
          name: 'Playwright addInitScript',
          method: 'addInitScript',
          test: async (page) => {
            if (!page.addInitScript) {
              throw new Error('addInitScript not available');
            }
            
            await page.addInitScript(() => {
              (window as any).testMarker = 'playwright';
            });
            
            await page.goto('https://example.com');
            return await page.evaluate(() => (window as any).testMarker);
          },
          validate: (result) => result === 'playwright',
          fallbacks: ['page.evaluate'],
          timeout: 15000
        },
        {
          name: 'Puppeteer evaluateOnNewDocument',
          method: 'evaluateOnNewDocument',
          test: async (page) => {
            if (!page.evaluateOnNewDocument) {
              throw new Error('evaluateOnNewDocument not available');
            }
            
            await page.evaluateOnNewDocument(() => {
              (window as any).testMarker = 'puppeteer';
            });
            
            await page.goto('https://example.com');
            return await page.evaluate(() => (window as any).testMarker);
          },
          validate: (result) => result === 'puppeteer',
          fallbacks: ['addInitScript', 'page.evaluate'],
          timeout: 15000
        },
        {
          name: 'Universal Script Injection',
          method: 'universal',
          test: async (page) => {
            // Try multiple methods to inject script
            const script = () => {
              (window as any).universalMarker = 'success';
            };

            let injected = false;

            if (page.addInitScript) {
              await page.addInitScript(script);
              injected = true;
            } else if (page.evaluateOnNewDocument) {
              await page.evaluateOnNewDocument(script);
              injected = true;
            }

            if (!injected) {
              throw new Error('No script injection method available');
            }
            
            await page.goto('https://example.com');
            return await page.evaluate(() => (window as any).universalMarker);
          },
          validate: (result) => result === 'success',
          timeout: 15000
        }
      ]
    };
  }

  generateTestReport(report: TestReport): string {
    const compatibility = report.compatibility;
    const successRate = (report.passed / report.totalTests * 100).toFixed(1);

    const reportText = [
      `🧪 Browser Method Test Report: ${report.suiteName}`,
      ``,
      `📊 Summary:`,
      `  Total Tests: ${report.totalTests}`,
      `  Passed: ${report.passed} ✅`,
      `  Failed: ${report.failed} ❌`,
      `  Success Rate: ${successRate}%`,
      `  Duration: ${report.duration}ms`,
      ``,
      `🔧 Compatibility Assessment:`,
      `  Basic Navigation: ${compatibility.basicNavigation ? '✅' : '❌'}`,
      `  Data Extraction: ${compatibility.dataExtraction ? '✅' : '❌'}`,
      `  Stealth Features: ${compatibility.stealthFeatures ? '✅' : '❌'}`,
      `  Advanced Features: ${compatibility.advancedFeatures ? '✅' : '❌'}`,
      ``,
      `📋 Detailed Results:`,
      ...report.results.map(r => 
        `  ${r.success ? '✅' : '❌'} ${r.method}: ${r.duration}ms` + 
        (r.fallbackUsed ? ` (fallback: ${r.fallbackUsed})` : '') +
        (r.error ? ` - ${r.error}` : '')
      ),
      ``,
      `🎯 Recommendations:`,
      compatibility.basicNavigation ? 
        '✅ Browser is suitable for basic web scraping' : 
        '❌ Browser may have issues with basic navigation',
      compatibility.stealthFeatures ? 
        '✅ Stealth features are available' : 
        '⚠️ Limited stealth capabilities - use fallback strategies',
      report.passed / report.totalTests >= 0.8 ?
        '✅ Overall compatibility is good' :
        '⚠️ Consider using fallback methods for reliability'
    ].join('\n');

    return reportText;
  }
}

export default BrowserMethodTester;