// cloudflare-bypass-manager.ts
// Main manager that orchestrates all bypass methods

import StealthBrowser from './stealth-browser';
import FlareSolverrClient from './flaresolverr-client';
import ProxyManager, { ProxyConfig } from './proxy-manager';
import HttpBypass from './http-bypass';

export interface CloudflareBypassConfig {
  // Method priorities (1 = highest priority)
  methodPriority: ('stealth-browser' | 'flaresolverr' | 'http-bypass')[];
  
  // Browser settings
  browserConfig: {
    headless: boolean;
    browserType: 'chrome' | 'firefox' | 'safari';
    enableStealth: boolean;
    viewport: { width: number; height: number };
  };

  // FlareSolverr settings
  flareSolverrConfig: {
    endpoint: string;
    timeout: number;
    autoStart: boolean;
  };

  // Proxy settings
  proxyConfig: {
    enabled: boolean;
    rotation: boolean;
    providers: {
      brightData?: { username: string; password: string; zone?: string };
      oxylabs?: { username: string; password: string };
      smartProxy?: { username: string; password: string };
    };
  };

  // HTTP bypass settings
  httpConfig: {
    timeout: number;
    maxRetries: number;
    ja3Randomization: boolean;
  };

  // General settings
  maxAttempts: number;
  retryDelay: number;
  userAgent?: string;
  locale?: string;
  timezone?: string;
}

export interface BypassResult {
  success: boolean;
  method: string;
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  content: string;
  cookies: any[];
  responseTime: number;
  proxyUsed?: ProxyConfig;
  cloudflareDetected: boolean;
  error?: string;
}

