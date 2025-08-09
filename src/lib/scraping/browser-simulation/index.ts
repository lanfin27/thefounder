// index.ts
// Main browser simulation system that integrates all components

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { EventEmitter } from 'events';
import { PersonaManager, BrowsingPersona } from './personas';
import { SessionManager, BrowsingSession } from './session-manager';
import { ContextualInteractionEngine } from './contextual-interaction';
import { AntiDetectionEngine } from './anti-detection';
import { IntelligentDataExtractor } from './intelligent-extractor';

export interface SimulationConfig {
  headless?: boolean;
  proxyUrl?: string;
  userDataDir?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
  maxSessions?: number;
  sessionInterval?: { min: number; max: number }; // minutes
}

export interface SimulationResult {
  sessionId: string;
  persona: string;
  startTime: Date;
  endTime: Date;
  pagesVisited: number;
  dataExtracted: Record<string, any>;
  captchasEncountered: number;
  captchasSolved: number;
  errors: any[];
  metrics: {
    totalDuration: number;
    averageDwellTime: number;
    interactionCount: number;
    dataConfidence: number;
  };
}

export class BrowserSimulationSystem extends EventEmitter {
  private config: SimulationConfig;
  private browser: Browser | null = null;
  private personaManager: PersonaManager;
  private sessionManager: SessionManager;
  private activeSessions: Map<string, SimulationSession> = new Map();
  private simulationActive: boolean = false;

  constructor(config: SimulationConfig = {}) {
    super();
    this.config = {
      headless: true,
      maxSessions: 5,
      sessionInterval: { min: 30, max: 120 },
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezone: 'America/New_York',
      ...config
    };
    
    this.personaManager = new PersonaManager();
    this.sessionManager = new SessionManager();
  }

  async initialize() {
    console.log('Initializing browser simulation system...');
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    this.emit('initialized');
  }

  async startSimulation() {
    if (this.simulationActive) {
      console.log('Simulation already active');
      return;
    }

    this.simulationActive = true;
    this.emit('simulationStarted');

    // Start session scheduling
    this.scheduleNextSession();
  }

  private scheduleNextSession() {
    if (!this.simulationActive) return;

    const { min, max } = this.config.sessionInterval!;
    const delay = (min + Math.random() * (max - min)) * 60 * 1000; // Convert to ms

    setTimeout(async () => {
      if (this.activeSessions.size < this.config.maxSessions!) {
        await this.startNewSession();
      }
      this.scheduleNextSession();
    }, delay);
  }

  private async startNewSession() {
    try {
      // Select or switch persona
      const persona = this.personaManager.selectRandomPersona();
      const adjustedPersona = this.personaManager.adjustForTimeOfDay(persona);
      
      console.log(`Starting new session with persona: ${adjustedPersona.name}`);
      
      // Create browser context
      const context = await this.createBrowserContext(adjustedPersona);
      
      // Create session
      const session = this.sessionManager.createSession(adjustedPersona);
      
      // Initialize simulation session
      const simulationSession = new SimulationSession(
        session,
        context,
        adjustedPersona,
        this.sessionManager
      );

      this.activeSessions.set(session.id, simulationSession);
      
      // Start browsing
      simulationSession.on('complete', (result) => {
        this.handleSessionComplete(session.id, result);
      });

      simulationSession.on('error', (error) => {
        this.handleSessionError(session.id, error);
      });

      await simulationSession.start();

    } catch (error) {
      console.error('Failed to start new session:', error);
      this.emit('sessionError', error);
    }
  }

  private async createBrowserContext(persona: BrowsingPersona): Promise<BrowserContext> {
    const contextOptions: any = {
      viewport: this.config.viewport,
      locale: this.config.locale,
      timezoneId: persona.profile.timezone || this.config.timezone,
      userAgent: this.generateUserAgent(persona),
      deviceScaleFactor: 1 + Math.random() * 0.5,
      hasTouch: Math.random() > 0.7,
      colorScheme: Math.random() > 0.5 ? 'light' : 'dark'
    };

    if (this.config.proxyUrl) {
      contextOptions.proxy = {
        server: this.config.proxyUrl
      };
    }

    const context = await this.browser!.newContext(contextOptions);
    
    // Apply session data
    await this.sessionManager.applySessionToBrowser(
      this.sessionManager.sessions.get(persona.id) || this.sessionManager.createSession(persona),
      context
    );

    return context;
  }

