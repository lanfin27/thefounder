// stealth-browser.ts
// Advanced stealth browser implementation with undetected Chrome and Playwright stealth

import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'playwright-extra-plugin-stealth';

export interface StealthBrowserConfig {
  browserType: 'chrome' | 'firefox' | 'safari';
  headless: boolean;
  proxyUrl?: string;
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
  platform?: string;
  webRTCPolicy?: 'default' | 'default_public_interface_only' | 'default_public_and_private_interfaces' | 'disable_non_proxied_udp';
  enableStealth: boolean;
  enableUndetected: boolean;
  fingerprintRandomization: boolean;
}

export interface BrowserFingerprint {
  userAgent: string;
  platform: string;
  languages: string[];
  webgl: {
    vendor: string;
    renderer: string;
  };
  canvas: string;
  timezone: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  hardwareConcurrency: number;
  deviceMemory: number;
}

export class StealthBrowser {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config: StealthBrowserConfig;
  private fingerprint: BrowserFingerprint | null = null;

  constructor(config: Partial<StealthBrowserConfig> = {}) {
    this.config = {
      browserType: 'chrome',
      headless: true,
      enableStealth: true,
      enableUndetected: true,
      fingerprintRandomization: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    console.log(`🕵️ Initializing stealth browser: ${this.config.browserType}`);

    try {
      // Generate random fingerprint if enabled
      if (this.config.fingerprintRandomization) {
        this.fingerprint = this.generateRandomFingerprint();
      }

      // Add stealth plugins
      const chromiumExtra = addExtra(chromium);
      const firefoxExtra = addExtra(firefox);
      const webkitExtra = addExtra(webkit);

      if (this.config.enableStealth) {
        chromiumExtra.use(StealthPlugin());
        firefoxExtra.use(StealthPlugin());
        webkitExtra.use(StealthPlugin());
      }

      // Browser-specific launch options
      const launchOptions = await this.getBrowserLaunchOptions();

      // Launch browser based on type
      switch (this.config.browserType) {
        case 'chrome':
          this.browser = await chromiumExtra.launch(launchOptions);
          break;
        case 'firefox':
          this.browser = await firefoxExtra.launch(launchOptions);
          break;
        case 'safari':
          this.browser = await webkitExtra.launch(launchOptions);
          break;
        default:
          throw new Error(`Unsupported browser type: ${this.config.browserType}`);
      }

      // Create context with advanced settings
      this.context = await this.browser.newContext(await this.getContextOptions());

      console.log('✅ Stealth browser initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize stealth browser:', error);
      throw error;
    }
  }

  private async getBrowserLaunchOptions(): Promise<any> {
    const baseOptions = {
      headless: this.config.headless,
      args: await this.getStealthArgs(),
    };

    // Add proxy if configured
    if (this.config.proxyUrl) {
      baseOptions.proxy = {
        server: this.config.proxyUrl
      };
    }

    return baseOptions;
  }

  private async getStealthArgs(): Promise<string[]> {
    const args = [
      // Basic stealth arguments
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-features=VizDisplayCompositor',
      
      // Advanced anti-detection
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-client-side-phishing-detection',
      '--disable-sync',
      '--disable-default-apps',
      '--disable-extensions-file-access-check',
      '--disable-extensions-http-throttling',
      '--disable-extensions-except-actions',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-component-extensions-with-background-pages',
      
      // Memory and performance
      '--memory-pressure-off',
      '--max-old-space-size=4096',
      
      // Network and security
      '--disable-web-security',
      '--disable-site-isolation-trials',
      '--disable-features=VizDisplayCompositor',
      '--ignore-certificate-errors-spki-list',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--allow-running-insecure-content',
      
      // WebRTC
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--enforce-webrtc-ip-permission-check',
      
      // Language and locale
      `--lang=${this.config.locale || 'en-US'}`,
      
      // User agent and fingerprinting
      '--disable-plugins-discovery',
      '--disable-preconnect',
      '--disable-prefetch',
    ];

    // Add viewport if specified
    if (this.config.viewport) {
      args.push(`--window-size=${this.config.viewport.width},${this.config.viewport.height}`);
    }

    // Platform-specific arguments
    if (this.config.platform) {
      args.push(`--user-agent-platform=${this.config.platform}`);
    }

    return args;
  }

  private async getContextOptions(): Promise<any> {
    const options: any = {
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
    };

    // Apply fingerprint if generated
    if (this.fingerprint) {
      options.userAgent = this.fingerprint.userAgent;
      options.locale = this.fingerprint.languages[0];
      options.timezoneId = this.fingerprint.timezone;
      options.viewport = {
        width: this.fingerprint.screen.width,
        height: this.fingerprint.screen.height
      };
    } else if (this.config.userAgent) {
      options.userAgent = this.config.userAgent;
    }

    // Set viewport
    if (this.config.viewport) {
      options.viewport = this.config.viewport;
    }

    // Set locale and timezone
    if (this.config.locale) {
      options.locale = this.config.locale;
    }

    if (this.config.timezone) {
      options.timezoneId = this.config.timezone;
    }

    return options;
  }

  async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();

    // Apply advanced stealth measures
    if (this.config.enableUndetected) {
      await this.applyUndetectedMeasures(page);
    }

    return page;
  }

