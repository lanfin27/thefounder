// scripts/high-performance-scraper/intelligent-blocking-detector.js
// Intelligent Blocking Detection and Evasion System

const { performance } = require('perf_hooks');

class IntelligentBlockingDetector {
  constructor() {
    this.patterns = {
      captcha: [
        /captcha/i,
        /recaptcha/i,
        /hcaptcha/i,
        /challenge/i,
        /verify.*human/i,
        /are.*you.*robot/i,
        /cloudflare/i
      ],
      rateLimit: [
        /rate.*limit/i,
        /too.*many.*requests/i,
        /429/,
        /throttle/i,
        /exceeded.*quota/i,
        /slow.*down/i
      ],
      ipBlock: [
        /blocked/i,
        /banned/i,
        /forbidden/i,
        /access.*denied/i,
        /unauthorized/i,
        /403/,
        /blacklist/i
      ],
      maintenance: [
        /maintenance/i,
        /under.*construction/i,
        /temporarily.*unavailable/i,
        /503/,
        /service.*unavailable/i
      ],
      geoBlock: [
        /not.*available.*country/i,
        /geo.*block/i,
        /region.*restrict/i,
        /location.*denied/i
      ]
    };
    
    this.blockingHistory = new Map();
    this.evasionStrategies = new Map();
    this.learningData = [];
  }

  async detectBlocking(response, context = {}) {
    const detection = {
      isBlocked: false,
      blockType: null,
      confidence: 0,
      indicators: [],
      suggestedActions: [],
      context: context
    };
    
    // Check HTTP status code
    const statusDetection = this.checkStatusCode(response.status);
    if (statusDetection.isBlocked) {
      detection.isBlocked = true;
      detection.blockType = statusDetection.type;
      detection.confidence = statusDetection.confidence;
      detection.indicators.push(`HTTP ${response.status}`);
    }
    
    // Check response headers
    const headerDetection = this.checkHeaders(response.headers);
    if (headerDetection.isBlocked) {
      detection.isBlocked = true;
      detection.blockType = headerDetection.type;
      detection.confidence = Math.max(detection.confidence, headerDetection.confidence);
      detection.indicators.push(...headerDetection.indicators);
    }
    
    // Check response body
    const bodyDetection = await this.checkResponseBody(response.data);
    if (bodyDetection.isBlocked) {
      detection.isBlocked = true;
      detection.blockType = bodyDetection.type;
      detection.confidence = Math.max(detection.confidence, bodyDetection.confidence);
      detection.indicators.push(...bodyDetection.indicators);
    }
    
    // Check response time anomalies
    const timingDetection = this.checkTimingAnomalies(response, context);
    if (timingDetection.isBlocked) {
      detection.isBlocked = true;
      detection.blockType = timingDetection.type;
      detection.confidence = Math.max(detection.confidence, timingDetection.confidence);
      detection.indicators.push(...timingDetection.indicators);
    }
    
    // Check content anomalies
    const contentDetection = this.checkContentAnomalies(response.data, context);
    if (contentDetection.isBlocked) {
      detection.isBlocked = true;
      detection.blockType = contentDetection.type;
      detection.confidence = Math.max(detection.confidence, contentDetection.confidence);
      detection.indicators.push(...contentDetection.indicators);
    }
    
    // Generate evasion suggestions
    if (detection.isBlocked) {
      detection.suggestedActions = this.generateEvasionStrategies(detection);
      
      // Update blocking history
      this.updateBlockingHistory(context.url || 'unknown', detection);
      
      // Learn from detection
      this.learnFromDetection(detection);
    }
    
    return detection;
  }

