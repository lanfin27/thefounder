// universal-browser.ts
// Universal browser interface that abstracts Playwright/Puppeteer differences

import { EventEmitter } from 'events';
import BrowserDetector, { BrowserAPI, BrowserLibrary } from './browser-detector';

export interface UniversalBrowserConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
  args?: string[];
  slowMo?: number;
}

export interface UniversalPage {
  goto(url: string, options?: any): Promise<void>;
  evaluate(fn: Function | string, ...args: any[]): Promise<any>;
  waitForSelector(selector: string, options?: any): Promise<any>;
  $(selector: string): Promise<any>;
  $$(selector: string): Promise<any[]>;
  click(selector: string, options?: any): Promise<void>;
  type(selector: string, text: string, options?: any): Promise<void>;
  title(): Promise<string>;
  url(): string;
  content(): Promise<string>;
  close(): Promise<void>;
  
  // Enhanced methods with fallbacks
  addInitScript?(script: Function | string): Promise<void>;
  evaluateOnNewDocument?(script: Function | string): Promise<void>;
  setUserAgent?(userAgent: string): Promise<void>;
  setViewport?(viewport: { width: number; height: number }): Promise<void>;
}

export interface UniversalContext {
  newPage(): Promise<UniversalPage>;
  close(): Promise<void>;
  pages(): Promise<UniversalPage[]>;
  
  // Enhanced methods
  addInitScript?(script: Function | string): Promise<void>;
  setUserAgent?(userAgent: string): Promise<void>;
  setCookies?(cookies: any[]): Promise<void>;
}

export interface UniversalBrowser {
  newPage(): Promise<UniversalPage>;
  newContext?(options?: any): Promise<UniversalContext>;
  close(): Promise<void>;
  pages(): Promise<UniversalPage[]>;
}

export class UniversalBrowserManager extends EventEmitter {
  private detector: BrowserDetector;
  private browserAPI: BrowserAPI | null = null;
  private nativeBrowser: any = null;
  private library: any = null;

  constructor() {
    super();
    this.detector = new BrowserDetector();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Universal Browser Manager...');
    
    // Detect available browser automation library
    this.browserAPI = await this.detector.detectBrowserEnvironment();
    
    if (this.browserAPI.library === 'unknown') {
      throw new Error('No supported browser automation library found');
    }

    // Load the appropriate library
    await this.loadLibrary(this.browserAPI.library);
    
    console.log(`✅ Universal Browser Manager initialized with ${this.browserAPI.library}`);
    this.emit('initialized', this.browserAPI);
  }

  private async loadLibrary(library: BrowserLibrary): Promise<void> {
    switch (library) {
      case 'playwright':
        this.library = await import('playwright');
        break;
      case 'puppeteer':
        this.library = await import('puppeteer');
        break;
      default:
        throw new Error(`Unsupported library: ${library}`);
    }
  }

  async launch(config: UniversalBrowserConfig = {}): Promise<UniversalBrowser> {
    if (!this.browserAPI || !this.library) {
      throw new Error('Universal Browser Manager not initialized');
    }

    console.log('🌐 Launching browser...');

    const launchOptions = {
      headless: config.headless ?? true,
      args: config.args || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
      slowMo: config.slowMo || 0
    };

    try {
      if (this.browserAPI.library === 'playwright') {
        this.nativeBrowser = await this.library.chromium.launch(launchOptions);
        return this.createPlaywrightWrapper(this.nativeBrowser, config);
      } else if (this.browserAPI.library === 'puppeteer') {
        this.nativeBrowser = await this.library.launch(launchOptions);
        return this.createPuppeteerWrapper(this.nativeBrowser, config);
      } else {
        throw new Error(`Unsupported library: ${this.browserAPI.library}`);
      }
    } catch (error) {
      console.error('❌ Failed to launch browser:', error);
      throw error;
    }
  }