  private generateUserAgent(persona: BrowsingPersona): string {
    const userAgents = {
      'Windows': [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
      ],
      'Mac': [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
      ]
    };

    const os = persona.profile.location.includes('CA') ? 'Mac' : 'Windows';
    const agents = userAgents[os];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  private handleSessionComplete(sessionId: string, result: SimulationResult) {
    console.log(`Session ${sessionId} completed:`, {
      persona: result.persona,
      duration: result.metrics.totalDuration,
      pagesVisited: result.pagesVisited,
      dataPoints: Object.keys(result.dataExtracted).length
    });

    this.activeSessions.delete(sessionId);
    this.sessionManager.cleanupSession(sessionId);
    this.emit('sessionComplete', result);
  }

  private handleSessionError(sessionId: string, error: any) {
    console.error(`Session ${sessionId} error:`, error);
    
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.cleanup();
      this.activeSessions.delete(sessionId);
    }
    
    this.emit('sessionError', { sessionId, error });
  }

  async stopSimulation() {
    this.simulationActive = false;
    
    // Clean up active sessions
    for (const [sessionId, session] of this.activeSessions) {
      await session.stop();
      this.activeSessions.delete(sessionId);
    }

    this.emit('simulationStopped');
  }

  async shutdown() {
    await this.stopSimulation();
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.emit('shutdown');
  }

  getStatus() {
    return {
      active: this.simulationActive,
      activeSessions: this.activeSessions.size,
      sessionsCompleted: this.sessionManager.sessions.size - this.activeSessions.size,
      currentPersonas: Array.from(this.activeSessions.values()).map(s => s.persona.name)
    };
  }
}

// Individual session handler
class SimulationSession extends EventEmitter {
  private page: Page | null = null;
  private interactionEngine: ContextualInteractionEngine;
  private antiDetectionEngine: AntiDetectionEngine;
  private dataExtractor: IntelligentDataExtractor;
  private result: SimulationResult;
  private errors: any[] = [];

  constructor(
    public session: BrowsingSession,
    private context: BrowserContext,
    public persona: BrowsingPersona,
    private sessionManager: SessionManager
  ) {
    super();
    
    this.interactionEngine = new ContextualInteractionEngine(persona);
    this.antiDetectionEngine = new AntiDetectionEngine(persona, sessionManager);
    this.dataExtractor = new IntelligentDataExtractor(persona);
    
    this.result = {
      sessionId: session.id,
      persona: persona.name,
      startTime: new Date(),
      endTime: new Date(),
      pagesVisited: 0,
      dataExtracted: {},
      captchasEncountered: 0,
      captchasSolved: 0,
      errors: [],
      metrics: {
        totalDuration: 0,
        averageDwellTime: 0,
        interactionCount: 0,
        dataConfidence: 0
      }
    };
  }

  async start() {
    try {
      this.page = await this.context.newPage();
      
      // Enhance fingerprint
      await this.antiDetectionEngine.enhanceBrowserFingerprint(this.context);
      
      // Inject realistic behavior
      await this.antiDetectionEngine.injectRealisticBehavior(this.page, this.session);
      
      // Start mouse jitter
      await this.antiDetectionEngine.implementMouseJitter(this.page);
      
      // Add human errors simulation
      await this.antiDetectionEngine.simulateHumanErrors(this.page);
      
      // Set initial referrer
      if (this.session.referrer !== 'direct') {
        await this.page.goto(this.session.referrer);
        await this.page.waitForTimeout(2000 + Math.random() * 2000);
      }

      // Build and execute navigation path
      const navigationPath = this.sessionManager.buildNavigationPath(this.session);
      
      for (const url of navigationPath) {
        if (!this.page) break;
        
        await this.navigateToPage(url);
        
        // Check if session should end
        if (this.sessionManager.shouldEndSession(this.session)) {
          break;
        }
      }

      // Complete session
      await this.completeSession();

    } catch (error) {
      console.error('Session error:', error);
      this.errors.push(error);
      this.emit('error', error);
    }
  }

