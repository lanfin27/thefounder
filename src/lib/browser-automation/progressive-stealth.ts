// progressive-stealth.ts
// Progressive enhancement system for stealth features with fallback strategies

import { EventEmitter } from 'events';
import BrowserDetector, { BrowserAPI } from './browser-detector';
import { UniversalPage, UniversalContext } from './universal-browser';

export type StealthLevel = 'none' | 'basic' | 'enhanced' | 'advanced' | 'maximum';

export interface StealthConfig {
  level: StealthLevel;
  features: {
    userAgent?: boolean;
    viewport?: boolean;
    navigator?: boolean;
    webgl?: boolean;
    canvas?: boolean;
    fonts?: boolean;
    timezone?: boolean;
    language?: boolean;
    plugins?: boolean;
    webdriver?: boolean;
  };
  fallbackStrategies: boolean;
  testMode: boolean;
}

export interface StealthCapabilities {
  userAgentSpoofing: boolean;
  navigatorOverrides: boolean;
  webglFingerprinting: boolean;
  canvasFingerprinting: boolean;
  pluginSpoofing: boolean;
  timezoneOverride: boolean;
  languageOverride: boolean;
  webdriverHiding: boolean;
  fontFingerprinting: boolean;
}

export interface StealthResult {
  level: StealthLevel;
  appliedFeatures: string[];
  failedFeatures: string[];
  fallbacksUsed: string[];
  warnings: string[];
  success: boolean;
}

export class ProgressiveStealth extends EventEmitter {
  private detector: BrowserDetector;
  private browserAPI: BrowserAPI | null = null;
  private capabilities: StealthCapabilities | null = null;

  constructor(detector: BrowserDetector) {
    super();
    this.detector = detector;
    this.browserAPI = detector.getDetectedAPI();
  }

  async initialize(): Promise<void> {
    console.log('🥷 Initializing Progressive Stealth System...');
    
    if (!this.browserAPI) {
      throw new Error('Browser API not detected. Initialize BrowserDetector first.');
    }

    this.capabilities = await this.assessStealthCapabilities();
    console.log('✅ Progressive Stealth System initialized');
    this.emit('initialized', this.capabilities);
  }

  private async assessStealthCapabilities(): Promise<StealthCapabilities> {
    const api = this.browserAPI!;
    
    return {
      userAgentSpoofing: api.capabilities.userAgentOverride,
      navigatorOverrides: api.capabilities.evaluation || api.capabilities.addInitScript,
      webglFingerprinting: api.capabilities.evaluation || api.capabilities.addInitScript,
      canvasFingerprinting: api.capabilities.evaluation || api.capabilities.addInitScript,
      pluginSpoofing: api.capabilities.evaluation || api.capabilities.addInitScript,
      timezoneOverride: api.capabilities.evaluation || api.capabilities.addInitScript,
      languageOverride: api.capabilities.evaluation || api.capabilities.addInitScript,
      webdriverHiding: api.capabilities.evaluation || api.capabilities.addInitScript,
      fontFingerprinting: api.capabilities.evaluation || api.capabilities.addInitScript
    };
  }

  async applyStealth(
    pageOrContext: UniversalPage | UniversalContext,
    config: StealthConfig
  ): Promise<StealthResult> {
    console.log(`🛡️ Applying stealth level: ${config.level}`);

    const result: StealthResult = {
      level: config.level,
      appliedFeatures: [],
      failedFeatures: [],
      fallbacksUsed: [],
      warnings: [],
      success: false
    };

    try {
      const features = this.getStealthFeatures(config.level);
      
      for (const feature of features) {
        if (!config.features[feature as keyof typeof config.features]) {
          continue; // Skip disabled features
        }

        try {
          const applied = await this.applyStealthFeature(pageOrContext, feature, config);
          if (applied.success) {
            result.appliedFeatures.push(feature);
            result.fallbacksUsed.push(...applied.fallbacksUsed);
          } else {
            result.failedFeatures.push(feature);
            result.warnings.push(`Failed to apply ${feature}: ${applied.error}`);
          }
        } catch (error) {
          result.failedFeatures.push(feature);
          result.warnings.push(`Error applying ${feature}: ${error.message}`);
        }
      }

      result.success = result.appliedFeatures.length > 0;
      
      console.log(`${result.success ? '✅' : '⚠️'} Stealth application completed:`, {
        applied: result.appliedFeatures.length,
        failed: result.failedFeatures.length,
        level: config.level
      });

      this.emit('stealthApplied', result);
      return result;

    } catch (error) {
      console.error('❌ Stealth application failed:', error);
      result.warnings.push(`Critical error: ${error.message}`);
      return result;
    }
  }

  private getStealthFeatures(level: StealthLevel): string[] {
    const features = {
      none: [],
      basic: ['webdriver', 'userAgent'],
      enhanced: ['webdriver', 'userAgent', 'navigator', 'plugins'],
      advanced: ['webdriver', 'userAgent', 'navigator', 'plugins', 'timezone', 'language'],
      maximum: ['webdriver', 'userAgent', 'navigator', 'plugins', 'timezone', 'language', 'webgl', 'canvas', 'fonts']
    };

    return features[level] || features.basic;
  }