  checkStatusCode(status) {
    const detection = {
      isBlocked: false,
      type: null,
      confidence: 0
    };
    
    switch (status) {
      case 403:
        detection.isBlocked = true;
        detection.type = 'ip_block';
        detection.confidence = 0.9;
        break;
      case 429:
        detection.isBlocked = true;
        detection.type = 'rate_limit';
        detection.confidence = 0.95;
        break;
      case 503:
        detection.isBlocked = true;
        detection.type = 'maintenance';
        detection.confidence = 0.7;
        break;
      case 401:
        detection.isBlocked = true;
        detection.type = 'auth_required';
        detection.confidence = 0.8;
        break;
      case 451:
        detection.isBlocked = true;
        detection.type = 'geo_block';
        detection.confidence = 0.9;
        break;
    }
    
    return detection;
  }

  checkHeaders(headers) {
    const detection = {
      isBlocked: false,
      type: null,
      confidence: 0,
      indicators: []
    };
    
    // Check for rate limit headers
    if (headers['x-ratelimit-remaining'] === '0' || 
        headers['retry-after']) {
      detection.isBlocked = true;
      detection.type = 'rate_limit';
      detection.confidence = 0.9;
      detection.indicators.push('Rate limit headers detected');
    }
    
    // Check for Cloudflare challenge
    if (headers['cf-ray'] && headers['cf-challenge']) {
      detection.isBlocked = true;
      detection.type = 'captcha';
      detection.confidence = 0.95;
      detection.indicators.push('Cloudflare challenge detected');
    }
    
    // Check for anti-bot headers
    if (headers['x-bot-detection'] || 
        headers['x-security-check'] ||
        headers['x-human-check']) {
      detection.isBlocked = true;
      detection.type = 'bot_detection';
      detection.confidence = 0.85;
      detection.indicators.push('Anti-bot headers detected');
    }
    
    return detection;
  }

  async checkResponseBody(body) {
    const detection = {
      isBlocked: false,
      type: null,
      confidence: 0,
      indicators: []
    };
    
    if (!body) return detection;
    
    const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
    const lowerBody = bodyText.toLowerCase();
    
    // Check for CAPTCHA patterns
    for (const pattern of this.patterns.captcha) {
      if (pattern.test(bodyText)) {
        detection.isBlocked = true;
        detection.type = 'captcha';
        detection.confidence = Math.max(detection.confidence, 0.9);
        detection.indicators.push(`CAPTCHA pattern matched: ${pattern}`);
      }
    }
    
    // Check for rate limit patterns
    for (const pattern of this.patterns.rateLimit) {
      if (pattern.test(bodyText)) {
        detection.isBlocked = true;
        detection.type = 'rate_limit';
        detection.confidence = Math.max(detection.confidence, 0.85);
        detection.indicators.push(`Rate limit pattern matched: ${pattern}`);
      }
    }
    
    // Check for IP block patterns
    for (const pattern of this.patterns.ipBlock) {
      if (pattern.test(bodyText)) {
        detection.isBlocked = true;
        detection.type = 'ip_block';
        detection.confidence = Math.max(detection.confidence, 0.8);
        detection.indicators.push(`IP block pattern matched: ${pattern}`);
      }
    }
    
    // Check for suspicious redirects
    if (lowerBody.includes('window.location') || 
        lowerBody.includes('meta http-equiv="refresh"')) {
      detection.isBlocked = true;
      detection.type = 'redirect_challenge';
      detection.confidence = Math.max(detection.confidence, 0.7);
      detection.indicators.push('Suspicious redirect detected');
    }
    
    // Check for empty or minimal content
    if (bodyText.length < 100) {
      detection.isBlocked = true;
      detection.type = 'content_blocked';
      detection.confidence = Math.max(detection.confidence, 0.6);
      detection.indicators.push('Minimal content detected');
    }
    
    return detection;
  }