  private async navigateToPage(url: string) {
    if (!this.page) return;

    console.log(`Navigating to: ${url}`);
    const startTime = Date.now();

    try {
      // Navigate with realistic timing
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait for page to stabilize
      await this.page.waitForTimeout(1000 + Math.random() * 2000);

      // Check for CAPTCHA
      const captcha = await this.antiDetectionEngine.detectCaptcha(this.page);
      if (captcha.detected) {
        this.result.captchasEncountered++;
        console.log('CAPTCHA detected, attempting to solve...');
        
        const solved = await this.antiDetectionEngine.solveCaptcha(this.page, captcha);
        if (solved) {
          this.result.captchasSolved++;
        } else {
          console.log('Failed to solve CAPTCHA, skipping page');
          return;
        }
      }

      // Monitor for detection signals
      const signals = await this.antiDetectionEngine.monitorDetectionSignals(this.page);
      if (signals.length > 0) {
        console.log('Detection signals found:', signals);
        const adaptation = await this.antiDetectionEngine.adaptBehavior(signals);
        
        if (adaptation.switchPersona) {
          console.log('High risk detected, switching persona');
          this.emit('personaSwitch', adaptation);
          return;
        }

        if (adaptation.backoffDuration > 0) {
          console.log(`Backing off for ${adaptation.backoffDuration / 1000} seconds`);
          await this.page.waitForTimeout(adaptation.backoffDuration);
        }
      }

      // Analyze page context
      const context = await this.interactionEngine.analyzePageContext(this.page);
      
      // Plan and execute interactions
      const interactionPlan = await this.interactionEngine.planInteraction(this.page);
      await this.interactionEngine.executeInteractionPlan(this.page, interactionPlan);

      // Extract data intelligently
      const extractedData = await this.dataExtractor.extractWithHumanPattern(this.page, context);
      
      // Merge extracted data
      Object.assign(this.result.dataExtracted, extractedData.data);
      this.result.metrics.dataConfidence = 
        (this.result.metrics.dataConfidence + extractedData.confidence) / 2;

      // Update session history
      const dwellTime = Date.now() - startTime;
      this.sessionManager.addToHistory(this.session.id, {
        url,
        title: await this.page.title(),
        dwellTime,
        interactions: interactionPlan.sequence.length,
        scrollDepth: 0.8, // Simplified for now
        exitType: 'link'
      });

      // Sync session data
      await this.sessionManager.syncSessionData(this.session.id, this.page);

      this.result.pagesVisited++;
      
      // Simulate tab behavior
      const tabActions = this.sessionManager.simulateTabBehavior(this.session);
      for (const action of tabActions) {
        if (action.action === 'open') {
          // Would open new tab in real implementation
          console.log(`Would open tab ${action.tabId}`);
        }
      }

      // Natural pause between pages
      await this.page.waitForTimeout(
        this.persona.behavior.dwellTime.min * 1000 + 
        Math.random() * (this.persona.behavior.dwellTime.max - this.persona.behavior.dwellTime.min) * 1000
      );

    } catch (error) {
      console.error(`Error navigating to ${url}:`, error);
      this.errors.push({ url, error });
    }
  }

  private async completeSession() {
    this.result.endTime = new Date();
    this.result.metrics.totalDuration = 
      this.result.endTime.getTime() - this.result.startTime.getTime();
    
    const summary = this.sessionManager.getSessionSummary(this.session.id);
    if (summary) {
      this.result.metrics.averageDwellTime = summary.averageDwellTime;
    }

    const interactionSummary = this.interactionEngine.getInteractionSummary();
    this.result.metrics.interactionCount = interactionSummary.totalInteractions;

    this.result.errors = this.errors;

    this.emit('complete', this.result);
  }

  async stop() {
    await this.cleanup();
    this.emit('stopped');
  }

  async cleanup() {
    this.antiDetectionEngine.cleanup();
    
    if (this.page) {
      await this.page.close().catch(console.error);
      this.page = null;
    }
    
    if (this.context) {
      await this.context.close().catch(console.error);
    }
  }
}

export default BrowserSimulationSystem;