  private async applyStealthFeature(
    pageOrContext: UniversalPage | UniversalContext,
    feature: string,
    config: StealthConfig
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const fallbacksUsed: string[] = [];

    try {
      switch (feature) {
        case 'webdriver':
          return await this.hideWebdriver(pageOrContext, fallbacksUsed, config.testMode);
          
        case 'userAgent':
          return await this.spoofUserAgent(pageOrContext, fallbacksUsed, config.testMode);
          
        case 'navigator':
          return await this.overrideNavigator(pageOrContext, fallbacksUsed, config.testMode);
          
        case 'plugins':
          return await this.spoofPlugins(pageOrContext, fallbacksUsed, config.testMode);
          
        case 'webgl':
          return await this.spoofWebGL(pageOrContext, fallbacksUsed, config.testMode);
          
        case 'canvas':
          return await this.spoofCanvas(pageOrContext, fallbacksUsed, config.testMode);
          
        case 'timezone':
          return await this.overrideTimezone(pageOrContext, fallbacksUsed, config.testMode);
          
        case 'language':
          return await this.overrideLanguage(pageOrContext, fallbacksUsed, config.testMode);
          
        case 'fonts':
          return await this.spoofFonts(pageOrContext, fallbacksUsed, config.testMode);
          
        default:
          return { success: false, fallbacksUsed, error: `Unknown feature: ${feature}` };
      }
    } catch (error) {
      return { success: false, fallbacksUsed, error: error.message };
    }
  }

  private async hideWebdriver(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const script = () => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Hide automation properties
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    };

