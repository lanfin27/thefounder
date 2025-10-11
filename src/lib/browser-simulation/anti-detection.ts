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
  private isInitialized: boolean = false;
  
  constructor(
    private persona: BrowsingPersona,
    private sessionManager: SessionManager
  ) {
    try {
      this.initializeCaptchaSolvers();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing AntiDetectionEngine:', error);
      this.isInitialized = false;
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  private initializeCaptchaSolvers() {
    try {
      // Basic CAPTCHA detection patterns
      this.captchaSolvers.set('recaptcha', this.handleRecaptcha.bind(this));
      this.captchaSolvers.set('hcaptcha', this.handleHcaptcha.bind(this));
      this.captchaSolvers.set('cloudflare', this.handleCloudflare.bind(this));
      
      console.log('CAPTCHA solvers initialized successfully');
    } catch (error) {
      console.error('Error initializing CAPTCHA solvers:', error);
      throw error;
    }
  }

  async detectCaptcha(page: Page): Promise<CaptchaChallenge> {
    try {
      const captchaSelectors = {
        recaptcha: [
          'iframe[src*="recaptcha"]',
          '.g-recaptcha',
          '#g-recaptcha',
          '[data-sitekey]',
          '.recaptcha-checkbox-border'
        ],
        hcaptcha: [
          'iframe[src*="hcaptcha"]',
          '.h-captcha',
          '[data-hcaptcha-sitekey]',
          '#h-captcha'
        ],
        cloudflare: [
          '.cf-challenge-running',
          '#cf-wrapper',
          '.cf-browser-verification',
          '.cf-checking-browser',
          '#challenge-form'
        ]
      };

      // Check for specific CAPTCHA elements
      for (const [type, selectors] of Object.entries(captchaSelectors)) {
        for (const selector of selectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const isVisible = await element.isVisible();
              if (isVisible) {
                return {
                  type: type as CaptchaChallenge['type'],
                  detected: true,
                  element: selector,
                  confidence: 0.9
                };
              }
            }
          } catch (error) {
            console.debug(`Error checking selector ${selector}:`, error);
          }
        }
      }

      // Check for generic challenge indicators in page text
      try {
        const pageText = await page.evaluate(() => {
          return document.body?.innerText?.toLowerCase() || '';
        });
        
        const challengeIndicators = [
          'verify you are human',
          'complete the captcha',
          'security check',
          'bot detection',
          'access denied',
          'are you a robot',
          'prove you are human',
          'anti-robot verification',
          'please verify',
          'verification required'
        ];
        
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
      } catch (error) {
        console.debug('Error checking page text for CAPTCHA indicators:', error);
      }

      // Check page title for CAPTCHA indicators
      try {
        const title = await page.title();
        const titleLower = title.toLowerCase();
        
        if (titleLower.includes('captcha') || 
            titleLower.includes('verification') || 
            titleLower.includes('security check')) {
          return {
            type: 'custom',
            detected: true,
            element: null,
            confidence: 0.6
          };
        }
      } catch (error) {
        console.debug('Error checking page title:', error);
      }

      return {
        type: 'unknown',
        detected: false,
        element: null,
        confidence: 0
      };
    } catch (error) {
      console.error('Error detecting CAPTCHA:', error);
      return {
        type: 'unknown',
        detected: false,
        element: null,
        confidence: 0
      };
    }
  }

  async monitorDetectionSignals(page: Page): Promise<DetectionSignal[]> {
    const signals: DetectionSignal[] = [];

    try {
      // Check for rate limiting
      try {
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
      } catch (error) {
        console.debug('Error checking rate limit headers:', error);
      }

      // Check for behavioral detection scripts
      try {
        const suspiciousScripts = await page.$$eval('script', scripts => 
          scripts.some(s => {
            const content = s.innerHTML || s.textContent || '';
            return content.includes('fingerprint') || 
                   content.includes('bot-detection') ||
                   content.includes('behavior-analysis') ||
                   content.includes('antibot') ||
                   content.includes('fraud-detection');
          })
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
      } catch (error) {
        console.debug('Error checking suspicious scripts:', error);
      }

      // Check response times
      try {
        const navigationTiming = await page.evaluate(() => {
          const timing = performance.timing;
          if (!timing.loadEventEnd || !timing.navigationStart) {
            return 0;
          }
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
      } catch (error) {
        console.debug('Error checking navigation timing:', error);
      }

      // Check for honeypot elements
      try {
        const honeypots = await page.$$eval(
          '[style*="display:none"], [style*="visibility:hidden"], [style*="opacity:0"]', 
          elements => elements.filter(el => 
            (el.tagName === 'INPUT' || el.tagName === 'BUTTON') &&
            (el as HTMLElement).style.display !== 'block' &&
            (el as HTMLElement).style.visibility !== 'visible'
          ).length
        );

        if (honeypots > 0) {
          signals.push({
            type: 'technical',
            severity: 'medium',
            description: `${honeypots} honeypot elements detected`,
            timestamp: new Date(),
            adaptationSuggestion: 'Avoid interacting with hidden elements'
          });
        }
      } catch (error) {
        console.debug('Error checking honeypot elements:', error);
      }

      // Check for access denied or blocked content
      try {
        const pageText = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
        const blockingKeywords = ['access denied', 'blocked', 'forbidden', '403', 'rate limit exceeded', 'too many requests'];
        
        for (const keyword of blockingKeywords) {
          if (pageText.includes(keyword)) {
            signals.push({
              type: 'challenge',
              severity: 'high',
              description: `Blocking keyword detected: ${keyword}`,
              timestamp: new Date(),
              adaptationSuggestion: 'Switch proxy and persona, increase delays'
            });
            break;
          }
        }
      } catch (error) {
        console.debug('Error checking page text for blocking keywords:', error);
      }

    } catch (error) {
      console.error('Error monitoring detection signals:', error);
    }

    // Store signals for analysis
    this.detectionHistory.push(...signals);
    
    // Keep only recent signals (last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.detectionHistory = this.detectionHistory.filter(
      s => s.timestamp.getTime() > oneHourAgo
    );

    return signals;
  }

  async adaptBehavior(signals: DetectionSignal[]): Promise<BehaviorAdaptation> {
    try {
      const adaptation: BehaviorAdaptation = {
        speedReduction: 1,
        pauseIncrease: 1,
        randomizationFactor: 0,
        backoffDuration: 0,
        switchPersona: false
      };

      if (signals.length === 0) {
        return adaptation;
      }

      // Calculate adaptation based on signals
      let criticalCount = 0;
      let highCount = 0;
      
      for (const signal of signals) {
        switch (signal.severity) {
          case 'critical':
            criticalCount++;
            adaptation.speedReduction *= 0.3;
            adaptation.pauseIncrease *= 3;
            adaptation.randomizationFactor += 0.5;
            adaptation.backoffDuration += 300000; // 5 minutes
            adaptation.switchPersona = true;
            break;
          case 'high':
            highCount++;
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

      // Additional logic for multiple high-severity signals
      if (criticalCount > 1 || highCount > 2) {
        adaptation.switchPersona = true;
        adaptation.backoffDuration = Math.max(adaptation.backoffDuration, 600000); // At least 10 minutes
      }

      // Ensure minimum constraints
      adaptation.speedReduction = Math.max(0.1, adaptation.speedReduction);
      adaptation.pauseIncrease = Math.min(5, adaptation.pauseIncrease);
      adaptation.randomizationFactor = Math.min(1, adaptation.randomizationFactor);
      adaptation.backoffDuration = Math.min(1800000, adaptation.backoffDuration); // Max 30 minutes

      // Update adaptation level
      this.adaptationLevel = Math.min(10, this.adaptationLevel + signals.length);

      console.log('Behavior adaptation calculated:', {
        signals: signals.length,
        speedReduction: adaptation.speedReduction,
        pauseIncrease: adaptation.pauseIncrease,
        backoffDuration: adaptation.backoffDuration / 1000 + 's',
        switchPersona: adaptation.switchPersona
      });

      return adaptation;
    } catch (error) {
      console.error('Error adapting behavior:', error);
      // Return safe default adaptation
      return {
        speedReduction: 0.5,
        pauseIncrease: 2,
        randomizationFactor: 0.3,
        backoffDuration: 60000,
        switchPersona: false
      };
    }
  }

  async solveCaptcha(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    try {
      console.log(`Attempting to solve ${challenge.type} CAPTCHA with confidence ${challenge.confidence}`);

      // Apply human-like behavior before attempting
      await this.simulateHumanReaction(page);

      // Get the appropriate solver
      const solver = this.captchaSolvers.get(challenge.type);
      if (solver) {
        const result = await solver(page, challenge);
        console.log(`${challenge.type} CAPTCHA solver result: ${result}`);
        return result;
      }

      // Generic fallback approach
      console.log('Using generic CAPTCHA approach');
      return await this.genericCaptchaApproach(page, challenge);
    } catch (error) {
      console.error('Error solving CAPTCHA:', error);
      return false;
    }
  }

  private async simulateHumanReaction(page: Page) {
    try {
      // Simulate surprise/confusion at seeing CAPTCHA
      await page.waitForTimeout(1500 + Math.random() * 2500);
      
      // Random mouse movements showing hesitation
      const viewport = page.viewportSize() || { width: 1920, height: 1080 };
      
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        const x = Math.random() * viewport.width;
        const y = Math.random() * viewport.height;
        
        try {
          await page.mouse.move(x, y);
          await page.waitForTimeout(200 + Math.random() * 400);
        } catch (error) {
          console.debug('Error during human reaction mouse movement:', error);
        }
      }
      
      // Brief pause as if reading/thinking
      await page.waitForTimeout(1000 + Math.random() * 2000);
    } catch (error) {
      console.error('Error simulating human reaction:', error);
    }
  }

  private async handleRecaptcha(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    try {
      console.log('Attempting to handle reCAPTCHA...');
      
      // Wait for reCAPTCHA frame with timeout
      let recaptchaFrame;
      try {
        recaptchaFrame = await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 10000 });
      } catch (timeoutError) {
        console.log('reCAPTCHA frame not found within timeout');
        return false;
      }
      
      if (!recaptchaFrame) return false;

      // Look for checkbox in multiple ways
      const checkboxSelectors = [
        '.recaptcha-checkbox-border',
        '#recaptcha-anchor',
        '.recaptcha-checkbox',
        '[role="checkbox"]'
      ];

      let checkbox = null;
      for (const selector of checkboxSelectors) {
        try {
          checkbox = await page.$(selector);
          if (checkbox) {
            const isVisible = await checkbox.isVisible();
            if (isVisible) break;
            checkbox = null;
          }
        } catch (error) {
          console.debug(`Error checking checkbox selector ${selector}:`, error);
        }
      }

      if (checkbox) {
        try {
          const box = await checkbox.boundingBox();
          if (box) {
            // Move mouse naturally to checkbox
            await this.moveMouseNaturally(page, box.x + box.width / 2, box.y + box.height / 2);
            await page.waitForTimeout(500 + Math.random() * 1000);
            
            // Click with human-like behavior
            await checkbox.click();
            console.log('Clicked reCAPTCHA checkbox');
          }
        } catch (clickError) {
          console.error('Error clicking reCAPTCHA checkbox:', clickError);
        }
      }

      // Wait for potential image challenge or completion
      await page.waitForTimeout(3000 + Math.random() * 2000);

      // Check if solved in multiple ways
      let solved = false;
      try {
        solved = await page.evaluate(() => {
          const response = document.querySelector('[name="g-recaptcha-response"]') as HTMLTextAreaElement;
          return response && response.value && response.value.length > 0;
        });
        
        if (!solved) {
          // Alternative check for completion
          solved = await page.evaluate(() => {
            const checkmark = document.querySelector('.recaptcha-checkbox-checkmark');
            return checkmark && checkmark.style.opacity !== '0';
          });
        }
      } catch (evalError) {
        console.error('Error evaluating reCAPTCHA completion:', evalError);
      }

      console.log(`reCAPTCHA handling result: ${solved ? 'solved' : 'not solved'}`);
      return solved;
    } catch (error) {
      console.error('reCAPTCHA solving failed:', error);
      return false;
    }
  }

  private async handleHcaptcha(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    try {
      console.log('Attempting to handle hCaptcha...');
      
      // Wait for hCaptcha frame
      let hcaptchaFrame;
      try {
        hcaptchaFrame = await page.waitForSelector('iframe[src*="hcaptcha"]', { timeout: 10000 });
      } catch (timeoutError) {
        console.log('hCaptcha frame not found within timeout');
        return false;
      }
      
      if (!hcaptchaFrame) return false;

      // Look for checkbox with multiple selectors
      const checkboxSelectors = [
        '#checkbox',
        '.hcaptcha-checkbox',
        '[id*="checkbox"]',
        '[class*="checkbox"]',
        '.h-captcha [role="button"]'
      ];

      let checkbox = null;
      for (const selector of checkboxSelectors) {
        try {
          checkbox = await page.$(selector);
          if (checkbox) {
            const isVisible = await checkbox.isVisible();
            if (isVisible) break;
            checkbox = null;
          }
        } catch (error) {
          console.debug(`Error checking hCaptcha selector ${selector}:`, error);
        }
      }

      if (checkbox) {
        try {
          // Human-like interaction
          await this.simulateHumanReaction(page);
          await checkbox.click();
          console.log('Clicked hCaptcha checkbox');
          
          // Wait for processing
          await page.waitForTimeout(3000 + Math.random() * 2000);
        } catch (clickError) {
          console.error('Error clicking hCaptcha checkbox:', clickError);
        }
      }

      // Check if completed (basic check)
      try {
        const response = await page.evaluate(() => {
          const responseField = document.querySelector('[name="h-captcha-response"]') as HTMLTextAreaElement;
          return responseField && responseField.value && responseField.value.length > 0;
        });
        
        if (response) {
          console.log('hCaptcha appears to be completed');
          return true;
        }
      } catch (evalError) {
        console.error('Error evaluating hCaptcha completion:', evalError);
      }

      console.log('hCaptcha handling completed - may require manual solving');
      return false; // hCaptcha typically requires image solving
    } catch (error) {
      console.error('hCaptcha solving failed:', error);
      return false;
    }
  }

  private async handleCloudflare(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    try {
      console.log('Waiting for Cloudflare challenge to complete...');
      
      // Wait for challenge to complete with multiple checks
      const maxWaitTime = 45000; // 45 seconds
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        try {
          // Check if challenge is still running
          const challengeRunning = await page.$('.cf-challenge-running');
          const browserCheck = await page.$('.cf-checking-browser');
          
          if (!challengeRunning && !browserCheck) {
            // Double check by looking for success indicators
            const currentUrl = page.url();
            if (!currentUrl.includes('challenge') && !currentUrl.includes('captcha')) {
              console.log('Cloudflare challenge appears to be completed');
              return true;
            }
          }
          
          // Wait before next check
          await page.waitForTimeout(2000);
          
        } catch (checkError) {
          console.debug('Error checking Cloudflare status:', checkError);
          await page.waitForTimeout(1000);
        }
      }

      // Final check using waitForFunction as fallback
      try {
        await page.waitForFunction(
          () => {
            const challengeRunning = document.querySelector('.cf-challenge-running');
            const browserCheck = document.querySelector('.cf-checking-browser');
            const wrapper = document.querySelector('#cf-wrapper');
            
            return !challengeRunning && !browserCheck && (!wrapper || wrapper.style.display === 'none');
          },
          { timeout: 10000 }
        );
        
        console.log('Cloudflare challenge completed via waitForFunction');
        return true;
      } catch (waitError) {
        console.log('Cloudflare challenge may not have completed within timeout');
        
        // Check if we're at least off the challenge page
        const currentUrl = page.url();
        if (!currentUrl.includes('challenge') && !currentUrl.includes('captcha')) {
          console.log('Cloudflare challenge appears to have completed (URL check)');
          return true;
        }
        
        return false;
      }
    } catch (error) {
      console.error('Cloudflare challenge failed:', error);
      return false;
    }
  }

  private async genericCaptchaApproach(page: Page, challenge: CaptchaChallenge): Promise<boolean> {
    try {
      console.log('Attempting generic CAPTCHA approach...');
      
      // Wait for potential auto-resolution
      await page.waitForTimeout(5000 + Math.random() * 5000);
      
      // Check if we're still on CAPTCHA page
      const stillCaptcha = await this.detectCaptcha(page);
      const resolved = !stillCaptcha.detected;
      
      if (!resolved) {
        // Try clicking any visible buttons that might help
        const buttonSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          '.submit-button',
          '#submit',
          '[role="button"]'
        ];
        
        for (const selector of buttonSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              const isVisible = await button.isVisible();
              if (isVisible) {
                console.log(`Trying to click button: ${selector}`);
                await button.click();
                await page.waitForTimeout(2000);
                
                // Check again
                const retryCheck = await this.detectCaptcha(page);
                if (!retryCheck.detected) {
                  console.log('Generic approach succeeded after button click');
                  return true;
                }
              }
            }
          } catch (error) {
            console.debug(`Error clicking button ${selector}:`, error);
          }
        }
      }
      
      console.log(`Generic CAPTCHA approach result: ${resolved}`);
      return resolved;
    } catch (error) {
      console.error('Error in generic CAPTCHA approach:', error);
      return false;
    }
  }

  async enhanceBrowserFingerprint(context: BrowserContext) {
    try {
      console.log('Enhancing browser fingerprint...');
      
      // Rotate user agent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      ];

      const selectedUA = userAgents[this.fingerprintRotation % userAgents.length];
      this.fingerprintRotation++;

      // Override fingerprinting APIs with error handling
      await context.addInitScript(() => {
        try {
          // Override WebGL fingerprinting safely
          if (typeof WebGLRenderingContext !== 'undefined') {
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
              try {
                if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
                  return 'Intel Inc.';
                }
                if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
                  return 'Intel Iris OpenGL Engine';
                }
                return getParameter.apply(this, arguments as any);
              } catch (error) {
                return getParameter.apply(this, arguments as any);
              }
            };
          }

          // Override Canvas fingerprinting with error handling
          if (typeof HTMLCanvasElement !== 'undefined' && HTMLCanvasElement.prototype.toBlob) {
            const toBlob = HTMLCanvasElement.prototype.toBlob;
            HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
              try {
                const args = arguments;
                setTimeout(() => {
                  try {
                    toBlob.apply(this, args as any);
                  } catch (error) {
                    console.debug('Canvas toBlob error:', error);
                    // Call original callback with error
                    if (callback) callback(null);
                  }
                }, Math.random() * 10);
              } catch (error) {
                toBlob.apply(this, arguments as any);
              }
            };
          }

          // Add realistic window properties
          try {
            if (!window.chrome) {
              Object.defineProperty(window, 'chrome', {
                get: () => ({
                  runtime: {},
                  loadTimes: () => ({}),
                  csi: () => ({})
                }),
                configurable: true
              });
            }
          } catch (error) {
            console.debug('Error setting chrome property:', error);
          }

          // Override timezone detection safely
          try {
            const OriginalDateTimeFormat = Intl.DateTimeFormat;
            Intl.DateTimeFormat = function(...args: any[]) {
              try {
                if (args.length === 0) {
                  args = ['en-US', { timeZone: 'America/New_York' }];
                }
                return new (OriginalDateTimeFormat as any)(...args);
              } catch (error) {
                return new (OriginalDateTimeFormat as any)(...args);
              }
            } as any;
          } catch (error) {
            console.debug('Error overriding DateTimeFormat:', error);
          }

          // Add realistic navigator properties
          try {
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined,
              configurable: true
            });
          } catch (error) {
            console.debug('Error setting webdriver property:', error);
          }

          try {
            Object.defineProperty(navigator, 'plugins', {
              get: () => [{
                name: 'Chrome PDF Plugin',
                description: 'Portable Document Format',
                filename: 'internal-pdf-viewer',
                length: 1
              }],
              configurable: true
            });
          } catch (error) {
            console.debug('Error setting plugins property:', error);
          }

          // Add battery API safely
          try {
            if (!navigator.getBattery) {
              Object.defineProperty(navigator, 'getBattery', {
                get: () => () => Promise.resolve({
                  charging: true,
                  chargingTime: 0,
                  dischargingTime: Infinity,
                  level: 0.90 + Math.random() * 0.09 // Random level between 90-99%
                }),
                configurable: true
              });
            }
          } catch (error) {
            console.debug('Error setting battery API:', error);
          }

          // Add realistic screen properties
          try {
            Object.defineProperty(screen, 'availWidth', {
              get: () => screen.width - Math.floor(Math.random() * 50),
              configurable: true
            });
            
            Object.defineProperty(screen, 'availHeight', {
              get: () => screen.height - 40 - Math.floor(Math.random() * 40),
              configurable: true
            });
          } catch (error) {
            console.debug('Error setting screen properties:', error);
          }

        } catch (error) {
          console.debug('Error in fingerprint enhancement script:', error);
        }
      });
      
      console.log(`Browser fingerprint enhanced with UA: ${selectedUA.substring(0, 50)}...`);
    } catch (error) {
      console.error('Error enhancing browser fingerprint:', error);
    }
  }

  async implementMouseJitter(page: Page) {
    try {
      // Add subtle mouse movements during idle time
      const jitterInterval = setInterval(async () => {
        try {
          if (Math.random() < 0.3) { // 30% chance
            const viewport = page.viewportSize() || { width: 1920, height: 1080 };
            
            // Get current mouse position safely
            let currentMouse = { x: 0, y: 0 };
            try {
              currentMouse = await page.evaluate(() => ({
                x: (window as any).mouseX || Math.random() * window.innerWidth,
                y: (window as any).mouseY || Math.random() * window.innerHeight
              }));
            } catch (error) {
              // Use random position if tracking failed
              currentMouse = {
                x: Math.random() * viewport.width,
                y: Math.random() * viewport.height
              };
            }

            const jitterX = currentMouse.x + (Math.random() - 0.5) * 20;
            const jitterY = currentMouse.y + (Math.random() - 0.5) * 20;

            await page.mouse.move(
              Math.max(0, Math.min(viewport.width, jitterX)),
              Math.max(0, Math.min(viewport.height, jitterY))
            );
          }
        } catch (error) {
          // Silently ignore jitter errors to avoid breaking the session
          console.debug('Mouse jitter error (non-critical):', error);
        }
      }, 1000 + Math.random() * 2000);

      // Store interval for cleanup
      this.behaviorPatterns.set('jitterInterval', jitterInterval);
    } catch (error) {
      console.error('Failed to implement mouse jitter:', error);
    }
  }

  async simulateHumanErrors(page: Page) {
    try {
      // Handle dialogs with human-like delay
      page.on('dialog', async dialog => {
        try {
          await page.waitForTimeout(1000 + Math.random() * 2000);
          await dialog.accept();
        } catch (error) {
          console.error('Error handling dialog:', error);
          try {
            await dialog.dismiss();
          } catch (dismissError) {
            console.error('Error dismissing dialog:', dismissError);
          }
        }
      });

      // Note: Direct keyboard override is risky and can break functionality
      // Instead, we'll simulate typos during specific typing operations
      this.behaviorPatterns.set('simulateTypos', true);
      
    } catch (error) {
      console.error('Error setting up human error simulation:', error);
    }
  }

  // Method to type with realistic human errors
  async typeWithHumanErrors(page: Page, selector: string, text: string) {
    try {
      const element = await page.$(selector);
      if (!element) return;

      await element.click();
      await page.waitForTimeout(200 + Math.random() * 300);

      const chars = text.split('');
      const shouldSimulateTypos = this.behaviorPatterns.get('simulateTypos');

      for (let i = 0; i < chars.length; i++) {
        // 3% chance of typo if simulation enabled
        if (shouldSimulateTypos && Math.random() < 0.03 && i > 0 && i < chars.length - 1) {
          // Type wrong character first
          const wrongChar = String.fromCharCode(chars[i].charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
          await page.keyboard.type(wrongChar);
          await page.waitForTimeout(100 + Math.random() * 200);
          
          // Correct it
          await page.keyboard.press('Backspace');
          await page.waitForTimeout(50 + Math.random() * 100);
        }
        
        await page.keyboard.type(chars[i]);
        
        // Random micro-delays between characters
        if (Math.random() < 0.1) {
          await page.waitForTimeout(50 + Math.random() * 100);
        }
      }
    } catch (error) {
      console.error('Error typing with human errors:', error);
      // Fallback to simple typing
      await page.fill(selector, text);
    }
  }

  async injectRealisticBehavior(page: Page, session: BrowsingSession) {
    try {
      // Track mouse position - inject directly into page
      await page.addInitScript(() => {
        document.addEventListener('mousemove', (e) => {
          (window as any).mouseX = e.clientX;
          (window as any).mouseY = e.clientY;
        });
      });

      // Add realistic scrolling patterns
      await page.addInitScript(() => {
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
      await page.addInitScript(() => {
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
    } catch (error) {
      console.error('Error injecting realistic behavior:', error);
      // Fallback: inject behavior after page loads
      await this.injectBehaviorFallback(page);
    }
  }

  private async moveMouseNaturally(page: Page, targetX: number, targetY: number) {
    try {
      const steps = 20 + Math.floor(Math.random() * 10);
      
      // Get current mouse position safely
      let currentPosition = { x: 0, y: 0 };
      try {
        currentPosition = await page.evaluate(() => ({
          x: (window as any).mouseX || 0,
          y: (window as any).mouseY || 0
        }));
      } catch (error) {
        // Use viewport center as fallback
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };
        currentPosition = { x: viewport.width / 2, y: viewport.height / 2 };
      }

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
    } catch (error) {
      console.error('Error moving mouse naturally:', error);
      // Fallback to direct movement
      await page.mouse.move(targetX, targetY);
    }
  }

  async evaluateRiskLevel(page: Page): Promise<number> {
    try {
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
      try {
        const captcha = await this.detectCaptcha(page);
        if (captcha.detected) {
          riskScore += 50;
        }
      } catch (error) {
        console.error('Error detecting CAPTCHA:', error);
        // Assume medium risk if detection fails
        riskScore += 25;
      }

      // Check page load time safely
      try {
        const loadTime = await page.evaluate(() => {
          const timing = performance.timing;
          return timing.loadEventEnd - timing.navigationStart;
        });
        if (loadTime > 15000) riskScore += 20;
      } catch (error) {
        console.error('Error checking load time:', error);
        // Add small risk penalty if timing unavailable
        riskScore += 10;
      }

      return Math.min(100, riskScore);
    } catch (error) {
      console.error('Error evaluating risk level:', error);
      // Return moderate risk if evaluation fails
      return 50;
    }
  }

  // Fallback method for injecting behavior after page load
  private async injectBehaviorFallback(page: Page) {
    try {
      await page.evaluate(() => {
        // Track mouse position
        document.addEventListener('mousemove', (e) => {
          (window as any).mouseX = e.clientX;
          (window as any).mouseY = e.clientY;
        });

        // Add realistic scrolling patterns
        let lastScrollTime = Date.now();
        let scrollVelocity = 0;

        window.addEventListener('wheel', (e) => {
          const now = Date.now();
          const timeDelta = now - lastScrollTime;
          lastScrollTime = now;

          scrollVelocity = scrollVelocity * 0.95 + e.deltaY * 0.05;

          if (timeDelta < 16) {
            e.preventDefault();
            setTimeout(() => {
              window.scrollBy(0, scrollVelocity);
            }, 16 - timeDelta);
          }
        });

        // Add focus/blur tracking
        let isPageFocused = true;
        
        window.addEventListener('focus', () => {
          isPageFocused = true;
        });

        window.addEventListener('blur', () => {
          isPageFocused = false;
        });
      });
    } catch (error) {
      console.error('Fallback behavior injection failed:', error);
    }
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