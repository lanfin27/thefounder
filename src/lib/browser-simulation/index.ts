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
  targetUrl?: string;
  maxSessions?: number;
  sessionInterval?: { min: number; max: number }; // minutes
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
  userDataDir?: string;
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
    riskLevel: number;
  };
}

export interface SimulationStatus {
  active: boolean;
  activeSessions: number;
  sessionsCompleted: number;
  currentPersonas: string[];
  totalDataPoints: number;
  averageConfidence: number;
}

export class BrowserSimulationSystem extends EventEmitter {
  private config: SimulationConfig;
  private browser: Browser | null = null;
  private personaManager: PersonaManager;
  private sessionManager: SessionManager;
  private activeSessions: Map<string, SimulationSession> = new Map();
  private simulationActive: boolean = false;
  private completedSessions: SimulationResult[] = [];

  constructor(config: SimulationConfig = {}) {
    super();
    this.config = {
      headless: true,
      targetUrl: 'https://flippa.com',
      maxSessions: 3,
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
        '--disable-gpu',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain'
      ]
    });

    this.emit('initialized');
  }

  async startSimulation() {
    if (this.simulationActive) {
      console.log('Simulation already active');
      return;
    }

    if (!this.browser) {
      await this.initialize();
    }

    this.simulationActive = true;
    this.emit('simulationStarted');
    console.log('Browser simulation started');

    // Start initial sessions
    const initialSessions = Math.min(this.config.maxSessions!, 2);
    for (let i = 0; i < initialSessions; i++) {
      setTimeout(() => this.startNewSession(), i * 10000); // Stagger starts
    }

    // Schedule additional sessions
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
      
      // Create browser context with realistic settings
      const context = await this.createBrowserContext(adjustedPersona);
      
      // Create session
      const session = this.sessionManager.createSession(adjustedPersona);
      
      // Initialize simulation session
      const simulationSession = new SimulationSession(
        session,
        context,
        adjustedPersona,
        this.sessionManager,
        this.config.targetUrl!
      );

      this.activeSessions.set(session.id, simulationSession);
      
      // Start browsing
      simulationSession.on('complete', (result) => {
        this.handleSessionComplete(session.id, result);
      });

      simulationSession.on('error', (error) => {
        this.handleSessionError(session.id, error);
      });

      simulationSession.on('progress', (progress) => {
        this.emit('sessionProgress', {
          sessionId: session.id,
          ...progress
        });
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
      colorScheme: Math.random() > 0.5 ? 'light' : 'dark',
      reducedMotion: Math.random() > 0.8 ? 'reduce' : 'no-preference',
      forcedColors: Math.random() > 0.95 ? 'active' : 'none'
    };

    if (this.config.proxyUrl) {
      contextOptions.proxy = {
        server: this.config.proxyUrl
      };
    }

    const context = await this.browser!.newContext(contextOptions);
    
    // Apply session data
    const session = this.sessionManager.createSession(persona);
    await this.sessionManager.applySessionToBrowser(session, context);

    return context;
  }

  private generateUserAgent(persona: BrowsingPersona): string {
    const userAgents = {
      'Windows': [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
      ],
      'Mac': [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      ]
    };

    // Choose OS based on persona location (simplified heuristic)
    const os = persona.profile.location.includes('CA') || persona.profile.profession.includes('Developer') ? 'Mac' : 'Windows';
    const agents = userAgents[os];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  private handleSessionComplete(sessionId: string, result: SimulationResult) {
    console.log(`Session ${sessionId} completed:`, {
      persona: result.persona,
      duration: result.metrics.totalDuration / 1000 / 60, // minutes
      pagesVisited: result.pagesVisited,
      dataPoints: Object.keys(result.dataExtracted).length,
      confidence: result.metrics.dataConfidence
    });

    this.completedSessions.push(result);
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
    const cleanup = Array.from(this.activeSessions.entries()).map(async ([sessionId, session]) => {
      await session.stop();
      this.activeSessions.delete(sessionId);
    });

    await Promise.all(cleanup);
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

  getStatus(): SimulationStatus {
    const totalDataPoints = this.completedSessions.reduce((sum, session) => 
      sum + Object.keys(session.dataExtracted).length, 0
    );

    const averageConfidence = this.completedSessions.length > 0 ?
      this.completedSessions.reduce((sum, session) => sum + session.metrics.dataConfidence, 0) / this.completedSessions.length :
      0;

    return {
      active: this.simulationActive,
      activeSessions: this.activeSessions.size,
      sessionsCompleted: this.completedSessions.length,
      currentPersonas: Array.from(this.activeSessions.values()).map(s => s.persona.name),
      totalDataPoints,
      averageConfidence
    };
  }

  getResults(): SimulationResult[] {
    return [...this.completedSessions];
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
  private isActive: boolean = false;

  constructor(
    public session: BrowsingSession,
    private context: BrowserContext,
    public persona: BrowsingPersona,
    private sessionManager: SessionManager,
    private targetUrl: string
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
        dataConfidence: 0,
        riskLevel: 0
      }
    };
  }

  async start() {
    this.isActive = true;
    
    try {
      this.page = await this.context.newPage();
      
      // Enhance fingerprint and behavior
      await this.antiDetectionEngine.enhanceBrowserFingerprint(this.context);
      await this.antiDetectionEngine.injectRealisticBehavior(this.page, this.session);
      await this.antiDetectionEngine.implementMouseJitter(this.page);
      await this.antiDetectionEngine.simulateHumanErrors(this.page);
      
      // Set initial referrer if not direct
      if (this.session.referrer !== 'direct') {
        console.log(`Visiting referrer: ${this.session.referrer}`);
        await this.page.goto(this.session.referrer, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(2000 + Math.random() * 3000);
      }

      // Navigate to target and start browsing
      console.log(`Navigating to target: ${this.targetUrl}`);
      await this.navigateToPage(this.targetUrl);

      // Build and execute navigation path
      const navigationPath = this.sessionManager.buildNavigationPath(this.session);
      
      for (const relativePath of navigationPath) {
        if (!this.isActive) break;
        
        const fullUrl = new URL(relativePath, this.targetUrl).toString();
        await this.navigateToPage(fullUrl);
        
        // Check if session should end
        if (this.sessionManager.shouldEndSession(this.session)) {
          console.log('Session ended by session manager rules');
          break;
        }

        // Check risk level and adapt if needed
        const riskLevel = await this.antiDetectionEngine.evaluateRiskLevel(this.page!);
        this.result.metrics.riskLevel = Math.max(this.result.metrics.riskLevel, riskLevel);
        
        if (riskLevel > 70) {
          console.log('High risk level detected, ending session');
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
    if (!this.page || !this.isActive) return;

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
          console.log('CAPTCHA solved successfully');
        } else {
          console.log('Failed to solve CAPTCHA, continuing anyway');
        }
      }

      // Monitor for detection signals
      const signals = await this.antiDetectionEngine.monitorDetectionSignals(this.page);
      if (signals.length > 0) {
        console.log('Detection signals found:', signals.length);
        const adaptation = await this.antiDetectionEngine.adaptBehavior(signals);
        
        if (adaptation.switchPersona) {
          console.log('Switching persona due to high detection risk');
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
      this.result.metrics.interactionCount += interactionPlan.sequence.length;

      // Emit progress
      this.emit('progress', {
        pagesVisited: this.result.pagesVisited,
        dataPoints: Object.keys(this.result.dataExtracted).length,
        confidence: this.result.metrics.dataConfidence,
        riskLevel: this.result.metrics.riskLevel
      });

      // Natural pause between pages
      const pauseTime = this.persona.behavior.dwellTime.min * 1000 + 
        Math.random() * (this.persona.behavior.dwellTime.max - this.persona.behavior.dwellTime.min) * 1000;
      
      await this.page.waitForTimeout(pauseTime);

    } catch (error) {
      console.error(`Error navigating to ${url}:`, error);
      this.errors.push({ url, error: error instanceof Error ? error.message : String(error) });
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

    console.log('Session completed:', {
      sessionId: this.session.id,
      duration: this.result.metrics.totalDuration / 1000 / 60,
      pages: this.result.pagesVisited,
      dataPoints: Object.keys(this.result.dataExtracted).length
    });

    this.emit('complete', this.result);
  }

  async stop() {
    this.isActive = false;
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