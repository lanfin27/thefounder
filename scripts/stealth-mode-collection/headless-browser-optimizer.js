// headless-browser-optimizer.js
// Headless browser optimization with JavaScript execution and CAPTCHA solving

const { chromium } = require('playwright');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

// Apply stealth plugins
puppeteer.use(StealthPlugin());
puppeteer.use(RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: process.env.CAPTCHA_API_KEY
  },
  visualFeedback: false
}));
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class HeadlessBrowserOptimizer {
  constructor(config = {}) {
    this.config = {
      headless: true,
      devtools: false,
      jsEnabled: true,
      imagesEnabled: false,
      cssEnabled: true,
      defaultTimeout: 30000,
      navigationTimeout: 60000,
      waitUntil: 'networkidle',
      viewport: { width: 1920, height: 1080 },
      captchaSolving: {
        enabled: true,
        providers: ['2captcha', 'anticaptcha', 'deathbycaptcha'],
        maxAttempts: 3,
        timeout: 120000
      },
      performance: {
        cacheEnabled: true,
        resourceBlocking: ['font', 'media'],
        lazyLoading: true,
        parallelRequests: 6
      },
      ...config
    };

    // Browser pool for concurrent operations
    this.browserPool = [];
    this.maxBrowsers = 5;
    
    // Page optimization strategies
    this.optimizationStrategies = this.initializeOptimizationStrategies();
    
    // JavaScript execution patterns
    this.jsExecutionPatterns = this.initializeJSPatterns();
    
    // CAPTCHA detection patterns
    this.captchaPatterns = this.initializeCaptchaPatterns();
    
    // Performance metrics
    this.metrics = {
      pageLoads: 0,
      jsExecutions: 0,
      captchasSolved: 0,
      avgLoadTime: 0,
      resourcesSaved: 0
    };
  }

  initializeOptimizationStrategies() {
    return {
      minimal: {
        images: false,
        css: false,
        fonts: false,
        media: false,
        scripts: ['analytics', 'tracking', 'social']
      },
      
      balanced: {
        images: false,
        css: true,
        fonts: false,
        media: false,
        scripts: ['analytics', 'tracking']
      },
      
      full: {
        images: true,
        css: true,
        fonts: true,
        media: true,
        scripts: []
      },
      
      smart: {
        images: 'lazy',
        css: true,
        fonts: 'subset',
        media: false,
        scripts: ['non-critical']
      }
    };
  }

  initializeJSPatterns() {
    return {
      // Common JavaScript operations
      scrollPatterns: {
        smooth: 'window.scrollTo({ top: %d, behavior: "smooth" })',
        instant: 'window.scrollTo(0, %d)',
        element: 'document.querySelector("%s").scrollIntoView({ behavior: "smooth" })',
        lazy: 'window.scrollBy(0, %d)'
      },
      
      waitPatterns: {
        element: 'document.querySelector("%s") !== null',
        text: 'document.body.innerText.includes("%s")',
        attribute: 'document.querySelector("%s").getAttribute("%s") === "%s"',
        custom: '%s'
      },
      
      interactionPatterns: {
        click: 'document.querySelector("%s").click()',
        hover: `
          const el = document.querySelector("%s");
          const event = new MouseEvent("mouseover", { bubbles: true });
          el.dispatchEvent(event);
        `,
        focus: 'document.querySelector("%s").focus()',
        input: 'document.querySelector("%s").value = "%s"'
      },
      
      extractionPatterns: {
        text: 'document.querySelector("%s")?.innerText',
        attribute: 'document.querySelector("%s")?.getAttribute("%s")',
        all: 'Array.from(document.querySelectorAll("%s")).map(el => el.%s)',
        table: `
          Array.from(document.querySelectorAll("table tr")).map(row =>
            Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText.trim())
          )
        `
      }
    };
  }

  initializeCaptchaPatterns() {
    return {
      recaptcha: {
        v2: {
          selectors: ['iframe[src*="recaptcha"]', '.g-recaptcha', '#g-recaptcha'],
          detection: 'window.grecaptcha !== undefined',
          sitekey: 'document.querySelector("[data-sitekey]")?.getAttribute("data-sitekey")'
        },
        v3: {
          detection: 'window.grecaptcha && window.grecaptcha.execute',
          action: 'document.querySelector("[data-action]")?.getAttribute("data-action")'
        }
      },
      
      hcaptcha: {
        selectors: ['iframe[src*="hcaptcha"]', '.h-captcha', '[data-hcaptcha-widget-id]'],
        detection: 'window.hcaptcha !== undefined',
        sitekey: 'document.querySelector("[data-sitekey]")?.getAttribute("data-sitekey")'
      },
      
      cloudflare: {
        selectors: ['.cf-challenge-form', '#cf-wrapper', '.cf-browser-verification'],
        detection: 'document.title.includes("Just a moment") || document.querySelector(".cf-challenge-form")',
        challenge: 'document.querySelector("[name=cf_captcha_kind]")?.value'
      },
      
      custom: {
        imageBasic: 'img[src*="captcha"], img[alt*="captcha"], .captcha-image',
        mathProblem: /(\d+)\s*[+\-*/]\s*(\d+)\s*=/,
        slideVerify: '.slide-verify, .slider-captcha, [class*="slide-captcha"]'
      }
    };
  }

  async createOptimizedBrowser(options = {}) {
    const { strategy = 'balanced', proxy = null, fingerprint = null } = options;
    
    console.log(`🚀 Creating optimized ${this.config.headless ? 'headless' : 'headed'} browser...`);
    
    const optimization = this.optimizationStrategies[strategy];
    
    // Browser launch arguments
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled',
      `--window-size=${this.config.viewport.width},${this.config.viewport.height}`,
      '--start-maximized'
    ];
    
    // Performance optimizations
    if (!optimization.images) args.push('--disable-images');
    if (!optimization.css) args.push('--disable-css');
    if (this.config.performance.cacheEnabled) {
      args.push('--aggressive-cache-discard');
      args.push('--disable-background-timer-throttling');
    }
    
    // Proxy configuration
    if (proxy) {
      args.push(`--proxy-server=${proxy.server}`);
    }
    
    // Use Playwright for better control
    const browser = await chromium.launch({
      headless: this.config.headless,
      args,
      devtools: this.config.devtools,
      downloadsPath: './downloads',
      proxy: proxy ? this.convertProxyFormat(proxy) : undefined
    });
    
    // Create optimized context
    const context = await this.createOptimizedContext(browser, { fingerprint, optimization });
    
    // Add to pool
    if (this.browserPool.length < this.maxBrowsers) {
      this.browserPool.push({ browser, context, strategy, created: Date.now() });
    }
    
    return { browser, context };
  }

  async createOptimizedContext(browser, options = {}) {
    const { fingerprint, optimization } = options;
    
    const contextOptions = {
      viewport: this.config.viewport,
      userAgent: fingerprint?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale: fingerprint?.locale || 'en-US',
      timezoneId: fingerprint?.timezone || 'America/New_York',
      permissions: ['geolocation', 'notifications'],
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      forcedColors: 'none',
      javascriptEnabled: this.config.jsEnabled,
      offline: false,
      httpCredentials: options.httpCredentials,
      deviceScaleFactor: fingerprint?.screen?.pixelRatio || 1,
      isMobile: false,
      hasTouch: false
    };
    
    const context = await browser.newContext(contextOptions);
    
    // Apply optimizations
    await this.applyContextOptimizations(context, optimization);
    
    // Set up request interception
    await this.setupRequestInterception(context, optimization);
    
    return context;
  }

  async applyContextOptimizations(context, optimization) {
    // Block unnecessary resources
    await context.route('**/*', (route) => {
      const url = route.request().url();
      const resourceType = route.request().resourceType();
      
      // Block based on resource type
      if (!optimization.images && resourceType === 'image') {
        return route.abort();
      }
      if (!optimization.fonts && resourceType === 'font') {
        return route.abort();
      }
      if (!optimization.media && ['media', 'video', 'audio'].includes(resourceType)) {
        return route.abort();
      }
      
      // Block tracking scripts
      const blockedDomains = [
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com/tr',
        'doubleclick.net',
        'scorecardresearch.com',
        'quantserve.com',
        'adsystem.com'
      ];
      
      if (blockedDomains.some(domain => url.includes(domain))) {
        this.metrics.resourcesSaved++;
        return route.abort();
      }
      
      // Continue with request
      route.continue();
    });
    
    // Add stealth scripts
    await context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // Chrome specific
      window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: {}
      };
      
      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery(parameters);
      };
      
      // Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin' },
          { name: 'Chrome PDF Viewer' },
          { name: 'Native Client' }
        ]
      });
      
      // WebGL Vendor
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, arguments);
      };
    });
  }

  async setupRequestInterception(context, optimization) {
    // Modify headers for all requests
    await context.route('**/*', async (route) => {
      const headers = {
        ...route.request().headers(),
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
      
      // Remove automation headers
      delete headers['sec-ch-ua-platform'];
      
      await route.continue({ headers });
    });
  }

  async createOptimizedPage(context, options = {}) {
    const page = await context.newPage();
    
    // Apply page-level optimizations
    await this.optimizePage(page, options);
    
    // Set up intelligent waiting
    this.setupIntelligentWaiting(page);
    
    // Set up CAPTCHA detection
    this.setupCaptchaDetection(page);
    
    return page;
  }

  async optimizePage(page, options = {}) {
    const { blockAds = true, blockTrackers = true } = options;
    
    // Set default timeouts
    page.setDefaultTimeout(this.config.defaultTimeout);
    page.setDefaultNavigationTimeout(this.config.navigationTimeout);
    
    // Enable request interception for fine control
    if (blockAds || blockTrackers) {
      await page.route('**/*', (route) => {
        const url = route.request().url();
        
        // Block ads
        if (blockAds && this.isAdUrl(url)) {
          return route.abort();
        }
        
        // Block trackers
        if (blockTrackers && this.isTrackerUrl(url)) {
          return route.abort();
        }
        
        route.continue();
      });
    }
    
    // Inject helpful utilities
    await page.addInitScript(() => {
      // Add custom wait function
      window.waitForElement = (selector, timeout = 30000) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          
          const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
              resolve(element);
            } else if (Date.now() - startTime > timeout) {
              reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            } else {
              requestAnimationFrame(checkElement);
            }
          };
          
          checkElement();
        });
      };
      
      // Add visibility check
      window.isElementVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return rect.width > 0 &&
               rect.height > 0 &&
               rect.top < window.innerHeight &&
               rect.bottom > 0 &&
               rect.left < window.innerWidth &&
               rect.right > 0 &&
               style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
      };
      
      // Add smooth scroll
      window.smoothScrollTo = (y, duration = 1000) => {
        const startY = window.pageYOffset;
        const difference = y - startY;
        const startTime = performance.now();
        
        const step = () => {
          const progress = (performance.now() - startTime) / duration;
          const amount = startY + difference * Math.min(progress, 1);
          
          window.scrollTo(0, amount);
          
          if (progress < 1) {
            requestAnimationFrame(step);
          }
        };
        
        requestAnimationFrame(step);
      };
    });
  }

  setupIntelligentWaiting(page) {
    // Override waitForSelector with intelligent waiting
    const originalWaitForSelector = page.waitForSelector.bind(page);
    
    page.waitForSelector = async (selector, options = {}) => {
      const { visible = false, timeout = 30000 } = options;
      
      try {
        // First, wait for element to appear in DOM
        await originalWaitForSelector(selector, { timeout: timeout / 2 });
        
        // If visibility required, wait for it
        if (visible) {
          await page.waitForFunction(
            `window.isElementVisible(document.querySelector("${selector}"))`,
            { timeout: timeout / 2 }
          );
        }
        
        // Additional stability wait
        await page.waitForTimeout(100);
        
        return await page.$(selector);
      } catch (error) {
        console.error(`Failed to wait for selector ${selector}:`, error.message);
        throw error;
      }
    };
    
    // Add custom wait methods
    page.waitForText = async (text, options = {}) => {
      const { timeout = 30000, exact = false } = options;
      
      return await page.waitForFunction(
        exact 
          ? `document.body.innerText === "${text}"`
          : `document.body.innerText.includes("${text}")`,
        { timeout }
      );
    };
    
    page.waitForNetworkIdle = async (options = {}) => {
      const { timeout = 30000, maxInflightRequests = 0 } = options;
      
      return await page.waitForLoadState('networkidle', { timeout });
    };
    
    page.waitForDOMStable = async (options = {}) => {
      const { timeout = 5000, threshold = 3 } = options;
      
      return await page.evaluate(({ timeout, threshold }) => {
        return new Promise((resolve) => {
          let mutations = 0;
          let timeoutId;
          
          const observer = new MutationObserver(() => {
            mutations++;
            clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
              if (mutations < threshold) {
                observer.disconnect();
                resolve();
              }
              mutations = 0;
            }, 500);
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
          });
          
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, timeout);
        });
      }, { timeout, threshold });
    };
  }

  setupCaptchaDetection(page) {
    // Monitor for CAPTCHA appearance
    page.on('framenavigated', async (frame) => {
      if (frame.url().includes('recaptcha') || frame.url().includes('hcaptcha')) {
        console.log('🔍 CAPTCHA detected on page');
        if (this.config.captchaSolving.enabled) {
          await this.handleCaptcha(page);
        }
      }
    });
    
    // Check for CAPTCHA on page load
    page.on('load', async () => {
      const hasCaptcha = await this.detectCaptcha(page);
      if (hasCaptcha && this.config.captchaSolving.enabled) {
        await this.handleCaptcha(page);
      }
    });
  }

  async detectCaptcha(page) {
    for (const [type, patterns] of Object.entries(this.captchaPatterns)) {
      if (type === 'custom') continue;
      
      for (const [version, config] of Object.entries(patterns)) {
        try {
          const detected = await page.evaluate(config.detection);
          if (detected) {
            console.log(`🎯 Detected ${type} ${version} CAPTCHA`);
            return { type, version, config };
          }
        } catch (error) {
          // Continue checking
        }
      }
    }
    
    // Check for custom CAPTCHAs
    const customSelectors = Object.values(this.captchaPatterns.custom);
    for (const selector of customSelectors) {
      if (typeof selector === 'string') {
        const element = await page.$(selector);
        if (element) {
          console.log('🎯 Detected custom CAPTCHA');
          return { type: 'custom', selector };
        }
      }
    }
    
    return null;
  }

  async handleCaptcha(page) {
    const captchaInfo = await this.detectCaptcha(page);
    if (!captchaInfo) return;
    
    console.log('🤖 Attempting to solve CAPTCHA...');
    
    const startTime = Date.now();
    let solved = false;
    let attempts = 0;
    
    while (!solved && attempts < this.config.captchaSolving.maxAttempts) {
      attempts++;
      
      try {
        switch (captchaInfo.type) {
          case 'recaptcha':
            solved = await this.solveRecaptcha(page, captchaInfo);
            break;
            
          case 'hcaptcha':
            solved = await this.solveHcaptcha(page, captchaInfo);
            break;
            
          case 'cloudflare':
            solved = await this.solveCloudflare(page, captchaInfo);
            break;
            
          case 'custom':
            solved = await this.solveCustomCaptcha(page, captchaInfo);
            break;
        }
        
        if (solved) {
          const duration = Date.now() - startTime;
          console.log(`✅ CAPTCHA solved in ${duration}ms`);
          this.metrics.captchasSolved++;
        }
        
      } catch (error) {
        console.error(`CAPTCHA solving attempt ${attempts} failed:`, error.message);
        await page.waitForTimeout(5000); // Wait before retry
      }
    }
    
    if (!solved) {
      throw new Error('Failed to solve CAPTCHA after maximum attempts');
    }
    
    return solved;
  }

  async solveRecaptcha(page, captchaInfo) {
    // Get site key
    const siteKey = await page.evaluate(captchaInfo.config.sitekey);
    if (!siteKey) throw new Error('Could not find reCAPTCHA site key');
    
    // Use 2captcha service
    const solution = await this.solveCaptchaWith2Captcha({
      type: 'recaptcha',
      sitekey: siteKey,
      pageurl: page.url()
    });
    
    // Inject solution
    await page.evaluate((token) => {
      document.querySelector('[name="g-recaptcha-response"]').value = token;
      if (window.grecaptcha) {
        window.grecaptcha.getResponse = () => token;
      }
    }, solution);
    
    // Trigger callback if exists
    await page.evaluate(() => {
      const callback = window.___grecaptcha_cfg?.clients?.[0]?.callback;
      if (callback) callback();
    });
    
    return true;
  }

  async solveHcaptcha(page, captchaInfo) {
    const siteKey = await page.evaluate(captchaInfo.config.sitekey);
    if (!siteKey) throw new Error('Could not find hCaptcha site key');
    
    const solution = await this.solveCaptchaWith2Captcha({
      type: 'hcaptcha',
      sitekey: siteKey,
      pageurl: page.url()
    });
    
    await page.evaluate((token) => {
      document.querySelector('[name="h-captcha-response"]').value = token;
      document.querySelector('[name="g-recaptcha-response"]').value = token;
      if (window.hcaptcha) {
        window.hcaptcha.getResponse = () => token;
      }
    }, solution);
    
    return true;
  }

  async solveCloudflare(page, captchaInfo) {
    // Cloudflare challenges are more complex
    console.log('⏳ Waiting for Cloudflare challenge...');
    
    // Wait for challenge to complete
    await page.waitForFunction(
      () => !document.querySelector('.cf-challenge-form'),
      { timeout: 30000 }
    );
    
    return true;
  }

  async solveCustomCaptcha(page, captchaInfo) {
    // Handle custom CAPTCHA types
    if (captchaInfo.selector.includes('slide')) {
      return await this.solveSlideCaptcha(page, captchaInfo.selector);
    }
    
    // Image CAPTCHA
    const captchaImage = await page.$(captchaInfo.selector);
    if (captchaImage) {
      const screenshot = await captchaImage.screenshot();
      const solution = await this.solveCaptchaWith2Captcha({
        type: 'image',
        body: screenshot.toString('base64')
      });
      
      // Find input field and enter solution
      const input = await page.$('input[type="text"][name*="captcha"]');
      if (input) {
        await input.type(solution);
      }
      
      return true;
    }
    
    return false;
  }

  async solveSlideCaptcha(page, selector) {
    const slider = await page.$(selector);
    if (!slider) return false;
    
    const box = await slider.boundingBox();
    const startX = box.x + 10;
    const startY = box.y + box.height / 2;
    const endX = box.x + box.width - 10;
    
    // Simulate human-like drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // Move with variations
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = startX + (endX - startX) * progress;
      const y = startY + Math.sin(progress * Math.PI * 4) * 2; // Small sine wave
      
      await page.mouse.move(x, y);
      await page.waitForTimeout(10 + Math.random() * 20);
    }
    
    await page.mouse.up();
    return true;
  }

  async solveCaptchaWith2Captcha(params) {
    // Simulate 2captcha API (replace with actual implementation)
    console.log('📤 Sending CAPTCHA to solving service...');
    
    // In production, this would make actual API calls
    await new Promise(resolve => setTimeout(resolve, 15000)); // Simulate solving time
    
    // Return mock solution
    return 'MOCK_CAPTCHA_SOLUTION_TOKEN';
  }

  async executeJavaScript(page, pattern, ...args) {
    const jsCode = this.jsExecutionPatterns[pattern.category][pattern.type];
    const formattedCode = this.formatJSCode(jsCode, args);
    
    try {
      const result = await page.evaluate(formattedCode);
      this.metrics.jsExecutions++;
      return result;
    } catch (error) {
      console.error('JS execution failed:', error.message);
      throw error;
    }
  }

  formatJSCode(template, args) {
    let code = template;
    
    // Replace placeholders
    args.forEach((arg, index) => {
      code = code.replace(/%[sd]/, arg);
    });
    
    return code;
  }

  async navigateWithPatience(page, url, options = {}) {
    const {
      waitUntil = this.config.waitUntil,
      timeout = this.config.navigationTimeout,
      retries = 3
    } = options;
    
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🌐 Navigating to ${url} (attempt ${attempt}/${retries})...`);
        
        const startTime = Date.now();
        
        // Navigate with comprehensive wait conditions
        await page.goto(url, {
          waitUntil: waitUntil,
          timeout: timeout
        });
        
        // Additional stability checks
        await this.ensurePageStability(page);
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ Page loaded in ${loadTime}ms`);
        
        // Update metrics
        this.metrics.pageLoads++;
        this.metrics.avgLoadTime = (this.metrics.avgLoadTime * (this.metrics.pageLoads - 1) + loadTime) / this.metrics.pageLoads;
        
        return true;
        
      } catch (error) {
        lastError = error;
        console.error(`Navigation attempt ${attempt} failed:`, error.message);
        
        if (attempt < retries) {
          // Wait before retry with exponential backoff
          await page.waitForTimeout(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError;
  }

  async ensurePageStability(page) {
    // Wait for critical resources
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for network to settle
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // Network might not settle completely, continue
    }
    
    // Check for common loading indicators
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '[class*="load"]',
      '[class*="spin"]',
      '.skeleton'
    ];
    
    for (const selector of loadingSelectors) {
      try {
        await page.waitForSelector(selector, { state: 'hidden', timeout: 1000 });
      } catch {
        // Selector might not exist, continue
      }
    }
    
    // Ensure JavaScript has settled
    await page.waitForTimeout(500);
  }

  isAdUrl(url) {
    const adDomains = [
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'google-analytics.com',
      'amazon-adsystem.com',
      'facebook.com/tr',
      'adsystem.com',
      'adsrvr.org',
      'adzerk.net',
      'outbrain.com',
      'taboola.com'
    ];
    
    return adDomains.some(domain => url.includes(domain));
  }

  isTrackerUrl(url) {
    const trackerDomains = [
      'google-analytics.com',
      'googletagmanager.com',
      'segment.io',
      'hotjar.com',
      'mixpanel.com',
      'heap.io',
      'intercom.io',
      'drift.com',
      'crisp.chat'
    ];
    
    return trackerDomains.some(domain => url.includes(domain));
  }

  convertProxyFormat(proxy) {
    return {
      server: proxy.server,
      username: proxy.username,
      password: proxy.password,
      bypass: proxy.bypass || []
    };
  }

  async closeBrowser(browser) {
    try {
      await browser.close();
      
      // Remove from pool
      this.browserPool = this.browserPool.filter(b => b.browser !== browser);
      
    } catch (error) {
      console.error('Error closing browser:', error.message);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      poolSize: this.browserPool.length,
      avgLoadTimeSeconds: (this.metrics.avgLoadTime / 1000).toFixed(2),
      resourcesSavedMB: (this.metrics.resourcesSaved * 0.1).toFixed(2) // Estimate
    };
  }
}

module.exports = HeadlessBrowserOptimizer;