  private createPlaywrightWrapper(browser: any, config: UniversalBrowserConfig): UniversalBrowser {
    return {
      async newPage(): Promise<UniversalPage> {
        const context = await browser.newContext({
          userAgent: config.userAgent,
          viewport: config.viewport
        });
        const page = await context.newPage();
        
        if (config.timeout) {
          page.setDefaultTimeout(config.timeout);
        }
        
        return this.createPlaywrightPageWrapper(page, context);
      },

      async newContext(options: any = {}): Promise<UniversalContext> {
        const contextOptions = {
          userAgent: config.userAgent,
          viewport: config.viewport,
          ...options
        };
        
        const context = await browser.newContext(contextOptions);
        return this.createPlaywrightContextWrapper(context);
      },

      async close(): Promise<void> {
        await browser.close();
      },

      async pages(): Promise<UniversalPage[]> {
        const contexts = browser.contexts();
        const allPages: UniversalPage[] = [];
        
        for (const context of contexts) {
          const pages = context.pages();
          for (const page of pages) {
            allPages.push(this.createPlaywrightPageWrapper(page, context));
          }
        }
        
        return allPages;
      }
    };
  }

  private createPuppeteerWrapper(browser: any, config: UniversalBrowserConfig): UniversalBrowser {
    return {
      async newPage(): Promise<UniversalPage> {
        const page = await browser.newPage();
        
        if (config.userAgent) {
          await page.setUserAgent(config.userAgent);
        }
        
        if (config.viewport) {
          await page.setViewport(config.viewport);
        }
        
        if (config.timeout) {
          page.setDefaultTimeout(config.timeout);
        }
        
        return this.createPuppeteerPageWrapper(page);
      },

      async newContext(options: any = {}): Promise<UniversalContext> {
        const context = await browser.createIncognitoBrowserContext();
        return this.createPuppeteerContextWrapper(context, options);
      },

      async close(): Promise<void> {
        await browser.close();
      },

      async pages(): Promise<UniversalPage[]> {
        const pages = await browser.pages();
        return pages.map((page: any) => this.createPuppeteerPageWrapper(page));
      }
    };
  }

  private createPlaywrightPageWrapper(page: any, context: any): UniversalPage {
    const wrapper: UniversalPage = {
      async goto(url: string, options: any = {}): Promise<void> {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
          ...options
        });
      },

      async evaluate(fn: Function | string, ...args: any[]): Promise<any> {
        return await page.evaluate(fn, ...args);
      },

      async waitForSelector(selector: string, options: any = {}): Promise<any> {
        return await page.waitForSelector(selector, {
          timeout: 10000,
          ...options
        });
      },

      async $(selector: string): Promise<any> {
        return await page.$(selector);
      },

      async $$(selector: string): Promise<any[]> {
        return await page.$$(selector);
      },

      async click(selector: string, options: any = {}): Promise<void> {
        await page.click(selector, options);
      },

      async type(selector: string, text: string, options: any = {}): Promise<void> {
        await page.fill(selector, text, options);
      },

      async title(): Promise<string> {
        return await page.title();
      },

      url(): string {
        return page.url();
      },

      async content(): Promise<string> {
        return await page.content();
      },

