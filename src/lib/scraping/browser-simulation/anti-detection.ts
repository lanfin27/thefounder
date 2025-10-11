// anti-detection.ts
// Advanced anti-detection mechanisms including CAPTCHA solving and behavior adaptation

import { Page, BrowserContext } from 'playwright';
import { BrowsingPersona } from './personas';
import { SessionManager, BrowsingSession } from './session-manager';

export interface CaptchaChallenge {
  type: 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'custom' | 'unknown';
  detected: boolean;
  element: string | null;
  confidence: number;
}

export interface DetectionSignal {
  type: 'behavioral' | 'technical' | 'rate_limit' | 'challenge';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  adaptationSuggestion: string;
}

export interface BehaviorAdaptation {
  speedReduction: number;
  pauseIncrease: number;
  randomizationFactor: number;
  backoffDuration: number;
  switchPersona: boolean;
}

export class AntiDetectionEngine {
  private detectionHistory: DetectionSignal[] = [];
  private adaptationLevel: number = 0; // 0-10 scale
  private captchaSolvers: Map<string, Function> = new Map();
  private fingerprintRotation: number = 0;
  private behaviorPatterns: Map<string, any> = new Map();
  
  constructor(
    private persona: BrowsingPersona,
    private sessionManager: SessionManager
  ) {
    this.initializeCaptchaSolvers();
  }

  private initializeCaptchaSolvers() {
    // Basic CAPTCHA detection patterns
    this.captchaSolvers.set('recaptcha', this.handleRecaptcha.bind(this));
    this.captchaSolvers.set('hcaptcha', this.handleHcaptcha.bind(this));
    this.captchaSolvers.set('cloudflare', this.handleCloudflare.bind(this));
  }

  async detectCaptcha(page: Page): Promise<CaptchaChallenge> {
    const captchaSelectors = {
      recaptcha: [
        'iframe[src*="recaptcha"]',
        '.g-recaptcha',
        '#g-recaptcha',
        '[data-sitekey]'
      ],
      hcaptcha: [
        'iframe[src*="hcaptcha"]',
        '.h-captcha',
        '[data-hcaptcha-sitekey]'
      ],
      cloudflare: [
        '.cf-challenge-running',
        '#cf-wrapper',
        '.cf-browser-verification'
      ]
    };

    for (const [type, selectors] of Object.entries(captchaSelectors)) {
      for (const selector of selectors) {
        const element = await page.$(selector);
        if (element) {
          return {
            type: type as CaptchaChallenge['type'],
            detected: true,
            element: selector,
            confidence: 0.9
          };
        }
      }
    }

    // Check for generic challenge indicators
    const challengeIndicators = [
      'verify you are human',
      'complete the captcha',
      'security check',
      'bot detection',
      'access denied'
    ];

    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    
    for (const indicator of challengeIndicators) {
      if (pageText.includes(indicator)) {
        return {
          type: 'custom',
          detected: true,
          element: null,
          confidence: 0.7
        };
      }
    }

    return {
      type: 'unknown',
      detected: false,
      element: null,
      confidence: 0
    };
  }

