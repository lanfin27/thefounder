// human-like-engine/index.ts
// Advanced Human-Like Scraping Engine with Natural Behavior Patterns

import { EventEmitter } from 'events';
import { Page, Browser, BrowserContext } from 'playwright';
import { WebSocket } from 'ws';

export interface HumanLikeConfig {
  mode: 'standard' | 'high-performance' | 'premium';
  targetListings?: number;
  naturalDelays: {
    min: number;
    max: number;
    readingTime: number; // ms per character
    scrollPause: number; // pause after scroll
  };
  mouseMovement: {
    enabled: boolean;
    naturalCurve: boolean;
    speed: 'slow' | 'normal' | 'fast';
  };
  stealth: {
    residential_proxy: boolean;
    fingerprint_rotation: boolean;
    webrtc_blocking: boolean;
    canvas_noise: boolean;
  };
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
    cooldownPeriod: number;
  };
  websocket?: {
    url: string;
    sessionId: string;
  };
}

export class HumanLikeScrapingEngine extends EventEmitter {
  private config: HumanLikeConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private currentPage: Page | null = null;
  private ws: WebSocket | null = null;
  
  // Behavior tracking
  private sessionStartTime: number = Date.now();
  private actionHistory: Array<{action: string, timestamp: number}> = [];
  private totalActions: number = 0;
  private lastActionTime: number = Date.now();
  
  // Rate limiting
  private requestTokens: number;
  private lastTokenRefill: number = Date.now();
  
  // Progress tracking
  private progress = {
    listingsScraped: 0,
    pagesVisited: 0,
    errors: 0,
    startTime: Date.now(),
    estimatedCompletion: null as Date | null
  };

  constructor(config: HumanLikeConfig) {
    super();
    this.config = this.normalizeConfig(config);
    this.requestTokens = this.config.rateLimiting.burstLimit;
    this.initializeWebSocket();
  }

  private normalizeConfig(config: HumanLikeConfig): HumanLikeConfig {
    const defaults: HumanLikeConfig = {
      mode: config.mode || 'standard',
      targetListings: config.targetListings || 1000,
      naturalDelays: {
        min: config.mode === 'standard' ? 2000 : 500,
        max: config.mode === 'standard' ? 5000 : 1500,
        readingTime: config.mode === 'premium' ? 50 : 20, // ms per character
        scrollPause: config.mode === 'standard' ? 1500 : 500
      },
      mouseMovement: {
        enabled: config.mode !== 'high-performance',
        naturalCurve: true,
        speed: config.mode === 'standard' ? 'slow' : 'normal'
      },
      stealth: {
        residential_proxy: true,
        fingerprint_rotation: true,
        webrtc_blocking: true,
        canvas_noise: true
      },
      rateLimiting: {
        requestsPerMinute: config.mode === 'high-performance' ? 120 : 30,
        burstLimit: config.mode === 'high-performance' ? 10 : 3,
        cooldownPeriod: 60000 // 1 minute
      },
      ...config
    };

    return defaults;
  }

  private initializeWebSocket() {
    if (!this.config.websocket) return;

    try {
      this.ws = new WebSocket(this.config.websocket.url);
      
      this.ws.on('open', () => {
        this.sendProgress('Connected to dashboard');
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  private sendProgress(message: string, data?: any) {
    const progressData = {
      sessionId: this.config.websocket?.sessionId,
      timestamp: Date.now(),
      message,
      progress: this.progress,
      metrics: {
        listingsPerMinute: this.calculateListingsPerMinute(),
        successRate: this.calculateSuccessRate(),
        averageDelay: this.calculateAverageDelay()
      },
      ...data
    };

    // Emit locally
    this.emit('progress', progressData);

    // Send via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'scraping_progress',
        data: progressData
      }));
    }
  }