export class CloudflareBypassManager {
  private config: CloudflareBypassConfig;
  private stealthBrowser: StealthBrowser | null = null;
  private flareSolverrClient: FlareSolverrClient | null = null;
  private proxyManager: ProxyManager | null = null;
  private httpBypass: HttpBypass | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<CloudflareBypassConfig> = {}) {
    this.config = {
      methodPriority: ['stealth-browser', 'flaresolverr', 'http-bypass'],
      browserConfig: {
        headless: true,
        browserType: 'chrome',
        enableStealth: true,
        viewport: { width: 1366, height: 768 }
      },
      flareSolverrConfig: {
        endpoint: 'http://localhost:8191/v1',
        timeout: 60000,
        autoStart: true
      },
      proxyConfig: {
        enabled: false,
        rotation: true,
        providers: {}
      },
      httpConfig: {
        timeout: 30000,
        maxRetries: 3,
        ja3Randomization: true
      },
      maxAttempts: 3,
      retryDelay: 5000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 Cloudflare Bypass Manager already initialized');
      return;
    }

    console.log('🚀 Initializing Cloudflare Bypass Manager...');

    try {
      // Initialize proxy manager if enabled
      if (this.config.proxyConfig.enabled) {
        await this.initializeProxyManager();
      }

      // Initialize FlareSolverr if in priority list
      if (this.config.methodPriority.includes('flaresolverr')) {
        await this.initializeFlareSolverr();
      }

      // Initialize HTTP bypass if in priority list
      if (this.config.methodPriority.includes('http-bypass')) {
        this.initializeHttpBypass();
      }

      // Stealth browser will be initialized on demand

      this.isInitialized = true;
      console.log('✅ Cloudflare Bypass Manager initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Cloudflare Bypass Manager:', error);
      throw error;
    }
  }

  private async initializeProxyManager(): Promise<void> {
    console.log('🔗 Initializing proxy manager...');
    this.proxyManager = new ProxyManager();

    const { providers } = this.config.proxyConfig;

    // Add configured proxy providers
    if (providers.brightData) {
      this.proxyManager.addBrightDataProvider(providers.brightData);
    }

    if (providers.oxylabs) {
      this.proxyManager.addOxylabsProvider(providers.oxylabs);
    }

    if (providers.smartProxy) {
      this.proxyManager.addSmartProxyProvider(providers.smartProxy);
    }

    // Initialize proxy pool
    await this.proxyManager.initializeProxies(20);
    console.log('✅ Proxy manager initialized');
  }

  private async initializeFlareSolverr(): Promise<void> {
    console.log('🔧 Initializing FlareSolverr...');
    
    this.flareSolverrClient = new FlareSolverrClient({
      endpoint: this.config.flareSolverrConfig.endpoint,
      timeout: this.config.flareSolverrConfig.timeout
    });

    // Check if FlareSolverr is running
    const isHealthy = await this.flareSolverrClient.checkHealth();
    
    if (!isHealthy && this.config.flareSolverrConfig.autoStart) {
      console.log('🐳 Starting FlareSolverr Docker container...');
      try {
        await FlareSolverrClient.startFlareSolverrContainer({
          port: 8191,
          logLevel: 'info'
        });
        
        // Wait for container to be ready
        await this.waitForFlareSolverr();
      } catch (error) {
        console.warn('⚠️ Failed to start FlareSolverr container:', error.message);
        console.log('📋 Please start FlareSolverr manually:');
        console.log('docker run -d --name flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest');
      }
    }

    console.log('✅ FlareSolverr initialized');
  }

  private initializeHttpBypass(): void {
    console.log('🌐 Initializing HTTP bypass...');
    
    const proxy = this.proxyManager?.getNextProxy();
    const proxyUrl = proxy ? this.proxyManager!.buildProxyUrl(proxy) : undefined;

    this.httpBypass = new HttpBypass({
      userAgent: this.config.userAgent,
      proxy: proxyUrl,
      timeout: this.config.httpConfig.timeout,
      maxRetries: this.config.httpConfig.maxRetries
    });

    console.log('✅ HTTP bypass initialized');
  }

  private async waitForFlareSolverr(maxWait: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const isHealthy = await this.flareSolverrClient!.checkHealth();
        if (isHealthy) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('FlareSolverr failed to start within timeout');
  }

  async bypassCloudflare(url: string, options: {
    method?: 'GET' | 'POST';
    data?: any;
    headers?: Record<string, string>;
    forceMethod?: string;
    maxAttempts?: number;
  } = {}): Promise<BypassResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`🔍 Starting Cloudflare bypass for: ${url}`);
    
    const methods = options.forceMethod ? 
      [options.forceMethod] : 
      this.config.methodPriority;

    const maxAttempts = options.maxAttempts || this.config.maxAttempts;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Bypass attempt ${attempt}/${maxAttempts}`);

      for (const method of methods) {
        try {
          console.log(`🎯 Trying method: ${method}`);
          
          const result = await this.attemptBypass(url, method, options);
          
          if (result.success && this.isValidBypassResult(result)) {
            console.log(`✅ Cloudflare bypass successful with ${method}`);
            return result;
          } else {
            console.log(`⚠️ Method ${method} failed validation`);
          }

        } catch (error) {
          console.log(`❌ Method ${method} failed:`, error.message);
          lastError = error;
        }
      }

      // Wait before next attempt
      if (attempt < maxAttempts) {
        console.log(`⏳ Waiting ${this.config.retryDelay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }

    throw lastError || new Error('All bypass methods failed');
  }

  private async attemptBypass(
    url: string, 
    method: string, 
    options: any
  ): Promise<BypassResult> {
    const startTime = Date.now();

    switch (method) {
      case 'stealth-browser':
        return await this.stealthBrowserBypass(url, options, startTime);
        
      case 'flaresolverr':
        return await this.flareSolverrBypass(url, options, startTime);
        
      case 'http-bypass':
        return await this.httpBypassMethod(url, options, startTime);
        
      default:
        throw new Error(`Unknown bypass method: ${method}`);
    }
  }

  private async stealthBrowserBypass(url: string, options: any, startTime: number): Promise<BypassResult> {
    if (!this.stealthBrowser) {
      const proxy = this.proxyManager?.getNextProxy();
      const proxyUrl = proxy ? this.proxyManager!.buildProxyUrl(proxy) : undefined;

      this.stealthBrowser = new StealthBrowser({
        ...this.config.browserConfig,
        proxyUrl,
        userAgent: this.config.userAgent,
        locale: this.config.locale,
        timezone: this.config.timezone
      });

      await this.stealthBrowser.initialize();
    }

    const page = await this.stealthBrowser.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    try {
      // Wait for potential Cloudflare challenge
      await page.waitForTimeout(5000);

      // Check if we're still on a challenge page
      const isChallengePage = await page.evaluate(() => {
        return document.body.innerHTML.includes('Checking your browser') ||
               document.body.innerHTML.includes('Just a moment') ||
               document.title.includes('Just a moment');
      });

      if (isChallengePage) {
        console.log('⏳ Cloudflare challenge detected, waiting...');
        await page.waitForNavigation({ timeout: 60000 });
      }

      const content = await page.content();
      const cookies = await page.context()?.cookies() || [];
      
      return {
        success: true,
        method: 'stealth-browser',
        url: page.url(),
        statusCode: 200,
        headers: {},
        content,
        cookies,
        responseTime: Date.now() - startTime,
        proxyUsed: this.proxyManager?.getNextProxy(),
        cloudflareDetected: isChallengePage
      };

    } finally {
      await page.close();
    }
  }

  private async flareSolverrBypass(url: string, options: any, startTime: number): Promise<BypassResult> {
    if (!this.flareSolverrClient) {
      throw new Error('FlareSolverr client not initialized');
    }

    const proxy = this.proxyManager?.getNextProxy();
    const proxyUrl = proxy ? this.proxyManager!.buildProxyUrl(proxy) : undefined;

    const result = await this.flareSolverrClient.solveCloudflare(url, undefined, {
      method: options.method || 'GET',
      headers: options.headers,
      postData: options.data ? JSON.stringify(options.data) : undefined,
      proxy: proxyUrl,
      userAgent: this.config.userAgent
    });

    return {
      success: result.status < 400,
      method: 'flaresolverr',
      url: result.url,
      statusCode: result.status,
      headers: result.headers,
      content: result.html,
      cookies: result.cookies,
      responseTime: Date.now() - startTime,
      proxyUsed: proxy,
      cloudflareDetected: result.html.includes('Cloudflare')
    };
  }

  private async httpBypassMethod(url: string, options: any, startTime: number): Promise<BypassResult> {
    if (!this.httpBypass) {
      throw new Error('HTTP bypass not initialized');
    }

    const result = await this.httpBypass.bypassCloudflare(url, {
      method: options.method || 'GET',
      data: options.data,
      headers: options.headers
    });

    return {
      success: result.success,
      method: 'http-bypass',
      url,
      statusCode: result.statusCode,
      headers: result.headers,
      content: result.body,
      cookies: result.cookies.map((cookie, index) => ({ name: `cookie_${index}`, value: cookie })),
      responseTime: result.responseTime,
      proxyUsed: this.proxyManager?.getNextProxy(),
      cloudflareDetected: !result.cloudflareBypass
    };
  }

  private isValidBypassResult(result: BypassResult): boolean {
    // Check for valid response
    if (!result.success || result.statusCode >= 500) {
      return false;
    }

    // Check content length
    if (result.content.length < 100) {
      return false;
    }

    // Check for Cloudflare challenge indicators
    const challengeIndicators = [
      'Checking your browser before accessing',
      'Please wait while we verify',
      'Just a moment',
      'Ray ID'
    ];

    return !challengeIndicators.some(indicator => 
      result.content.includes(indicator)
    );
  }

  // Get bypass statistics
  getStatistics(): {
    initialized: boolean;
    methods: string[];
    proxyStats?: any;
    flareSolverrHealth?: boolean;
  } {
    return {
      initialized: this.isInitialized,
      methods: this.config.methodPriority,
      proxyStats: this.proxyManager?.getStatistics(),
      flareSolverrHealth: this.flareSolverrClient ? true : false
    };
  }

  // Cleanup resources
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Cloudflare Bypass Manager...');

    try {
      if (this.stealthBrowser) {
        await this.stealthBrowser.close();
        this.stealthBrowser = null;
      }

      if (this.flareSolverrClient) {
        await this.flareSolverrClient.cleanup();
        this.flareSolverrClient = null;
      }

      if (this.proxyManager) {
        this.proxyManager.cleanup();
        this.proxyManager = null;
      }

      this.httpBypass = null;
      this.isInitialized = false;

      console.log('✅ Cloudflare Bypass Manager cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

export default CloudflareBypassManager;