  checkTimingAnomalies(response, context) {
    const detection = {
      isBlocked: false,
      type: null,
      confidence: 0,
      indicators: []
    };
    
    if (!context.responseTime) return detection;
    
    // Suspiciously fast response (might be cached block page)
    if (context.responseTime < 50) {
      detection.isBlocked = true;
      detection.type = 'cached_block';
      detection.confidence = 0.6;
      detection.indicators.push('Suspiciously fast response');
    }
    
    // Very slow response (might be tarpit)
    if (context.responseTime > 30000) {
      detection.isBlocked = true;
      detection.type = 'tarpit';
      detection.confidence = 0.7;
      detection.indicators.push('Extremely slow response (tarpit)');
    }
    
    // Check for consistent timing (bot detection)
    if (context.previousResponseTimes) {
      const variance = this.calculateVariance(context.previousResponseTimes);
      if (variance < 10) {
        detection.isBlocked = true;
        detection.type = 'timing_analysis';
        detection.confidence = 0.5;
        detection.indicators.push('Consistent timing detected');
      }
    }
    
    return detection;
  }

  checkContentAnomalies(data, context) {
    const detection = {
      isBlocked: false,
      type: null,
      confidence: 0,
      indicators: []
    };
    
    if (!context.expectedContent) return detection;
    
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Check for missing expected elements
    if (context.expectedContent.selectors) {
      const missingSelectors = [];
      
      for (const selector of context.expectedContent.selectors) {
        if (!content.includes(selector)) {
          missingSelectors.push(selector);
        }
      }
      
      if (missingSelectors.length > context.expectedContent.selectors.length * 0.5) {
        detection.isBlocked = true;
        detection.type = 'content_mismatch';
        detection.confidence = 0.7;
        detection.indicators.push(`Missing expected content: ${missingSelectors.join(', ')}`);
      }
    }
    
    // Check for honeypot indicators
    if (content.includes('honeypot') || 
        content.includes('trap') ||
        content.includes('bot-check')) {
      detection.isBlocked = true;
      detection.type = 'honeypot';
      detection.confidence = 0.8;
      detection.indicators.push('Honeypot indicators found');
    }
    
    return detection;
  }