  // Natural human-like delays
  private async humanDelay(context?: 'reading' | 'clicking' | 'scrolling' | 'typing') {
    const { naturalDelays } = this.config;
    let delay: number;

    switch (context) {
      case 'reading':
        // Variable reading speed based on content length
        delay = Math.random() * (naturalDelays.max - naturalDelays.min) + naturalDelays.min;
        break;
      case 'clicking':
        // Shorter delay before clicks
        delay = Math.random() * 1000 + 500;
        break;
      case 'scrolling':
        // Pause after scrolling
        delay = naturalDelays.scrollPause + Math.random() * 500;
        break;
      case 'typing':
        // Natural typing speed
        delay = Math.random() * 150 + 50;
        break;
      default:
        delay = Math.random() * (naturalDelays.max - naturalDelays.min) + naturalDelays.min;
    }

    // Add occasional longer pauses (human distraction)
    if (Math.random() < 0.1) {
      delay += Math.random() * 5000 + 3000;
      this.sendProgress('Taking a natural break...', { breakDuration: delay });
    }

    await this.sleep(delay);
  }

  // Natural mouse movement with Bezier curves
  private async moveMouseNaturally(page: Page, x: number, y: number) {
    if (!this.config.mouseMovement.enabled) {
      await page.mouse.move(x, y);
      return;
    }

    const steps = this.config.mouseMovement.speed === 'slow' ? 50 : 20;
    const currentPos = await page.evaluate(() => ({
      x: window.mouseX || 0,
      y: window.mouseY || 0
    }));

    // Generate control points for Bezier curve
    const cp1x = currentPos.x + (x - currentPos.x) * 0.25 + (Math.random() - 0.5) * 100;
    const cp1y = currentPos.y + (y - currentPos.y) * 0.25 + (Math.random() - 0.5) * 100;
    const cp2x = currentPos.x + (x - currentPos.x) * 0.75 + (Math.random() - 0.5) * 100;
    const cp2y = currentPos.y + (y - currentPos.y) * 0.75 + (Math.random() - 0.5) * 100;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bezierX = this.cubicBezier(currentPos.x, cp1x, cp2x, x, t);
      const bezierY = this.cubicBezier(currentPos.y, cp1y, cp2y, y, t);
      
      await page.mouse.move(bezierX, bezierY);
      await this.sleep(Math.random() * 20 + 10);
    }

