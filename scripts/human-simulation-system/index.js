// index.js
// Main entry point for the Human Simulation System

const BrowserFingerprintRandomizer = require('./browser-fingerprint-randomizer');
const BehavioralPatternEngine = require('./behavioral-pattern-engine');
const SessionManager = require('./session-manager');
const IntelligentTimingEngine = require('./intelligent-timing-engine');
const ContextAwareInteraction = require('./context-aware-interaction');
const { chromium } = require('playwright');

class HumanSimulationSystem {
  constructor(options = {}) {
    this.config = {
      maxConcurrentSessions: 5,
      sessionRotation: true,
      learningEnabled: true,
      adaptiveComplexity: true,
      ...options
    };
    
    // Initialize all components
    this.fingerprintRandomizer = new BrowserFingerprintRandomizer();
    this.behaviorEngine = new BehavioralPatternEngine();
    this.sessionManager = new SessionManager();
    this.timingEngine = new IntelligentTimingEngine();
    this.contextInteraction = new ContextAwareInteraction();
    
    // Active browser contexts
    this.activeBrowsers = new Map();
    
    // Performance tracking
    this.metrics = {
      sessionsCreated: 0,
      pagesVisited: 0,
      detectionsAvoided: 0,
      dataExtracted: 0,
      startTime: Date.now()
    };
  }

  async createHumanLikeSession(options = {}) {
    const {
      location = 'US',
      userType = 'casual',
      taskType = 'browsing',
      targetUrl = null
    } = options;
    
    console.log('🤖 Creating human-like browsing session...');
    
    // Step 1: Generate unique fingerprint
    const fingerprint = this.fingerprintRandomizer.generateFingerprint({
      deviceType: 'desktop',
      os: this.selectOS(),
      location: location,
      browserType: 'chrome'
    });
    
    console.log(`📱 Fingerprint: ${fingerprint.platform} - ${fingerprint.screen.width}x${fingerprint.screen.height}`);
    
    // Step 2: Select behavior profile
    const timeOfDay = new Date().getHours();
    const behaviorProfile = this.behaviorEngine.selectProfile({
      timeOfDay,
      sessionDuration: 0,
      taskType
    });
    
    this.behaviorEngine.currentProfile = this.behaviorEngine.behaviorProfiles[behaviorProfile];
    console.log(`🎭 Behavior profile: ${behaviorProfile}`);
    
    // Step 3: Create session with history
    const session = await this.sessionManager.createSession({
      userType,
      location,
      fingerprint,
      behaviorProfile,
      isReturningUser: Math.random() < 0.3
    });
    
    console.log(`📝 Session created: ${session.id}`);
    console.log(`   History entries: ${session.history.length}`);
    console.log(`   Cookies: ${session.cookies.length}`);
    
    // Step 4: Launch browser with all configurations
    const browser = await this.launchConfiguredBrowser(fingerprint, session);
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Apply all configurations
    await this.fingerprintRandomizer.applyFingerprint(page, fingerprint);
    await this.sessionManager.prepareSessionForPage(page, session.id);
    
    // Store browser reference
    this.activeBrowsers.set(session.id, { browser, context, page, session });
    
    // Step 5: Begin human-like browsing
    if (targetUrl) {
      await this.navigateNaturally(page, targetUrl, session);
    }
    
    this.metrics.sessionsCreated++;
    
    return {
      sessionId: session.id,
      page,
      context,
      browser,
      session,
      fingerprint,
      behaviorProfile: this.behaviorEngine.currentProfile
    };
  }

  selectOS() {
    const osDistribution = [
      { os: 'windows', probability: 0.75 },
      { os: 'mac', probability: 0.15 },
      { os: 'linux', probability: 0.10 }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const { os, probability } of osDistribution) {
      cumulative += probability;
      if (random < cumulative) return os;
    }
    
    return 'windows';
  }