      async close(): Promise<void> {
        await page.close();
      }
    };

    // Add Playwright-specific methods
    if (this.detector.isSupported('addInitScript')) {
      wrapper.addInitScript = async (script: Function | string): Promise<void> => {
        await context.addInitScript(script);
      };
    }

    return wrapper;
  }

  private createPuppeteerPageWrapper(page: any): UniversalPage {
    const wrapper: UniversalPage = {
      async goto(url: string, options: any = {}): Promise<void> {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
          ...options
        });
      },

      async evaluate(fn: Function | string, ...args: any[]): Promise<any> {
        return await page.evaluate(fn, ...args);
      },

      async waitForSelector(selector: string, options: any = {}): Promise<any> {
        return await page.waitForSelector(selector, {
          timeout: 10000,
          ...options
        });
      },

      async $(selector: string): Promise<any> {
        return await page.$(selector);
      },

      async $$(selector: string): Promise<any[]> {
        return await page.$$(selector);
      },

      async click(selector: string, options: any = {}): Promise<void> {
        await page.click(selector, options);
      },

      async type(selector: string, text: string, options: any = {}): Promise<void> {
        await page.type(selector, text, options);
      },

      async title(): Promise<string> {
        return await page.title();
      },

      url(): string {
        return page.url();
      },

      async content(): Promise<string> {
        return await page.content();
      },

      async close(): Promise<void> {
        await page.close();
      }
    };

    // Add Puppeteer-specific methods
    if (this.detector.isSupported('evaluateOnNewDocument')) {
      wrapper.evaluateOnNewDocument = async (script: Function | string): Promise<void> => {
        await page.evaluateOnNewDocument(script);
      };
    }

    if (this.detector.isSupported('userAgentOverride')) {
      wrapper.setUserAgent = async (userAgent: string): Promise<void> => {
        await page.setUserAgent(userAgent);
      };
    }

    if (this.detector.isSupported('viewportSetting')) {
      wrapper.setViewport = async (viewport: { width: number; height: number }): Promise<void> => {
        await page.setViewport(viewport);
      };
    }

    return wrapper;
  }

  private createPlaywrightContextWrapper(context: any): UniversalContext {
    return {
      async newPage(): Promise<UniversalPage> {
        const page = await context.newPage();
        return this.createPlaywrightPageWrapper(page, context);
      },

      async close(): Promise<void> {
        await context.close();
      },

      async pages(): Promise<UniversalPage[]> {
        const pages = context.pages();
        return pages.map((page: any) => this.createPlaywrightPageWrapper(page, context));
      },

      async addInitScript(script: Function | string): Promise<void> {
        await context.addInitScript(script);
      },

      async setCookies(cookies: any[]): Promise<void> {
        await context.addCookies(cookies);
      }
    };
  }

  private createPuppeteerContextWrapper(context: any, options: any): UniversalContext {
    return {
      async newPage(): Promise<UniversalPage> {
        const page = await context.newPage();
        
        if (options.userAgent) {
          await page.setUserAgent(options.userAgent);
        }
        
        if (options.viewport) {
          await page.setViewport(options.viewport);
        }
        
        return this.createPuppeteerPageWrapper(page);
      },

      async close(): Promise<void> {
        await context.close();
      },

      async pages(): Promise<UniversalPage[]> {
        const pages = await context.pages();
        return pages.map((page: any) => this.createPuppeteerPageWrapper(page));
      }
    };
  }

  // Method to execute code with automatic fallback
  async executeWithFallback(
    page: UniversalPage,
    primaryMethod: string,
    fallbackMethods: string[],
    ...args: any[]
  ): Promise<any> {
    const methods = [primaryMethod, ...fallbackMethods];
    
    for (const method of methods) {
      try {
        console.log(`🔄 Trying method: ${method}`);
        
        if (method === 'addInitScript' && page.addInitScript) {
          return await page.addInitScript(args[0]);
        } else if (method === 'evaluateOnNewDocument' && page.evaluateOnNewDocument) {
          return await page.evaluateOnNewDocument(args[0]);
        } else if (method === 'page.evaluate') {
          return await page.evaluate(args[0]);
        }
        
      } catch (error) {
        console.log(`❌ Method ${method} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error(`All methods failed: ${methods.join(', ')}`);
  }

  getBrowserAPI(): BrowserAPI | null {
    return this.browserAPI;
  }

  getDetector(): BrowserDetector {
    return this.detector;
  }

  async cleanup(): Promise<void> {
    if (this.nativeBrowser) {
      await this.nativeBrowser.close();
      this.nativeBrowser = null;
    }
    
    this.browserAPI = null;
    this.library = null;
    
    console.log('🧹 Universal Browser Manager cleaned up');
    this.emit('cleanup');
  }
}

export default UniversalBrowserManager;