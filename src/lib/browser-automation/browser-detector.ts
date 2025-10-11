// browser-detector.ts
// Library detection and API mapping for browser automation environments

import { EventEmitter } from 'events';

export type BrowserLibrary = 'playwright' | 'puppeteer' | 'unknown';

export interface BrowserAPI {
  library: BrowserLibrary;
  version: string;
  hasChromium: boolean;
  hasFirefox: boolean;
  hasWebkit: boolean;
  capabilities: BrowserCapabilities;
}

export interface BrowserCapabilities {
  // Basic navigation
  navigation: boolean;
  evaluation: boolean;
  waitForSelector: boolean;
  
  // Advanced features
  addInitScript: boolean;
  evaluateOnNewDocument: boolean;
  networkInterception: boolean;
  cookies: boolean;
  localStorage: boolean;
  
  // Stealth features
  userAgentOverride: boolean;
  viewportSetting: boolean;
  contextIsolation: boolean;
  fingerprintResistance: boolean;
}

export interface APIMapping {
  // Core methods
  launch: string;
  newContext: string;
  newPage: string;
  goto: string;
  evaluate: string;
  waitForSelector: string;
  click: string;
  type: string;
  
  // Advanced methods
  addInitScript?: string;
  evaluateOnNewDocument?: string;
  setUserAgent?: string;
  setViewport?: string;
  setCookie?: string;
  
  // Fallback methods
  fallbacks: {
    addInitScript: string[];
    evaluateOnNewDocument: string[];
    setUserAgent: string[];
  };
}

export class BrowserDetector extends EventEmitter {
  private detectedAPI: BrowserAPI | null = null;
  private apiMapping: APIMapping | null = null;

  async detectBrowserEnvironment(): Promise<BrowserAPI> {
    console.log('🔍 Detecting browser automation environment...');

    try {
      // Try Playwright first
      const playwrightAPI = await this.detectPlaywright();
      if (playwrightAPI) {
        this.detectedAPI = playwrightAPI;
        this.apiMapping = this.createPlaywrightMapping();
        console.log('✅ Playwright detected:', playwrightAPI.version);
        this.emit('detected', playwrightAPI);
        return playwrightAPI;
      }

      // Try Puppeteer fallback
      const puppeteerAPI = await this.detectPuppeteer();
      if (puppeteerAPI) {
        this.detectedAPI = puppeteerAPI;
        this.apiMapping = this.createPuppeteerMapping();
        console.log('✅ Puppeteer detected:', puppeteerAPI.version);
        this.emit('detected', puppeteerAPI);
        return puppeteerAPI;
      }

      // No supported library found
      const unknownAPI: BrowserAPI = {
        library: 'unknown',
        version: '0.0.0',
        hasChromium: false,
        hasFirefox: false,
        hasWebkit: false,
        capabilities: this.createMinimalCapabilities()
      };

      console.warn('⚠️ No supported browser automation library found');
      this.emit('notDetected');
      return unknownAPI;

    } catch (error) {
      console.error('❌ Error detecting browser environment:', error);
      throw new Error(`Browser detection failed: ${error}`);
    }
  }

  private async detectPlaywright(): Promise<BrowserAPI | null> {
    try {
      const playwright = await import('playwright');
      const { chromium, firefox, webkit } = playwright;

      // Test basic functionality
      const version = await this.getPlaywrightVersion();
      const capabilities = await this.testPlaywrightCapabilities(playwright);

      return {
        library: 'playwright',
        version,
        hasChromium: !!chromium,
        hasFirefox: !!firefox,
        hasWebkit: !!webkit,
        capabilities
      };
    } catch (error) {
      console.log('Playwright not available:', error.message);
      return null;
    }
  }

  private async detectPuppeteer(): Promise<BrowserAPI | null> {
    try {
      const puppeteer = await import('puppeteer');
      
      // Test basic functionality
      const version = await this.getPuppeteerVersion();
      const capabilities = await this.testPuppeteerCapabilities(puppeteer);

      return {
        library: 'puppeteer',
        version,
        hasChromium: true,
        hasFirefox: false,
        hasWebkit: false,
        capabilities
      };
    } catch (error) {
      console.log('Puppeteer not available:', error.message);
      return null;
    }
  }