  generateEvasionStrategies(detection) {
    const strategies = [];
    
    switch (detection.blockType) {
      case 'captcha':
        strategies.push({
          action: 'use_captcha_solver',
          priority: 'high',
          details: 'Integrate 2captcha or anti-captcha service'
        });
        strategies.push({
          action: 'switch_proxy',
          priority: 'high',
          details: 'Use residential proxy from different location'
        });
        strategies.push({
          action: 'increase_human_simulation',
          priority: 'medium',
          details: 'Add mouse movements, random delays, viewport changes'
        });
        break;
        
      case 'rate_limit':
        strategies.push({
          action: 'implement_backoff',
          priority: 'high',
          details: 'Exponential backoff with jitter'
        });
        strategies.push({
          action: 'distribute_requests',
          priority: 'high',
          details: 'Use multiple proxies in rotation'
        });
        strategies.push({
          action: 'reduce_concurrency',
          priority: 'medium',
          details: 'Lower parallel request count'
        });
        break;
        
      case 'ip_block':
        strategies.push({
          action: 'rotate_proxy',
          priority: 'critical',
          details: 'Switch to new residential proxy immediately'
        });
        strategies.push({
          action: 'change_geo_location',
          priority: 'high',
          details: 'Use proxy from different country/region'
        });
        strategies.push({
          action: 'reset_fingerprint',
          priority: 'high',
          details: 'Change browser fingerprint completely'
        });
        break;
        
      case 'bot_detection':
        strategies.push({
          action: 'enhance_browser_emulation',
          priority: 'high',
          details: 'Use puppeteer-extra-plugin-stealth'
        });
        strategies.push({
          action: 'add_human_behavior',
          priority: 'high',
          details: 'Random scrolling, mouse movements, typing delays'
        });
        strategies.push({
          action: 'rotate_user_agents',
          priority: 'medium',
          details: 'Use diverse, real user agent strings'
        });
        break;
        
      case 'geo_block':
        strategies.push({
          action: 'use_geo_targeted_proxy',
          priority: 'critical',
          details: 'Use proxy from allowed region'
        });
        strategies.push({
          action: 'verify_proxy_location',
          priority: 'high',
          details: 'Ensure proxy IP matches claimed location'
        });
        break;
    }
    
    // Add general strategies
    strategies.push({
      action: 'implement_retry_logic',
      priority: 'low',
      details: 'Retry with different strategy after delay'
    });
    
    strategies.push({
      action: 'monitor_success_rate',
      priority: 'low',
      details: 'Track and adapt based on success patterns'
    });
    
    return strategies.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  updateBlockingHistory(url, detection) {
    const urlPattern = this.extractUrlPattern(url);
    
    if (!this.blockingHistory.has(urlPattern)) {
      this.blockingHistory.set(urlPattern, {
        totalAttempts: 0,
        blockingEvents: [],
        successfulStrategies: [],
        failedStrategies: []
      });
    }
    
    const history = this.blockingHistory.get(urlPattern);
    history.totalAttempts++;
    
    if (detection.isBlocked) {
      history.blockingEvents.push({
        timestamp: Date.now(),
        blockType: detection.blockType,
        confidence: detection.confidence,
        indicators: detection.indicators
      });
    }
  }

  extractUrlPattern(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname.split('/').slice(0, 3).join('/')}`;
    } catch {
      return url;
    }
  }

  learnFromDetection(detection) {
    this.learningData.push({
      timestamp: Date.now(),
      blockType: detection.blockType,
      confidence: detection.confidence,
      indicators: detection.indicators,
      context: detection.context
    });
    
    // Keep only recent data
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.learningData = this.learningData.filter(d => d.timestamp > oneWeekAgo);
  }

  async applyStealth(page) {
    // Apply various stealth techniques
    
    // Override navigator properties
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Mock chrome runtime
      window.chrome = {
        runtime: {
          connect: () => {},
          sendMessage: () => {}
        }
      };
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery(parameters);
      };
    });
    
    // Add random viewport
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 }
    ];
    
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(viewport);
    
    // Set random user agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(userAgent);
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    return page;
  }

  async simulateHumanBehavior(page) {
    // Random initial delay
    await this.randomDelay(500, 2000);
    
    // Simulate mouse movement
    const width = page.viewport().width;
    const height = page.viewport().height;
    
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      
      await page.mouse.move(x, y, {
        steps: Math.floor(Math.random() * 10) + 5
      });
      
      await this.randomDelay(100, 500);
    }
    
    // Random scroll
    await page.evaluate(() => {
      const scrollHeight = document.body.scrollHeight;
      const randomScroll = Math.floor(Math.random() * scrollHeight * 0.3);
      window.scrollTo({
        top: randomScroll,
        behavior: 'smooth'
      });
    });
    
    await this.randomDelay(500, 1500);
    
    // Random viewport interaction
    if (Math.random() < 0.3) {
      await page.evaluate(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  getBlockingStatistics() {
    const stats = {
      totalUrls: this.blockingHistory.size,
      totalBlockingEvents: 0,
      blockingByType: {},
      mostBlockedUrls: [],
      successRate: 0
    };
    
    for (const [url, history] of this.blockingHistory) {
      stats.totalBlockingEvents += history.blockingEvents.length;
      
      for (const event of history.blockingEvents) {
        stats.blockingByType[event.blockType] = (stats.blockingByType[event.blockType] || 0) + 1;
      }
      
      if (history.blockingEvents.length > 0) {
        stats.mostBlockedUrls.push({
          url,
          blockCount: history.blockingEvents.length,
          successRate: 1 - (history.blockingEvents.length / history.totalAttempts)
        });
      }
    }
    
    stats.mostBlockedUrls.sort((a, b) => b.blockCount - a.blockCount);
    stats.mostBlockedUrls = stats.mostBlockedUrls.slice(0, 10);
    
    return stats;
  }
}

module.exports = IntelligentBlockingDetector;