  async monitorDetectionSignals(page: Page): Promise<DetectionSignal[]> {
    const signals: DetectionSignal[] = [];

    // Check for rate limiting
    const rateLimitHeaders = await page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="refresh"]');
      return meta ? meta.getAttribute('content') : null;
    });

    if (rateLimitHeaders) {
      signals.push({
        type: 'rate_limit',
        severity: 'high',
        description: 'Rate limit detected via meta refresh',
        timestamp: new Date(),
        adaptationSuggestion: 'Increase delays and reduce request frequency'
      });
    }

    // Check for behavioral detection
    const suspiciousScripts = await page.$$eval('script', scripts => 
      scripts.some(s => s.innerHTML.includes('fingerprint') || 
                       s.innerHTML.includes('bot-detection') ||
                       s.innerHTML.includes('behavior-analysis'))
    );

    if (suspiciousScripts) {
      signals.push({
        type: 'behavioral',
        severity: 'medium',
        description: 'Behavioral analysis scripts detected',
        timestamp: new Date(),
        adaptationSuggestion: 'Add more human-like variations to interactions'
      });
    }

    // Check response times
    const navigationTiming = await page.evaluate(() => {
      const timing = performance.timing;
      return timing.loadEventEnd - timing.navigationStart;
    });

    if (navigationTiming > 10000) { // Slow response
      signals.push({
        type: 'technical',
        severity: 'low',
        description: 'Slow page load detected, possible rate limiting',
        timestamp: new Date(),
        adaptationSuggestion: 'Reduce request frequency'
      });
    }

    // Check for honeypot elements
    const honeypots = await page.$$eval('[style*="display:none"], [style*="visibility:hidden"]', elements => 
      elements.filter(el => el.tagName === 'INPUT' || el.tagName === 'BUTTON').length
    );

    if (honeypots > 0) {
      signals.push({
        type: 'technical',
        severity: 'medium',
        description: 'Honeypot elements detected',
        timestamp: new Date(),
        adaptationSuggestion: 'Avoid interacting with hidden elements'
      });
    }

    this.detectionHistory.push(...signals);
    return signals;
  }

  async adaptBehavior(signals: DetectionSignal[]): Promise<BehaviorAdaptation> {
    const adaptation: BehaviorAdaptation = {
      speedReduction: 1,
      pauseIncrease: 1,
      randomizationFactor: 0,
      backoffDuration: 0,
      switchPersona: false
    };

    // Calculate adaptation based on signals
    for (const signal of signals) {
      switch (signal.severity) {
        case 'critical':
          adaptation.speedReduction *= 0.3;
          adaptation.pauseIncrease *= 3;
          adaptation.randomizationFactor += 0.5;
          adaptation.backoffDuration += 300000; // 5 minutes
          adaptation.switchPersona = true;
          break;
        case 'high':
          adaptation.speedReduction *= 0.5;
          adaptation.pauseIncrease *= 2;
          adaptation.randomizationFactor += 0.3;
          adaptation.backoffDuration += 120000; // 2 minutes
          break;
        case 'medium':
          adaptation.speedReduction *= 0.7;
          adaptation.pauseIncrease *= 1.5;
          adaptation.randomizationFactor += 0.2;
          adaptation.backoffDuration += 60000; // 1 minute
          break;
        case 'low':
          adaptation.speedReduction *= 0.9;
          adaptation.pauseIncrease *= 1.2;
          adaptation.randomizationFactor += 0.1;
          adaptation.backoffDuration += 30000; // 30 seconds
          break;
      }
    }

    // Update adaptation level
    this.adaptationLevel = Math.min(10, this.adaptationLevel + signals.length);

    return adaptation;
  }

  async solveCaptcha(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    console.log(`Attempting to solve ${challenge.type} CAPTCHA`);

    // Apply human-like behavior before attempting
    await this.simulateHumanReaction(page);

    const solver = this.captchaSolvers.get(challenge.type);
    if (solver) {
      return await solver(page, challenge);
    }

    // Generic fallback approach
    return await this.genericCaptchaApproach(page, challenge);
  }

  private async simulateHumanReaction(page: Page) {
    // Simulate surprise/confusion at seeing CAPTCHA
    await page.waitForTimeout(2000 + Math.random() * 3000);
    
    // Random mouse movements showing hesitation
    const viewport = page.viewportSize() || { width: 1920, height: 1080 };
    
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(
        Math.random() * viewport.width,
        Math.random() * viewport.height
      );
      await page.waitForTimeout(300 + Math.random() * 500);
    }
  }

  private async handleRecaptcha(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    try {
      // Wait for reCAPTCHA frame
      const recaptchaFrame = await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 5000 });
      
      if (!recaptchaFrame) return false;

      // Click checkbox with human-like behavior
      const checkbox = await page.$('.recaptcha-checkbox, #recaptcha-anchor');
      if (checkbox) {
        const box = await checkbox.boundingBox();
        if (box) {
          // Move mouse naturally to checkbox
          await this.moveMouseNaturally(page, box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(500 + Math.random() * 1000);
          await checkbox.click();
        }
      }

      // Wait for potential image challenge
      await page.waitForTimeout(3000);

      // Check if solved
      const solved = await page.evaluate(() => {
        const response = document.querySelector('[name="g-recaptcha-response"]') as HTMLTextAreaElement;
        return response && response.value.length > 0;
      });

      return solved;
    } catch (error) {
      console.error('reCAPTCHA solving failed:', error);
      return false;
    }
  }

  private async handleHcaptcha(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    try {
      // Similar approach to reCAPTCHA
      const hcaptchaFrame = await page.waitForSelector('iframe[src*="hcaptcha"]', { timeout: 5000 });
      
      if (!hcaptchaFrame) return false;

      // Look for checkbox
      const checkbox = await page.$('[id*="checkbox"]');
      if (checkbox) {
        await checkbox.click();
        await page.waitForTimeout(3000);
      }

      return false; // Would need actual solving service
    } catch (error) {
      console.error('hCaptcha solving failed:', error);
      return false;
    }
  }

  private async handleCloudflare(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    try {
      // Cloudflare typically auto-solves with proper browser
      console.log('Waiting for Cloudflare challenge to complete...');
      
      // Wait for challenge to complete
      await page.waitForFunction(
        () => !document.querySelector('.cf-challenge-running'),
        { timeout: 30000 }
      );

      return true;
    } catch (error) {
      console.error('Cloudflare challenge failed:', error);
      return false;
    }
  }

  private async genericCaptchaApproach(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    // Generic approach: wait and check if it auto-resolves
    console.log('Attempting generic CAPTCHA approach...');
    
    await page.waitForTimeout(5000 + Math.random() * 5000);
    
    // Check if we're still on CAPTCHA page
    const stillCaptcha = await this.detectCaptcha(page);
    return !stillCaptcha.detected;
  }

  async enhanceBrowserFingerprint(context: BrowserContext) {
    // Rotate user agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
    ];

    const selectedUA = userAgents[this.fingerprintRotation % userAgents.length];
    this.fingerprintRotation++;

    // Override fingerprinting APIs
    await context.addInitScript(() => {
      // Override WebGL fingerprinting
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, arguments as any);
      };

      // Override Canvas fingerprinting
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
        const args = arguments;
        setTimeout(() => {
          toBlob.apply(this, args as any);
        }, Math.random() * 10);
      };

      // Add realistic window properties
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          runtime: {},
          loadTimes: () => ({}),
          csi: () => ({})
        })
      });

      // Override timezone detection
      const DateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(...args) {
        if (args.length === 0) {
          args = ['en-US', { timeZone: 'America/New_York' }];
        }
        return DateTimeFormat.apply(this, args as any);
      };

      // Add realistic navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => [{
          name: 'Chrome PDF Plugin',
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1
        }]
      });

      // Add battery API
      Object.defineProperty(navigator, 'getBattery', {
        get: () => () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.98
        })
      });
    });
  }

  async implementMouseJitter(page: Page) {
    // Add subtle mouse movements during idle time
    const jitterInterval = setInterval(async () => {
      if (Math.random() < 0.3) { // 30% chance
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };
        const currentMouse = await page.evaluate(() => ({
          x: window.mouseX || 0,
          y: window.mouseY || 0
        }));

        const jitterX = currentMouse.x + (Math.random() - 0.5) * 20;
        const jitterY = currentMouse.y + (Math.random() - 0.5) * 20;

        await page.mouse.move(
          Math.max(0, Math.min(viewport.width, jitterX)),
          Math.max(0, Math.min(viewport.height, jitterY))
        );
      }
    }, 1000 + Math.random() * 2000);

    // Store interval for cleanup
    this.behaviorPatterns.set('jitterInterval', jitterInterval);
  }

  async simulateHumanErrors(page: Page) {
    // Occasionally mistype in input fields
    page.on('dialog', async dialog => {
      await page.waitForTimeout(1000 + Math.random() * 2000);
      await dialog.accept();
    });

    // Override keyboard input to add typos
    const originalType = page.keyboard.type.bind(page.keyboard);
    page.keyboard.type = async function(text: string, options?: any) {
      const chars = text.split('');
      const modifiedChars: string[] = [];

      for (let i = 0; i < chars.length; i++) {
        // 5% chance of typo
        if (Math.random() < 0.05 && i > 0 && i < chars.length - 1) {
          // Swap with adjacent character
          modifiedChars.push(chars[i + 1]);
          modifiedChars.push(chars[i]);
          i++; // Skip next character
        } else {
          modifiedChars.push(chars[i]);
        }
      }

      // Type with corrections
      for (let i = 0; i < modifiedChars.length; i++) {
        await originalType(modifiedChars[i], options);
        
        // Detect and correct typo
        if (i > 0 && modifiedChars[i] !== chars[i]) {
          await page.waitForTimeout(300 + Math.random() * 500);
          await page.keyboard.press('Backspace');
          await page.keyboard.press('Backspace');
          await originalType(chars[i - 1] + chars[i], options);
        }
      }
    };
  }

  async injectRealisticBehavior(page: Page, session: BrowsingSession) {
    // Track mouse position
    await page.evaluateOnNewDocument(() => {
      document.addEventListener('mousemove', (e) => {
        (window as any).mouseX = e.clientX;
        (window as any).mouseY = e.clientY;
      });
    });

    // Add realistic scrolling patterns
    await page.evaluateOnNewDocument(() => {
      let lastScrollTime = Date.now();
      let scrollVelocity = 0;

      window.addEventListener('wheel', (e) => {
        const now = Date.now();
        const timeDelta = now - lastScrollTime;
        lastScrollTime = now;

        // Calculate velocity with momentum
        scrollVelocity = scrollVelocity * 0.95 + e.deltaY * 0.05;

        // Prevent instant scrolling
        if (timeDelta < 16) { // 60fps
          e.preventDefault();
          setTimeout(() => {
            window.scrollBy(0, scrollVelocity);
          }, 16 - timeDelta);
        }
      });
    });

    // Add focus/blur tracking
    await page.evaluateOnNewDocument(() => {
      let isPageFocused = true;
      
      window.addEventListener('focus', () => {
        isPageFocused = true;
        console.log('Page gained focus');
      });

      window.addEventListener('blur', () => {
        isPageFocused = false;
        console.log('Page lost focus - user might be multitasking');
      });

      // Simulate occasional tab switching
      setInterval(() => {
        if (Math.random() < 0.1 && isPageFocused) { // 10% chance
          window.dispatchEvent(new Event('blur'));
          setTimeout(() => {
            window.dispatchEvent(new Event('focus'));
          }, 2000 + Math.random() * 8000);
        }
      }, 30000); // Check every 30 seconds
    });
  }

  private async moveMouseNaturally(page: Page, targetX: number, targetY: number) {
    const steps = 20 + Math.floor(Math.random() * 10);
    const currentPosition = await page.evaluate(() => ({
      x: (window as any).mouseX || 0,
      y: (window as any).mouseY || 0
    }));

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Easing function for natural movement
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;

      const x = currentPosition.x + (targetX - currentPosition.x) * easeProgress;
      const y = currentPosition.y + (targetY - currentPosition.y) * easeProgress;

      await page.mouse.move(x, y);
      await page.waitForTimeout(10 + Math.random() * 20);
    }
  }

  async evaluateRiskLevel(page: Page): Promise<number> {
    const recentSignals = this.detectionHistory.filter(
      s => (Date.now() - s.timestamp.getTime()) < 300000 // Last 5 minutes
    );

    let riskScore = 0;
    
    for (const signal of recentSignals) {
      switch (signal.severity) {
        case 'critical': riskScore += 40; break;
        case 'high': riskScore += 25; break;
        case 'medium': riskScore += 15; break;
        case 'low': riskScore += 5; break;
      }
    }

    // Check for CAPTCHA
    const captcha = await this.detectCaptcha(page);
    if (captcha.detected) {
      riskScore += 50;
    }

    // Check page load time
    const loadTime = await page.evaluate(() => performance.timing.loadEventEnd - performance.timing.navigationStart);
    if (loadTime > 15000) riskScore += 20;

    return Math.min(100, riskScore);
  }

  cleanup() {
    // Clear any intervals
    const jitterInterval = this.behaviorPatterns.get('jitterInterval');
    if (jitterInterval) {
      clearInterval(jitterInterval);
    }
    
    this.behaviorPatterns.clear();
    this.detectionHistory = [];
  }
}

export default AntiDetectionEngine;