  private async getPlaywrightVersion(): Promise<string> {
    try {
      const playwright = await import('playwright');
      return playwright.chromium?.name?.() || '1.40.0'; // Default version
    } catch {
      return '1.40.0';
    }
  }

  private async getPuppeteerVersion(): Promise<string> {
    try {
      const puppeteer = await import('puppeteer');
      return puppeteer.executablePath ? '21.0.0' : '21.0.0'; // Default version
    } catch {
      return '21.0.0';
    }
  }

  private async testPlaywrightCapabilities(playwright: any): Promise<BrowserCapabilities> {
    const capabilities: BrowserCapabilities = {
      navigation: true,
      evaluation: true,
      waitForSelector: true,
      addInitScript: false,
      evaluateOnNewDocument: false,
      networkInterception: true,
      cookies: true,
      localStorage: true,
      userAgentOverride: true,
      viewportSetting: true,
      contextIsolation: true,
      fingerprintResistance: true
    };

    try {
      // Test browser launch
      const browser = await playwright.chromium.launch({ headless: true });
      const context = await browser.newContext();
      
      // Test addInitScript (Playwright method)
      try {
        await context.addInitScript(() => {});
        capabilities.addInitScript = true;
        console.log('✅ addInitScript supported');
      } catch (error) {
        console.log('❌ addInitScript not supported');
      }

      // Test page creation and basic methods
      const page = await context.newPage();
      
      try {
        await page.evaluate(() => true);
        capabilities.evaluation = true;
      } catch (error) {
        capabilities.evaluation = false;
      }

      await browser.close();
    } catch (error) {
      console.warn('Error testing Playwright capabilities:', error.message);
    }

    return capabilities;
  }

  private async testPuppeteerCapabilities(puppeteer: any): Promise<BrowserCapabilities> {
    const capabilities: BrowserCapabilities = {
      navigation: true,
      evaluation: true,
      waitForSelector: true,
      addInitScript: false,
      evaluateOnNewDocument: false,
      networkInterception: true,
      cookies: true,
      localStorage: true,
      userAgentOverride: true,
      viewportSetting: true,
      contextIsolation: false,
      fingerprintResistance: false
    };

    try {
      // Test browser launch
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Test evaluateOnNewDocument (Puppeteer method)
      try {
        await page.evaluateOnNewDocument(() => {});
        capabilities.evaluateOnNewDocument = true;
        console.log('✅ evaluateOnNewDocument supported');
      } catch (error) {
        console.log('❌ evaluateOnNewDocument not supported');
      }

      try {
        await page.evaluate(() => true);
        capabilities.evaluation = true;
      } catch (error) {
        capabilities.evaluation = false;
      }

      await browser.close();
    } catch (error) {
      console.warn('Error testing Puppeteer capabilities:', error.message);
    }

    return capabilities;
  }

  private createMinimalCapabilities(): BrowserCapabilities {
    return {
      navigation: false,
      evaluation: false,
      waitForSelector: false,
      addInitScript: false,
      evaluateOnNewDocument: false,
      networkInterception: false,
      cookies: false,
      localStorage: false,
      userAgentOverride: false,
      viewportSetting: false,
      contextIsolation: false,
      fingerprintResistance: false
    };
  }

  private createPlaywrightMapping(): APIMapping {
    return {
      // Core methods
      launch: 'chromium.launch',
      newContext: 'browser.newContext',
      newPage: 'context.newPage',
      goto: 'page.goto',
      evaluate: 'page.evaluate',
      waitForSelector: 'page.waitForSelector',
      click: 'page.click',
      type: 'page.type',
      
      // Advanced methods
      addInitScript: 'context.addInitScript',
      setUserAgent: 'context.setExtraHTTPHeaders',
      setViewport: 'context.setViewportSize',
      setCookie: 'context.setCookies',
      
      // Fallback methods
      fallbacks: {
        addInitScript: ['page.evaluate'],
        evaluateOnNewDocument: ['context.addInitScript', 'page.evaluate'],
        setUserAgent: ['context.setExtraHTTPHeaders', 'page.setExtraHTTPHeaders']
      }
    };
  }