    try {
      // Try addInitScript first (Playwright)
      if ('addInitScript' in pageOrContext && pageOrContext.addInitScript) {
        await pageOrContext.addInitScript(script);
        if (testMode) console.log('✅ hideWebdriver: addInitScript used');
        return { success: true, fallbacksUsed };
      }

      // Try evaluateOnNewDocument (Puppeteer)
      if ('evaluateOnNewDocument' in pageOrContext && pageOrContext.evaluateOnNewDocument) {
        await pageOrContext.evaluateOnNewDocument(script);
        fallbacksUsed.push('evaluateOnNewDocument');
        if (testMode) console.log('✅ hideWebdriver: evaluateOnNewDocument used');
        return { success: true, fallbacksUsed };
      }

      // Fallback to page.evaluate (runs after page loads)
      if ('evaluate' in pageOrContext) {
        await (pageOrContext as UniversalPage).evaluate(script);
        fallbacksUsed.push('evaluate-after-load');
        if (testMode) console.log('⚠️ hideWebdriver: fallback to evaluate used');
        return { success: true, fallbacksUsed };
      }

      return { success: false, fallbacksUsed, error: 'No compatible method found' };
    } catch (error) {
      return { success: false, fallbacksUsed, error: error.message };
    }
  }

  private async spoofUserAgent(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
    ];

    const selectedUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    try {
      // Try setUserAgent method (Puppeteer)
      if ('setUserAgent' in pageOrContext && pageOrContext.setUserAgent) {
        await pageOrContext.setUserAgent(selectedUA);
        if (testMode) console.log('✅ spoofUserAgent: setUserAgent used');
        return { success: true, fallbacksUsed };
      }

      // Fallback: Override via script injection
      const script = (userAgent: string) => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => userAgent,
        });
      };

      if ('addInitScript' in pageOrContext && pageOrContext.addInitScript) {
        await pageOrContext.addInitScript(script, selectedUA);
        fallbacksUsed.push('addInitScript-override');
        if (testMode) console.log('⚠️ spoofUserAgent: addInitScript fallback used');
        return { success: true, fallbacksUsed };
      }

      if ('evaluate' in pageOrContext) {
        await (pageOrContext as UniversalPage).evaluate(script, selectedUA);
        fallbacksUsed.push('evaluate-override');
        if (testMode) console.log('⚠️ spoofUserAgent: evaluate fallback used');
        return { success: true, fallbacksUsed };
      }

      return { success: false, fallbacksUsed, error: 'No compatible method found' };
    } catch (error) {
      return { success: false, fallbacksUsed, error: error.message };
    }
  }

  private async overrideNavigator(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const script = () => {
      // Override common navigator properties
      Object.defineProperties(navigator, {
        hardwareConcurrency: { get: () => 4 },
        deviceMemory: { get: () => 8 },
        platform: { get: () => 'Win32' },
        languages: { get: () => ['en-US', 'en'] },
        maxTouchPoints: { get: () => 0 },
        cookieEnabled: { get: () => true }
      });
    };

    return await this.executeScriptWithFallbacks(pageOrContext, script, fallbacksUsed, testMode, 'overrideNavigator');
  }

  private async spoofPlugins(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const script = () => {
      // Create realistic plugin list
      const plugins = [
        { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', description: 'PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', description: 'Native Client', filename: 'internal-nacl-plugin' }
      ];

      Object.defineProperty(navigator, 'plugins', {
        get: () => plugins,
      });
    };

    return await this.executeScriptWithFallbacks(pageOrContext, script, fallbacksUsed, testMode, 'spoofPlugins');
  }

  private async spoofWebGL(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const script = () => {
      try {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
          if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
          return getParameter.apply(this, arguments as any);
        };
      } catch (error) {
        console.debug('WebGL spoofing failed:', error);
      }
    };

    return await this.executeScriptWithFallbacks(pageOrContext, script, fallbacksUsed, testMode, 'spoofWebGL');
  }

  private async spoofCanvas(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const script = () => {
      try {
        const toDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
          // Add slight noise to canvas fingerprinting
          const context = this.getContext('2d');
          if (context) {
            const imageData = context.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;
            
            // Add minimal noise
            for (let i = 0; i < data.length; i += 4) {
              if (Math.random() < 0.001) {
                data[i] = Math.floor(Math.random() * 255);
              }
            }
            
            context.putImageData(imageData, 0, 0);
          }
          
          return toDataURL.apply(this, arguments as any);
        };
      } catch (error) {
        console.debug('Canvas spoofing failed:', error);
      }
    };

    return await this.executeScriptWithFallbacks(pageOrContext, script, fallbacksUsed, testMode, 'spoofCanvas');
  }

  private async overrideTimezone(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const script = () => {
      try {
        const DateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(...args: any[]) {
          if (args.length === 0) {
            args = ['en-US', { timeZone: 'America/New_York' }];
          }
          return new (DateTimeFormat as any)(...args);
        } as any;
      } catch (error) {
        console.debug('Timezone override failed:', error);
      }
    };

    return await this.executeScriptWithFallbacks(pageOrContext, script, fallbacksUsed, testMode, 'overrideTimezone');
  }

  private async overrideLanguage(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const script = () => {
      Object.defineProperties(navigator, {
        language: { get: () => 'en-US' },
        languages: { get: () => ['en-US', 'en'] }
      });
    };

    return await this.executeScriptWithFallbacks(pageOrContext, script, fallbacksUsed, testMode, 'overrideLanguage');
  }

  private async spoofFonts(
    pageOrContext: UniversalPage | UniversalContext,
    fallbacksUsed: string[],
    testMode: boolean
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    const script = () => {
      try {
        // Prevent font enumeration
        if ('fonts' in document) {
          const originalCheck = (document as any).fonts.check;
          (document as any).fonts.check = function() {
            return true; // Always return true to prevent font detection
          };
        }
      } catch (error) {
        console.debug('Font spoofing failed:', error);
      }
    };

    return await this.executeScriptWithFallbacks(pageOrContext, script, fallbacksUsed, testMode, 'spoofFonts');
  }

  private async executeScriptWithFallbacks(
    pageOrContext: UniversalPage | UniversalContext,
    script: Function,
    fallbacksUsed: string[],
    testMode: boolean,
    featureName: string
  ): Promise<{ success: boolean; fallbacksUsed: string[]; error?: string }> {
    try {
      // Try addInitScript first (Playwright)
      if ('addInitScript' in pageOrContext && pageOrContext.addInitScript) {
        await pageOrContext.addInitScript(script);
        if (testMode) console.log(`✅ ${featureName}: addInitScript used`);
        return { success: true, fallbacksUsed };
      }

      // Try evaluateOnNewDocument (Puppeteer)
      if ('evaluateOnNewDocument' in pageOrContext && pageOrContext.evaluateOnNewDocument) {
        await pageOrContext.evaluateOnNewDocument(script);
        fallbacksUsed.push('evaluateOnNewDocument');
        if (testMode) console.log(`✅ ${featureName}: evaluateOnNewDocument used`);
        return { success: true, fallbacksUsed };
      }

      // Fallback to page.evaluate
      if ('evaluate' in pageOrContext) {
        await (pageOrContext as UniversalPage).evaluate(script);
        fallbacksUsed.push('evaluate-after-load');
        if (testMode) console.log(`⚠️ ${featureName}: fallback to evaluate used`);
        return { success: true, fallbacksUsed };
      }

      return { success: false, fallbacksUsed, error: 'No compatible method found' };
    } catch (error) {
      return { success: false, fallbacksUsed, error: error.message };
    }
  }

  getCapabilities(): StealthCapabilities | null {
    return this.capabilities;
  }

  generateStealthReport(result: StealthResult): string {
    const report = [
      `🥷 Stealth Application Report`,
      `Level: ${result.level}`,
      `Success: ${result.success ? '✅' : '❌'}`,
      ``,
      `✅ Applied Features (${result.appliedFeatures.length}):`,
      ...result.appliedFeatures.map(f => `  - ${f}`),
      ``,
      `❌ Failed Features (${result.failedFeatures.length}):`,
      ...result.failedFeatures.map(f => `  - ${f}`),
      ``,
      `🔄 Fallbacks Used (${result.fallbacksUsed.length}):`,
      ...result.fallbacksUsed.map(f => `  - ${f}`),
      ``,
      `⚠️ Warnings (${result.warnings.length}):`,
      ...result.warnings.map(w => `  - ${w}`)
    ].join('\n');

    return report;
  }
}

export default ProgressiveStealth;