    // Add small random movements at the end (hand tremor)
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(
        x + (Math.random() - 0.5) * 3,
        y + (Math.random() - 0.5) * 3
      );
      await this.sleep(50);
    }
  }

  private cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
  }

  // Natural scrolling behavior
  private async scrollNaturally(page: Page, direction: 'down' | 'up' = 'down') {
    const scrollAmount = Math.random() * 300 + 200;
    const scrollSteps = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < scrollSteps; i++) {
      const stepAmount = scrollAmount / scrollSteps + (Math.random() - 0.5) * 50;
      
      await page.evaluate((amount) => {
        window.scrollBy({
          top: amount,
          behavior: 'smooth'
        });
      }, direction === 'down' ? stepAmount : -stepAmount);
      
      await this.sleep(Math.random() * 200 + 100);
    }

    await this.humanDelay('scrolling');
  }

  // Rate limiting with token bucket algorithm
  private async checkRateLimit(): Promise<boolean> {
    const now = Date.now();
    const timeSinceRefill = now - this.lastTokenRefill;
    const tokensToAdd = Math.floor(timeSinceRefill / 60000 * this.config.rateLimiting.requestsPerMinute);
    
    if (tokensToAdd > 0) {
      this.requestTokens = Math.min(
        this.config.rateLimiting.burstLimit,
        this.requestTokens + tokensToAdd
      );
      this.lastTokenRefill = now;
    }

    if (this.requestTokens <= 0) {
      const waitTime = Math.ceil((1 - this.requestTokens) * 60000 / this.config.rateLimiting.requestsPerMinute);
      this.sendProgress(`Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`, {
        rateLimitWait: waitTime
      });
      await this.sleep(waitTime);
      return this.checkRateLimit();
    }

    this.requestTokens--;
    return true;
  }

  // Initialize browser with stealth configuration
  async initializeBrowser(playwright: any) {
    const { chromium } = playwright;
    
    // Stealth browser arguments
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      // Additional stealth flags
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ];

    if (this.config.stealth.webrtc_blocking) {
      args.push('--force-webrtc-ip-handling-policy=disable_non_proxied_udp');
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: this.config.mode === 'high-performance',
      args,
      // Proxy configuration would go here if using residential proxies
    });

    // Create context with fingerprint randomization
    this.context = await this.browser.newContext({
      viewport: this.getRandomViewport(),
      userAgent: this.getRandomUserAgent(),
      locale: this.getRandomLocale(),
      timezoneId: this.getRandomTimezone(),
      permissions: ['geolocation'],
      geolocation: this.getRandomGeolocation(),
      colorScheme: Math.random() > 0.5 ? 'light' : 'dark',
      deviceScaleFactor: Math.random() * 0.5 + 1,
      isMobile: false,
      hasTouch: false,
      javascriptEnabled: true,
      // Inject stealth scripts
      extraHTTPHeaders: {
        'Accept-Language': this.getRandomAcceptLanguage(),
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });

    // Add stealth scripts to every page
    await this.context.addInitScript(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      
      // Override chrome runtime
      window.chrome = { runtime: {} };
      
      // Canvas fingerprint noise
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const ctx = this.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.random() * 2 - 1;
            imageData.data[i + 1] += Math.random() * 2 - 1;
            imageData.data[i + 2] += Math.random() * 2 - 1;
          }
          ctx.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, args);
      };

      // Track mouse position for natural movement
      window.mouseX = 0;
      window.mouseY = 0;
      document.addEventListener('mousemove', (e) => {
        window.mouseX = e.clientX;
        window.mouseY = e.clientY;
      });
    });

    this.sendProgress('Browser initialized with stealth configuration');
  }

  // Get random viewport
  private getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1600, height: 900 },
      { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  // Get random user agent
  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // Get random locale
  private getRandomLocale(): string {
    const locales = ['en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ'];
    return locales[Math.floor(Math.random() * locales.length)];
  }

  // Get random timezone
  private getRandomTimezone(): string {
    const timezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'America/Detroit'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  // Get random geolocation
  private getRandomGeolocation() {
    const locations = [
      { latitude: 40.7128, longitude: -74.0060 }, // New York
      { latitude: 41.8781, longitude: -87.6298 }, // Chicago
      { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
      { latitude: 33.4484, longitude: -112.0740 }, // Phoenix
      { latitude: 42.3314, longitude: -83.0458 }, // Detroit
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  // Get random accept language
  private getRandomAcceptLanguage(): string {
    const languages = [
      'en-US,en;q=0.9',
      'en-US,en;q=0.9,es;q=0.8',
      'en-GB,en;q=0.9',
      'en-US,en;q=0.9,fr;q=0.8'
    ];
    return languages[Math.floor(Math.random() * languages.length)];
  }

  // Main scraping method
  async scrapeListing(url: string): Promise<any> {
    if (!this.context) {
      throw new Error('Browser not initialized');
    }

    await this.checkRateLimit();
    
    const page = await this.context.newPage();
    this.currentPage = page;
    
    try {
      // Human-like navigation
      await this.navigateHumanLike(page, url);
      
      // Extract data with human-like behavior
      const data = await this.extractDataHumanLike(page);
      
      // Update progress
      this.progress.listingsScraped++;
      this.sendProgress(`Scraped listing ${this.progress.listingsScraped}`, {
        listing: data
      });
      
      return data;
      
    } catch (error) {
      this.progress.errors++;
      this.sendProgress('Error scraping listing', { error: error.message });
      throw error;
    } finally {
      // Human-like tab closing
      await this.humanDelay();
      await page.close();
      this.currentPage = null;
    }
  }

  // Navigate with human-like behavior
  private async navigateHumanLike(page: Page, url: string) {
    // Simulate typing URL or clicking from search results
    if (Math.random() > 0.7 && this.progress.pagesVisited > 0) {
      // Sometimes navigate directly (as if from bookmark)
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    } else {
      // Navigate with referrer (as if from search/link)
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
        referer: 'https://www.google.com/'
      });
    }

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Human-like initial page interaction
    await this.humanDelay('reading');
    
    // Random initial scroll
    await this.scrollNaturally(page, 'down');
    
    this.progress.pagesVisited++;
  }

  // Extract data with human-like behavior
  private async extractDataHumanLike(page: Page): Promise<any> {
    const data: any = {};
    
    // Simulate reading the page title
    const title = await page.title();
    await this.humanDelay('reading');
    
    // Move mouse to interesting elements
    const elements = await page.$$('[data-test], [class*="price"], [class*="revenue"], h1, h2');
    
    for (const element of elements.slice(0, 5)) {
      const box = await element.boundingBox();
      if (box) {
        await this.moveMouseNaturally(page, 
          box.x + box.width / 2, 
          box.y + box.height / 2
        );
        await this.humanDelay('reading');
      }
    }
    
    // Extract data with error handling
    try {
      // Title
      data.title = await page.$eval('h1', el => el.textContent?.trim()).catch(() => title);
      
      // Price
      data.price = await page.$eval('[class*="price"], [data-test*="price"]', el => {
        const text = el.textContent || '';
        const match = text.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : null;
      }).catch(() => null);
      
      // Revenue
      data.monthly_revenue = await page.$eval('[class*="revenue"], [data-test*="revenue"]', el => {
        const text = el.textContent || '';
        const match = text.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : null;
      }).catch(() => null);
      
      // Scroll to load more content
      await this.scrollNaturally(page, 'down');
      
      // Multiple
      data.multiple = data.price && data.monthly_revenue 
        ? Math.round((data.price / data.monthly_revenue / 12) * 10) / 10 
        : null;
      
      // Category
      data.category = await page.$eval('[class*="category"], [data-test*="category"]', el => 
        el.textContent?.trim()
      ).catch(() => 'Unknown');
      
      // URL
      data.url = page.url();
      
      // Metadata
      data.scraped_at = new Date().toISOString();
      data.scraping_method = `human-like-${this.config.mode}`;
      data.quality_score = this.calculateQualityScore(data);
      
    } catch (error) {
      console.error('Data extraction error:', error);
    }
    
    return data;
  }

  // Calculate quality score
  private calculateQualityScore(data: any): number {
    let score = 0;
    const checks = [
      { field: 'title', weight: 25, valid: data.title && data.title.length > 5 },
      { field: 'price', weight: 25, valid: data.price && data.price > 500 },
      { field: 'monthly_revenue', weight: 20, valid: data.monthly_revenue && data.monthly_revenue > 0 },
      { field: 'multiple', weight: 15, valid: data.multiple && data.multiple > 0 },
      { field: 'category', weight: 10, valid: data.category && data.category !== 'Unknown' },
      { field: 'url', weight: 5, valid: data.url && data.url.includes('flippa') }
    ];

    checks.forEach(check => {
      if (check.valid) score += check.weight;
    });

    return score;
  }

  // Calculate metrics
  private calculateListingsPerMinute(): number {
    const elapsedMinutes = (Date.now() - this.progress.startTime) / 60000;
    return elapsedMinutes > 0 ? Math.round(this.progress.listingsScraped / elapsedMinutes) : 0;
  }

  private calculateSuccessRate(): number {
    const total = this.progress.listingsScraped + this.progress.errors;
    return total > 0 ? Math.round((this.progress.listingsScraped / total) * 100) : 100;
  }

  private calculateAverageDelay(): number {
    if (this.actionHistory.length < 2) return 0;
    
    let totalDelay = 0;
    for (let i = 1; i < this.actionHistory.length; i++) {
      totalDelay += this.actionHistory[i].timestamp - this.actionHistory[i-1].timestamp;
    }
    
    return Math.round(totalDelay / (this.actionHistory.length - 1));
  }

  // Sleep helper
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
  async close() {
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.currentPage) {
      await this.currentPage.close();
    }
    
    if (this.context) {
      await this.context.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    this.sendProgress('Scraping engine closed');
  }
}

export default HumanLikeScrapingEngine;