  async launchConfiguredBrowser(fingerprint, session) {
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--window-size=${fingerprint.screen.width},${fingerprint.screen.height}`,
      '--disable-dev-shm-usage',
      '--disable-notifications',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      `--user-agent=${fingerprint.userAgent}`
    ];
    
    // Add language
    if (fingerprint.language) {
      args.push(`--lang=${fingerprint.language}`);
    }
    
    return await chromium.launch({
      headless: false, // Set to true for production
      args,
      chromiumSandbox: false,
      ignoreDefaultArgs: ['--enable-automation'],
      viewport: fingerprint.viewport
    });
  }

  async navigateNaturally(page, targetUrl, session) {
    console.log(`🌐 Navigating to ${targetUrl} naturally...`);
    
    // Generate natural referrer
    const referrer = this.sessionManager.generateReferrer(
      targetUrl,
      session.history
    );
    
    console.log(`   Referrer: ${referrer || 'direct'}`);
    
    // Natural timing before navigation
    const navTiming = await this.timingEngine.generateActionTiming('navigate');
    await page.waitForTimeout(navTiming.delay);
    
    // Navigate with referrer
    if (referrer) {
      await page.goto(referrer, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000 + Math.random() * 3000);
      
      // Simulate clicking through from search
      if (referrer.includes('search')) {
        await this.simulateSearchClick(page, targetUrl);
      } else {
        await page.goto(targetUrl, { waitUntil: 'networkidle' });
      }
    } else {
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
    }
    
    // Update session
    await this.sessionManager.updateSession(session.id, {
      pageView: {
        url: targetUrl,
        title: await page.title(),
        referrer: referrer
      }
    });
    
    this.metrics.pagesVisited++;
  }

  async simulateSearchClick(page, targetUrl) {
    // Simulate finding and clicking the link in search results
    const links = await page.$$('a[href*="flippa.com"]');
    
    if (links.length > 0) {
      const targetLink = links[Math.floor(Math.random() * Math.min(3, links.length))];
      const box = await targetLink.boundingBox();
      
      if (box) {
        // Natural mouse movement to link
        await this.behaviorEngine.executeMouseMovement(page, {
          startX: 100 + Math.random() * 200,
          startY: 100 + Math.random() * 200,
          endX: box.x + box.width / 2,
          endY: box.y + box.height / 2
        }, this.behaviorEngine.currentProfile);
        
        // Click with natural hesitation
        await page.waitForTimeout(200 + Math.random() * 500);
        await targetLink.click();
      }
    } else {
      // Fallback to direct navigation
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
    }
  }

  async browseWithHumanBehavior(sessionId, options = {}) {
    const browserData = this.activeBrowsers.get(sessionId);
    if (!browserData) throw new Error('Session not found');
    
    const { page, session } = browserData;
    const { duration = 300000, intensity = 'normal' } = options; // 5 minutes default
    
    console.log(`\n🚶 Starting human-like browsing for ${duration / 1000}s...`);
    
    const startTime = Date.now();
    let actionsPerformed = [];
    
    while (Date.now() - startTime < duration) {
      // Step 1: Analyze current page context
      const context = await this.contextInteraction.analyzePageContext(page);
      console.log(`\n📄 Page type: ${context.pageType}`);
      console.log(`   Primary elements: ${context.primaryElements.length}`);
      console.log(`   Confidence: ${this.contextInteraction.contextState.confidenceLevel}`);
      
      // Step 2: Generate interaction plan
      const interactionPlan = await this.contextInteraction.generateInteractionPlan(page);
      console.log(`📋 Strategy: ${interactionPlan.strategy}`);
      console.log(`   Phases: ${interactionPlan.phases.length}`);
      console.log(`   Duration: ${interactionPlan.estimatedDuration / 1000}s`);
      
      // Step 3: Check if break is needed
      const breakNeeded = this.timingEngine.checkBreakNecessity();
      if (breakNeeded) {
        console.log(`☕ Taking ${breakNeeded.type} break...`);
        await this.timingEngine.executeBreak(page, breakNeeded);
        actionsPerformed.push('break');
        continue;
      }
      
      // Step 4: Execute interaction plan
      await this.contextInteraction.executeInteractionPlan(page, interactionPlan);
      actionsPerformed.push(...interactionPlan.phases.map(p => p.name));
      
      // Step 5: Check for tab behavior
      const tabBehavior = await this.timingEngine.simulateTabBehavior({
        type: interactionPlan.strategy
      });
      
      if (tabBehavior.action === 'new_tab') {
        console.log('📑 Opening new tab...');
        const newTab = await this.sessionManager.createTab(sessionId, {
          url: tabBehavior.newTab.url
        });
        // Continue in current tab for now
      }
      
      // Step 6: Update behavior state
      this.behaviorEngine.updateBehaviorState(
        interactionPlan.estimatedDuration,
        actionsPerformed.slice(-5)
      );
      
      this.timingEngine.updateUserState(
        { type: interactionPlan.strategy },
        interactionPlan.estimatedDuration
      );
      
      // Step 7: Natural pause between page interactions
      const pauseDuration = 3000 + Math.random() * 7000;
      await page.waitForTimeout(pauseDuration);
      
      // Check if should continue or navigate elsewhere
      if (Math.random() < 0.3) {
        // Navigate to another page
        const links = await page.$$('a[href*="flippa.com"]');
        if (links.length > 0) {
          const randomLink = links[Math.floor(Math.random() * links.length)];
          const href = await randomLink.getAttribute('href');
          if (href && !href.includes('login') && !href.includes('register')) {
            console.log(`🔗 Navigating to: ${href}`);
            await randomLink.click();
            await page.waitForLoadState('networkidle');
          }
        }
      }
    }
    
    console.log(`\n✅ Browsing session completed`);
    console.log(`   Actions performed: ${actionsPerformed.length}`);
    console.log(`   Final energy: ${this.timingEngine.userState.currentEnergy}`);
    console.log(`   Final focus: ${this.timingEngine.userState.currentFocus}`);
    
    return {
      duration: Date.now() - startTime,
      actionsPerformed,
      pagesVisited: this.metrics.pagesVisited,
      finalState: this.timingEngine.getStateSummary()
    };
  }

  async extractDataNaturally(sessionId, selectors) {
    const browserData = this.activeBrowsers.get(sessionId);
    if (!browserData) throw new Error('Session not found');
    
    const { page } = browserData;
    const extractedData = [];
    
    console.log(`\n📊 Extracting data naturally...`);
    
    for (const selector of selectors) {
      // Natural timing before looking at element
      const timing = await this.timingEngine.generateActionTiming('scan');
      await page.waitForTimeout(timing.delay);
      
      // Find element
      const element = await page.$(selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          // Simulate looking at the element
          await this.behaviorEngine.executeMouseMovement(page, {
            startX: box.x - 50,
            startY: box.y - 50,
            endX: box.x + box.width / 2,
            endY: box.y + box.height / 2
          }, this.behaviorEngine.currentProfile);
          
          // Extract data
          const data = await element.evaluate(el => ({
            text: el.textContent,
            href: el.href,
            className: el.className,
            tagName: el.tagName
          }));
          
          extractedData.push({
            selector,
            data,
            timestamp: Date.now()
          });
          
          this.metrics.dataExtracted++;
        }
      }
      
      // Natural pause between extractions
      await page.waitForTimeout(500 + Math.random() * 1500);
    }
    
    return extractedData;
  }

  async closeSession(sessionId) {
    const browserData = this.activeBrowsers.get(sessionId);
    if (!browserData) return;
    
    console.log(`\n🔚 Closing session ${sessionId}...`);
    
    // Natural closing behavior
    const { page, browser, session } = browserData;
    
    // Sometimes clear cookies (privacy conscious users)
    if (Math.random() < 0.2) {
      await page.context().clearCookies();
      console.log('   Cleared cookies');
    }
    
    // Save session for potential reuse
    await this.sessionManager.saveSession(session);
    
    // Close browser
    await browser.close();
    this.activeBrowsers.delete(sessionId);
    
    console.log('   Session closed successfully');
  }

  getMetrics() {
    const runtime = (Date.now() - this.metrics.startTime) / 1000;
    
    return {
      ...this.metrics,
      runtime: `${Math.floor(runtime / 60)}m ${Math.floor(runtime % 60)}s`,
      avgPagesPerSession: this.metrics.pagesVisited / Math.max(1, this.metrics.sessionsCreated),
      dataExtractionRate: this.metrics.dataExtracted / Math.max(1, runtime / 60)
    };
  }
}

// Export the system
module.exports = HumanSimulationSystem;

// Example usage
if (require.main === module) {
  (async () => {
    const simulator = new HumanSimulationSystem({
      maxConcurrentSessions: 3
    });
    
    try {
      // Create a human-like session
      const { sessionId, page } = await simulator.createHumanLikeSession({
        location: 'US',
        userType: 'researcher',
        taskType: 'evaluation',
        targetUrl: 'https://flippa.com/search?filter[property_type][]=website'
      });
      
      // Browse naturally for 2 minutes
      await simulator.browseWithHumanBehavior(sessionId, {
        duration: 120000,
        intensity: 'normal'
      });
      
      // Extract some data
      const data = await simulator.extractDataNaturally(sessionId, [
        '.listing-price',
        '.listing-title',
        '.listing-revenue'
      ]);
      
      console.log('\n📈 Extracted data:', data.length, 'items');
      
      // Close session
      await simulator.closeSession(sessionId);
      
      // Show metrics
      console.log('\n📊 Session metrics:', simulator.getMetrics());
      
    } catch (error) {
      console.error('Error:', error);
    }
  })();
}