  private async applyUndetectedMeasures(page: Page): Promise<void> {
    try {
      // Hide webdriver property
      await page.addInitScript(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Remove automation indicators
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

        // Spoof Chrome object
        (window as any).chrome = {
          runtime: {},
          loadTimes: function() {
            return {
              commitLoadTime: Date.now(),
              connectionInfo: 'http/1.1',
              finishDocumentLoadTime: Date.now(),
              finishLoadTime: Date.now(),
              firstPaintAfterLoadTime: 0,
              firstPaintTime: Date.now(),
              navigationType: 'Other',
              npnNegotiatedProtocol: 'http/1.1',
              requestTime: Date.now() - 1000,
              startLoadTime: Date.now() - 1000,
              wasAlternateProtocolAvailable: false,
              wasFetchedViaSpdy: false,
              wasNpnNegotiated: false
            };
          },
          csi: function() {
            return {
              onloadT: Date.now(),
              pageT: Date.now(),
              startE: Date.now(),
              tran: 15
            };
          }
        };

        // Spoof permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Apply fingerprint if available
        if (this.fingerprint) {
          // Override platform
          Object.defineProperty(navigator, 'platform', {
            get: () => this.fingerprint!.platform,
          });

          // Override languages
          Object.defineProperty(navigator, 'languages', {
            get: () => this.fingerprint!.languages,
          });

          // Override hardware concurrency
          Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => this.fingerprint!.hardwareConcurrency,
          });

          // Override device memory
          Object.defineProperty(navigator, 'deviceMemory', {
            get: () => this.fingerprint!.deviceMemory,
          });

          // Override screen properties
          Object.defineProperty(screen, 'width', {
            get: () => this.fingerprint!.screen.width,
          });

          Object.defineProperty(screen, 'height', {
            get: () => this.fingerprint!.screen.height,
          });

          Object.defineProperty(screen, 'colorDepth', {
            get: () => this.fingerprint!.screen.colorDepth,
          });

          // Override WebGL
          const getParameter = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return this.fingerprint!.webgl.vendor;
            if (parameter === 37446) return this.fingerprint!.webgl.renderer;
            return getParameter.apply(this, arguments as any);
          };
        }
      });

      // Set additional headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      });

    } catch (error) {
      console.warn('⚠️ Failed to apply some undetected measures:', error.message);
    }
  }

  private generateRandomFingerprint(): BrowserFingerprint {
    const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
    const languages = [
      ['en-US', 'en'],
      ['en-GB', 'en'],
      ['de-DE', 'de', 'en'],
      ['fr-FR', 'fr', 'en'],
      ['es-ES', 'es', 'en']
    ];

    const webglVendors = [
      'Intel Inc.',
      'NVIDIA Corporation',
      'AMD',
      'Qualcomm'
    ];

    const webglRenderers = [
      'Intel Iris OpenGL Engine',
      'NVIDIA GeForce GTX 1060',
      'AMD Radeon RX 580',
      'Qualcomm Adreno 640'
    ];

    const timezones = [
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Tokyo'
    ];

    const screens = [
      { width: 1920, height: 1080, colorDepth: 24 },
      { width: 1366, height: 768, colorDepth: 24 },
      { width: 1440, height: 900, colorDepth: 24 },
      { width: 2560, height: 1440, colorDepth: 24 }
    ];

    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const languageSet = languages[Math.floor(Math.random() * languages.length)];
    const screen = screens[Math.floor(Math.random() * screens.length)];

    // Generate realistic user agent based on platform
    let userAgent: string;
    switch (platform) {
      case 'Win32':
        userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        break;
      case 'MacIntel':
        userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        break;
      default:
        userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    return {
      userAgent,
      platform,
      languages: languageSet,
      webgl: {
        vendor: webglVendors[Math.floor(Math.random() * webglVendors.length)],
        renderer: webglRenderers[Math.floor(Math.random() * webglRenderers.length)]
      },
      canvas: Math.random().toString(36).substring(7),
      timezone: timezones[Math.floor(Math.random() * timezones.length)],
      screen,
      hardwareConcurrency: Math.pow(2, Math.floor(Math.random() * 4) + 1), // 2, 4, 8, 16
      deviceMemory: Math.pow(2, Math.floor(Math.random() * 3) + 2) // 4, 8, 16
    };
  }

  async goto(url: string, options?: any): Promise<Page> {
    const page = await this.newPage();
    
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
        ...options
      });
      
      return page;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      console.log('✅ Stealth browser closed');
    } catch (error) {
      console.error('❌ Error closing stealth browser:', error);
    }
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  getFingerprint(): BrowserFingerprint | null {
    return this.fingerprint;
  }
}

export default StealthBrowser;