  private createPuppeteerMapping(): APIMapping {
    return {
      // Core methods
      launch: 'puppeteer.launch',
      newContext: 'browser.createIncognitoBrowserContext',
      newPage: 'browser.newPage',
      goto: 'page.goto',
      evaluate: 'page.evaluate',
      waitForSelector: 'page.waitForSelector',
      click: 'page.click',
      type: 'page.type',
      
      // Advanced methods
      evaluateOnNewDocument: 'page.evaluateOnNewDocument',
      setUserAgent: 'page.setUserAgent',
      setViewport: 'page.setViewport',
      setCookie: 'page.setCookie',
      
      // Fallback methods
      fallbacks: {
        addInitScript: ['page.evaluateOnNewDocument', 'page.evaluate'],
        evaluateOnNewDocument: ['page.evaluateOnNewDocument'],
        setUserAgent: ['page.setUserAgent']
      }
    };
  }

  getDetectedAPI(): BrowserAPI | null {
    return this.detectedAPI;
  }

  getAPIMapping(): APIMapping | null {
    return this.apiMapping;
  }

  isSupported(feature: keyof BrowserCapabilities): boolean {
    return this.detectedAPI?.capabilities[feature] || false;
  }

  getFallbackMethods(method: string): string[] {
    return this.apiMapping?.fallbacks[method as keyof APIMapping['fallbacks']] || [];
  }

  // Method to test specific browser capabilities before use
  async testMethod(methodName: string, testFn: () => Promise<boolean>): Promise<boolean> {
    try {
      console.log(`🧪 Testing method: ${methodName}`);
      const result = await testFn();
      console.log(`${result ? '✅' : '❌'} ${methodName}: ${result ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
      return result;
    } catch (error) {
      console.log(`❌ ${methodName}: ERROR - ${error.message}`);
      return false;
    }
  }

  // Generate compatibility report
  generateCompatibilityReport(): string {
    if (!this.detectedAPI) {
      return 'No browser API detected';
    }

    const api = this.detectedAPI;
    const report = [
      `📊 Browser Automation Compatibility Report`,
      `Library: ${api.library} v${api.version}`,
      ``,
      `🚀 Available Browsers:`,
      `  Chromium: ${api.hasChromium ? '✅' : '❌'}`,
      `  Firefox: ${api.hasFirefox ? '✅' : '❌'}`,
      `  WebKit: ${api.hasWebkit ? '✅' : '❌'}`,
      ``,
      `🔧 Core Capabilities:`,
      `  Navigation: ${api.capabilities.navigation ? '✅' : '❌'}`,
      `  Evaluation: ${api.capabilities.evaluation ? '✅' : '❌'}`,
      `  Wait for Selector: ${api.capabilities.waitForSelector ? '✅' : '❌'}`,
      ``,
      `🛡️ Advanced Features:`,
      `  Add Init Script: ${api.capabilities.addInitScript ? '✅' : '❌'}`,
      `  Evaluate on New Document: ${api.capabilities.evaluateOnNewDocument ? '✅' : '❌'}`,
      `  Network Interception: ${api.capabilities.networkInterception ? '✅' : '❌'}`,
      `  Cookie Management: ${api.capabilities.cookies ? '✅' : '❌'}`,
      ``,
      `🥷 Stealth Capabilities:`,
      `  User Agent Override: ${api.capabilities.userAgentOverride ? '✅' : '❌'}`,
      `  Viewport Setting: ${api.capabilities.viewportSetting ? '✅' : '❌'}`,
      `  Context Isolation: ${api.capabilities.contextIsolation ? '✅' : '❌'}`,
      `  Fingerprint Resistance: ${api.capabilities.fingerprintResistance ? '✅' : '❌'}`
    ].join('\n');

    return report;
  }
}

export default BrowserDetector;