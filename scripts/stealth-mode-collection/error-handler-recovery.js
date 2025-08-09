// error-handler-recovery.js
// Advanced error handling and recovery systems with graceful detection response

const EventEmitter = require('events');
const { performance } = require('perf_hooks');

class ErrorHandlerRecovery extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      initialBackoff: 1000,
      maxBackoff: 60000,
      detectionThreshold: 5,
      recoveryStrategies: ['delay', 'rotate', 'adapt', 'fallback'],
      errorPersistence: true,
      learningEnabled: true,
      ...config
    };

    // Error patterns database
    this.errorPatterns = {
      detection: this.initializeDetectionPatterns(),
      network: this.initializeNetworkPatterns(),
      parsing: this.initializeParsingPatterns(),
      resource: this.initializeResourcePatterns(),
      behavioral: this.initializeBehavioralPatterns()
    };

    // Recovery strategies
    this.recoveryStrategies = this.initializeRecoveryStrategies();

    // Error history for learning
    this.errorHistory = new Map();
    
    // Detection state tracking
    this.detectionState = {
      suspicionLevel: 0,
      detectionCount: 0,
      lastDetection: null,
      blockedResources: new Set(),
      failedSelectors: new Map(),
      adaptations: []
    };

    // Circuit breaker for preventing cascading failures
    this.circuitBreaker = {
      state: 'closed', // closed, open, half-open
      failures: 0,
      lastFailure: null,
      cooldownPeriod: 300000 // 5 minutes
    };

    // Performance metrics
    this.metrics = {
      errorsHandled: 0,
      successfulRecoveries: 0,
      detectionEvents: 0,
      adaptationsMade: 0,
      avgRecoveryTime: 0
    };
  }

  initializeDetectionPatterns() {
    return {
      captcha: {
        indicators: [
          'g-recaptcha',
          'h-captcha',
          'cf-challenge',
          'captcha',
          'robot-check',
          'human-verification'
        ],
        errorMessages: [
          'please verify you are human',
          'complete the captcha',
          'security check',
          'automated requests detected'
        ],
        statusCodes: [403, 429],
        recovery: ['solveCaptcha', 'rotateIdentity', 'increaseDelay']
      },

      rateLimit: {
        indicators: [
          'rate-limit',
          'too-many-requests',
          'slow-down'
        ],
        errorMessages: [
          'rate limit exceeded',
          'too many requests',
          'please slow down',
          'request limit reached'
        ],
        statusCodes: [429, 503],
        recovery: ['exponentialBackoff', 'rotateProxy', 'reduceFrequency']
      },

      banned: {
        indicators: [
          'banned',
          'blocked',
          'forbidden',
          'access-denied'
        ],
        errorMessages: [
          'access denied',
          'ip banned',
          'forbidden',
          'blocked due to suspicious activity'
        ],
        statusCodes: [403, 401],
        recovery: ['rotateFullIdentity', 'changeStrategy', 'waitAndRetry']
      },

      behavioral: {
        indicators: [
          'unusual-activity',
          'bot-detection',
          'automation-detected'
        ],
        errorMessages: [
          'unusual activity detected',
          'please use a regular browser',
          'automation tools detected'
        ],
        statusCodes: [403],
        recovery: ['enhanceBehavior', 'addNoise', 'mimicHuman']
      },

      honeypot: {
        indicators: [
          'hidden-field-filled',
          'trap-link-clicked',
          'invisible-element-interacted'
        ],
        errorMessages: [],
        statusCodes: [],
        recovery: ['avoidTraps', 'validateInteractions', 'resetSession']
      }
    };
  }

  initializeNetworkPatterns() {
    return {
      timeout: {
        code: 'ETIMEDOUT',
        recovery: ['retry', 'increaseTimeout', 'checkProxy']
      },
      connectionRefused: {
        code: 'ECONNREFUSED',
        recovery: ['waitAndRetry', 'checkTarget', 'rotateProxy']
      },
      dnsFailure: {
        code: 'ENOTFOUND',
        recovery: ['checkDNS', 'useAlternativeDNS', 'validateURL']
      },
      sslError: {
        code: 'CERT_',
        recovery: ['ignoreCertificate', 'updateCertificates', 'useHTTP']
      },
      proxyError: {
        code: 'PROXY_',
        recovery: ['rotateProxy', 'validateProxy', 'directConnection']
      }
    };
  }

  initializeParsingPatterns() {
    return {
      selectorNotFound: {
        indicators: ['no element found', 'selector failed'],
        recovery: ['updateSelectors', 'findAlternatives', 'useXPath']
      },
      unexpectedStructure: {
        indicators: ['unexpected format', 'structure changed'],
        recovery: ['adaptParsing', 'useFlexibleExtraction', 'learnNewPattern']
      },
      emptyResponse: {
        indicators: ['empty content', 'no data'],
        recovery: ['retryWithDifferentStrategy', 'checkJavaScript', 'waitLonger']
      },
      encodingError: {
        indicators: ['encoding error', 'decode failed'],
        recovery: ['detectEncoding', 'tryAlternativeEncodings', 'sanitizeContent']
      }
    };
  }

  initializeResourcePatterns() {
    return {
      memoryExhaustion: {
        indicators: ['out of memory', 'heap limit'],
        recovery: ['freeMemory', 'restartBrowser', 'reduceLoad']
      },
      cpuOverload: {
        indicators: ['cpu usage high', 'process slow'],
        recovery: ['throttleOperations', 'addDelays', 'optimizeCode']
      },
      diskSpace: {
        indicators: ['disk full', 'no space'],
        recovery: ['cleanupTemp', 'moveData', 'compressFiles']
      },
      browserCrash: {
        indicators: ['browser disconnected', 'page crashed'],
        recovery: ['restartBrowser', 'saveState', 'resumeFromCheckpoint']
      }
    };
  }

  initializeBehavioralPatterns() {
    return {
      tooFast: {
        indicators: ['actions too quick', 'inhuman speed'],
        recovery: ['addHumanDelays', 'varyTiming', 'simulateFatigue']
      },
      tooConsistent: {
        indicators: ['pattern detected', 'regular intervals'],
        recovery: ['addRandomness', 'varyPatterns', 'introduceErrors']
      },
      suspiciousNavigation: {
        indicators: ['direct access', 'no referrer'],
        recovery: ['useReferrer', 'simulateOrganic', 'addBrowsingHistory']
      },
      missingInteractions: {
        indicators: ['no mouse movement', 'no scrolling'],
        recovery: ['addMouseMovement', 'simulateReading', 'interactNaturally']
      }
    };
  }

  initializeRecoveryStrategies() {
    return {
      // Timing-based strategies
      delay: {
        execute: async (error, context) => {
          const delay = this.calculateBackoff(context.attempt);
          console.log(`⏱️ Applying delay: ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return { success: true, adjustment: { delay } };
        }
      },

      exponentialBackoff: {
        execute: async (error, context) => {
          const backoff = Math.min(
            this.config.initialBackoff * Math.pow(this.config.backoffMultiplier, context.attempt),
            this.config.maxBackoff
          );
          console.log(`📈 Exponential backoff: ${backoff}ms`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          return { success: true, adjustment: { backoff } };
        }
      },

      // Identity rotation strategies
      rotateProxy: {
        execute: async (error, context) => {
          console.log('🔄 Rotating proxy...');
          if (context.proxySystem) {
            const newProxy = await context.proxySystem.rotateProxy(
              context.currentProxy,
              'error_recovery'
            );
            return { success: true, adjustment: { proxy: newProxy } };
          }
          return { success: false, reason: 'No proxy system available' };
        }
      },

      rotateIdentity: {
        execute: async (error, context) => {
          console.log('🎭 Rotating identity...');
          const adjustments = {};
          
          // Rotate proxy
          if (context.proxySystem) {
            adjustments.proxy = await context.proxySystem.getNextProxy({
              excludeBlocked: true
            });
          }
          
          // Generate new fingerprint
          if (context.fingerprintSystem) {
            adjustments.fingerprint = context.fingerprintSystem.generateFingerprint();
          }
          
          // Clear cookies and session
          if (context.page) {
            await context.page.context().clearCookies();
            adjustments.cookiesCleared = true;
          }
          
          return { success: true, adjustment: adjustments };
        }
      },

      // Behavioral adaptations
      enhanceBehavior: {
        execute: async (error, context) => {
          console.log('🎯 Enhancing human behavior...');
          const enhancements = {
            mouseMovement: {
              enabled: true,
              frequency: 'high',
              naturalness: 'maximum'
            },
            scrolling: {
              enabled: true,
              pattern: 'reading',
              speed: 'variable'
            },
            delays: {
              between_actions: [1000, 3000],
              reading_time: true,
              random_pauses: true
            },
            interactions: {
              hover_elements: true,
              focus_inputs: true,
              random_clicks: 0.1
            }
          };
          
          return { success: true, adjustment: { behavior: enhancements } };
        }
      },

      addNoise: {
        execute: async (error, context) => {
          console.log('🎲 Adding behavioral noise...');
          const noise = {
            timing: {
              variance: 0.3,
              outliers: 0.1
            },
            mouse: {
              jitter: true,
              overshooting: 0.2,
              acceleration_variance: 0.4
            },
            scrolling: {
              irregular_patterns: true,
              backtracking: 0.15,
              momentum: 'variable'
            },
            mistakes: {
              typos: 0.05,
              misclicks: 0.02,
              corrections: true
            }
          };
          
          return { success: true, adjustment: { noise } };
        }
      },

      // Parsing adaptations
      updateSelectors: {
        execute: async (error, context) => {
          console.log('🔍 Updating selectors...');
          
          if (!context.page) {
            return { success: false, reason: 'No page context' };
          }
          
          // Try to find alternative selectors
          const alternatives = await this.findAlternativeSelectors(
            context.page,
            context.failedSelector,
            context.expectedContent
          );
          
          if (alternatives.length > 0) {
            // Update selector database
            this.updateSelectorDatabase(context.url, {
              old: context.failedSelector,
              new: alternatives[0],
              confidence: alternatives[0].confidence
            });
            
            return {
              success: true,
              adjustment: {
                selector: alternatives[0].selector,
                method: alternatives[0].method
              }
            };
          }
          
          return { success: false, reason: 'No alternative selectors found' };
        }
      },

      adaptParsing: {
        execute: async (error, context) => {
          console.log('🧩 Adapting parsing strategy...');
          
          // Try different parsing approaches
          const strategies = [
            'semantic', // Use NLP to understand content
            'visual',   // Use visual recognition
            'pattern',  // Use pattern matching
            'flexible'  // Use fuzzy matching
          ];
          
          for (const strategy of strategies) {
            try {
              const result = await this.tryParsingStrategy(
                context.page,
                strategy,
                context.targetData
              );
              
              if (result.success) {
                return {
                  success: true,
                  adjustment: {
                    parsingStrategy: strategy,
                    confidence: result.confidence
                  }
                };
              }
            } catch (err) {
              // Continue to next strategy
            }
          }
          
          return { success: false, reason: 'All parsing strategies failed' };
        }
      },

      // CAPTCHA handling
      solveCaptcha: {
        execute: async (error, context) => {
          console.log('🤖 Attempting CAPTCHA solution...');
          
          if (!context.captchaSolver) {
            return { success: false, reason: 'No CAPTCHA solver available' };
          }
          
          try {
            const solved = await context.captchaSolver.solve(context.page);
            if (solved) {
              this.detectionState.suspicionLevel = Math.max(0, this.detectionState.suspicionLevel - 1);
              return { success: true, adjustment: { captchaSolved: true } };
            }
          } catch (err) {
            console.error('CAPTCHA solving failed:', err.message);
          }
          
          return { success: false, reason: 'CAPTCHA solving failed' };
        }
      },

      // Fallback strategies
      fallback: {
        execute: async (error, context) => {
          console.log('🔙 Executing fallback strategy...');
          
          // Save current state
          if (context.saveState) {
            await context.saveState();
          }
          
          // Try alternative data source
          if (context.alternativeSource) {
            try {
              const data = await context.alternativeSource.getData();
              return {
                success: true,
                adjustment: {
                  dataSource: 'alternative',
                  data
                }
              };
            } catch (err) {
              // Fallback failed
            }
          }
          
          // Last resort: notify and wait
          this.emit('fallback_needed', { error, context });
          
          return {
            success: false,
            reason: 'Manual intervention may be required'
          };
        }
      }
    };
  }

  async handleError(error, context = {}) {
    const startTime = performance.now();
    this.metrics.errorsHandled++;
    
    console.log(`\n🚨 Error Handler Activated`);
    console.log(`   Error: ${error.message || error}`);
    console.log(`   Type: ${error.type || 'unknown'}`);
    
    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      if (Date.now() - this.circuitBreaker.lastFailure > this.circuitBreaker.cooldownPeriod) {
        this.circuitBreaker.state = 'half-open';
        console.log('🔌 Circuit breaker: half-open (testing recovery)');
      } else {
        console.log('🔌 Circuit breaker: open (rejecting requests)');
        throw new Error('Circuit breaker is open - too many failures');
      }
    }
    
    try {
      // Step 1: Classify error
      const classification = this.classifyError(error);
      console.log(`   Classification: ${classification.category} - ${classification.type}`);
      
      // Step 2: Check if detection event
      if (classification.category === 'detection') {
        await this.handleDetection(classification, context);
      }
      
      // Step 3: Get recovery strategies
      const strategies = this.getRecoveryStrategies(classification);
      console.log(`   Recovery strategies: ${strategies.join(', ')}`);
      
      // Step 4: Execute recovery
      const recoveryResult = await this.executeRecovery(
        error,
        strategies,
        context,
        classification
      );
      
      // Step 5: Update metrics and state
      if (recoveryResult.success) {
        this.metrics.successfulRecoveries++;
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'closed';
        
        const recoveryTime = performance.now() - startTime;
        this.updateAverageRecoveryTime(recoveryTime);
        
        console.log(`✅ Recovery successful in ${recoveryTime.toFixed(2)}ms`);
        
        // Learn from successful recovery
        if (this.config.learningEnabled) {
          await this.learnFromRecovery(error, classification, recoveryResult);
        }
        
        return recoveryResult;
        
      } else {
        this.circuitBreaker.failures++;
        
        if (this.circuitBreaker.failures >= 5) {
          this.circuitBreaker.state = 'open';
          this.circuitBreaker.lastFailure = Date.now();
          console.log('🔌 Circuit breaker: opened due to repeated failures');
        }
        
        throw new Error(`Recovery failed: ${recoveryResult.reason}`);
      }
      
    } catch (recoveryError) {
      console.error('❌ Error during recovery:', recoveryError.message);
      
      // Record failure
      this.recordErrorHistory(error, {
        classification: 'recovery_failure',
        context,
        recoveryError
      });
      
      throw recoveryError;
    }
  }

  classifyError(error) {
    // Check detection patterns
    for (const [type, pattern] of Object.entries(this.errorPatterns.detection)) {
      // Check status code
      if (error.status && pattern.statusCodes.includes(error.status)) {
        return { category: 'detection', type, pattern };
      }
      
      // Check error message
      const errorMessage = (error.message || '').toLowerCase();
      if (pattern.errorMessages.some(msg => errorMessage.includes(msg))) {
        return { category: 'detection', type, pattern };
      }
      
      // Check page content indicators
      if (error.pageContent) {
        const content = error.pageContent.toLowerCase();
        if (pattern.indicators.some(indicator => content.includes(indicator))) {
          return { category: 'detection', type, pattern };
        }
      }
    }
    
    // Check network patterns
    if (error.code) {
      for (const [type, pattern] of Object.entries(this.errorPatterns.network)) {
        if (error.code.includes(pattern.code)) {
          return { category: 'network', type, pattern };
        }
      }
    }
    
    // Check parsing patterns
    if (error.parsing || error.selector) {
      for (const [type, pattern] of Object.entries(this.errorPatterns.parsing)) {
        if (pattern.indicators.some(ind => error.message?.includes(ind))) {
          return { category: 'parsing', type, pattern };
        }
      }
    }
    
    // Check resource patterns
    for (const [type, pattern] of Object.entries(this.errorPatterns.resource)) {
      if (pattern.indicators.some(ind => error.message?.toLowerCase().includes(ind))) {
        return { category: 'resource', type, pattern };
      }
    }
    
    // Default classification
    return {
      category: 'unknown',
      type: 'generic',
      pattern: { recovery: ['delay', 'retry'] }
    };
  }

  async handleDetection(classification, context) {
    this.detectionState.detectionCount++;
    this.detectionState.lastDetection = Date.now();
    this.detectionState.suspicionLevel = Math.min(10, this.detectionState.suspicionLevel + 2);
    
    this.metrics.detectionEvents++;
    
    console.log(`\n🔍 Detection Event Detected`);
    console.log(`   Type: ${classification.type}`);
    console.log(`   Suspicion Level: ${this.detectionState.suspicionLevel}/10`);
    console.log(`   Total Detections: ${this.detectionState.detectionCount}`);
    
    // Emit detection event
    this.emit('detection', {
      type: classification.type,
      timestamp: Date.now(),
      suspicionLevel: this.detectionState.suspicionLevel,
      context
    });
    
    // Take immediate defensive action
    if (this.detectionState.suspicionLevel >= this.config.detectionThreshold) {
      console.log('⚠️ High suspicion level - taking defensive measures');
      
      // Add significant delay
      const cooldown = 30000 + Math.random() * 30000; // 30-60 seconds
      console.log(`   Cooling down for ${(cooldown / 1000).toFixed(1)}s`);
      await new Promise(resolve => setTimeout(resolve, cooldown));
      
      // Reset behavior to ultra-conservative
      if (context.behaviorEngine) {
        context.behaviorEngine.setProfile('ultra_conservative');
      }
    }
  }

  getRecoveryStrategies(classification) {
    const strategies = [];
    
    // Add pattern-specific strategies
    if (classification.pattern && classification.pattern.recovery) {
      strategies.push(...classification.pattern.recovery);
    }
    
    // Add general strategies based on category
    switch (classification.category) {
      case 'detection':
        strategies.push('rotateIdentity', 'enhanceBehavior');
        break;
      case 'network':
        strategies.push('retry', 'rotateProxy');
        break;
      case 'parsing':
        strategies.push('updateSelectors', 'adaptParsing');
        break;
      case 'resource':
        strategies.push('delay', 'reduceLoad');
        break;
    }
    
    // Always add fallback as last resort
    if (!strategies.includes('fallback')) {
      strategies.push('fallback');
    }
    
    return strategies;
  }

  async executeRecovery(error, strategies, context, classification) {
    let attempt = 0;
    const maxAttempts = this.config.maxRetries;
    
    for (const strategyName of strategies) {
      attempt++;
      console.log(`\n🔧 Attempting recovery strategy: ${strategyName} (${attempt}/${strategies.length})`);
      
      const strategy = this.recoveryStrategies[strategyName];
      if (!strategy) {
        console.warn(`   Strategy '${strategyName}' not implemented`);
        continue;
      }
      
      try {
        const result = await strategy.execute(error, {
          ...context,
          attempt,
          classification,
          detectionState: this.detectionState
        });
        
        if (result.success) {
          console.log(`   ✅ Strategy succeeded`);
          
          // Apply adjustments
          if (result.adjustment) {
            await this.applyAdjustments(result.adjustment, context);
            this.metrics.adaptationsMade++;
          }
          
          // Record successful strategy
          this.recordSuccessfulStrategy(classification, strategyName);
          
          return {
            success: true,
            strategy: strategyName,
            adjustment: result.adjustment,
            attempt
          };
        } else {
          console.log(`   ❌ Strategy failed: ${result.reason}`);
        }
        
      } catch (strategyError) {
        console.error(`   ❌ Strategy error: ${strategyError.message}`);
      }
    }
    
    return {
      success: false,
      reason: 'All recovery strategies exhausted',
      attemptedStrategies: strategies
    };
  }

  async applyAdjustments(adjustments, context) {
    console.log('📝 Applying adjustments...');
    
    // Apply proxy changes
    if (adjustments.proxy && context.setProxy) {
      await context.setProxy(adjustments.proxy);
      console.log('   ✓ Proxy updated');
    }
    
    // Apply fingerprint changes
    if (adjustments.fingerprint && context.applyFingerprint) {
      await context.applyFingerprint(adjustments.fingerprint);
      console.log('   ✓ Fingerprint updated');
    }
    
    // Apply behavior changes
    if (adjustments.behavior && context.behaviorEngine) {
      context.behaviorEngine.updateSettings(adjustments.behavior);
      console.log('   ✓ Behavior enhanced');
    }
    
    // Apply timing changes
    if (adjustments.delay && context.timingEngine) {
      context.timingEngine.setMinDelay(adjustments.delay);
      console.log(`   ✓ Minimum delay set to ${adjustments.delay}ms`);
    }
    
    // Apply parsing changes
    if (adjustments.selector && context.updateSelector) {
      context.updateSelector(adjustments.selector);
      console.log('   ✓ Selector updated');
    }
    
    // Record adaptations
    this.detectionState.adaptations.push({
      timestamp: Date.now(),
      adjustments: Object.keys(adjustments)
    });
  }

  async findAlternativeSelectors(page, failedSelector, expectedContent) {
    const alternatives = [];
    
    try {
      // Strategy 1: Text-based search
      if (expectedContent) {
        const textMatches = await page.evaluate((text) => {
          const elements = Array.from(document.querySelectorAll('*'));
          return elements
            .filter(el => el.innerText && el.innerText.includes(text))
            .map(el => ({
              tagName: el.tagName,
              className: el.className,
              id: el.id,
              xpath: getXPath(el)
            }));
          
          function getXPath(element) {
            if (element.id) return `//*[@id="${element.id}"]`;
            if (element === document.body) return '/html/body';
            
            let ix = 0;
            const siblings = element.parentNode.childNodes;
            for (let i = 0; i < siblings.length; i++) {
              const sibling = siblings[i];
              if (sibling === element) {
                return getXPath(element.parentNode) + '/' + 
                       element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
              }
              if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
              }
            }
          }
        }, expectedContent);
        
        textMatches.forEach(match => {
          alternatives.push({
            selector: match.id ? `#${match.id}` : match.xpath,
            method: match.id ? 'css' : 'xpath',
            confidence: 0.8
          });
        });
      }
      
      // Strategy 2: Similar class names
      const classPattern = failedSelector.match(/\.([a-zA-Z0-9-_]+)/);
      if (classPattern) {
        const baseClass = classPattern[1];
        const similarClasses = await page.evaluate((base) => {
          const elements = Array.from(document.querySelectorAll('*'));
          const similar = [];
          
          elements.forEach(el => {
            if (el.className && typeof el.className === 'string') {
              const classes = el.className.split(' ');
              classes.forEach(cls => {
                if (cls.includes(base) || base.includes(cls)) {
                  similar.push(`.${cls}`);
                }
              });
            }
          });
          
          return [...new Set(similar)];
        }, baseClass);
        
        similarClasses.forEach(selector => {
          alternatives.push({
            selector,
            method: 'css',
            confidence: 0.6
          });
        });
      }
      
      // Strategy 3: Structure-based search
      const structuralAlternatives = await this.findStructuralAlternatives(
        page,
        failedSelector
      );
      alternatives.push(...structuralAlternatives);
      
    } catch (error) {
      console.error('Error finding alternatives:', error.message);
    }
    
    // Sort by confidence
    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }

  async findStructuralAlternatives(page, failedSelector) {
    // Analyze the structure around where we expected the element
    const parentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.container'
    ];
    
    const alternatives = [];
    
    for (const parent of parentSelectors) {
      try {
        const exists = await page.$(parent);
        if (exists) {
          // Look for similar elements within this parent
          const elements = await page.evaluate((parentSel) => {
            const parent = document.querySelector(parentSel);
            if (!parent) return [];
            
            const allElements = parent.querySelectorAll('*');
            const grouped = {};
            
            allElements.forEach(el => {
              const key = `${el.tagName}_${el.className || 'no-class'}`;
              if (!grouped[key]) grouped[key] = 0;
              grouped[key]++;
            });
            
            return Object.entries(grouped)
              .filter(([key, count]) => count > 1)
              .map(([key]) => {
                const [tag, className] = key.split('_');
                return className !== 'no-class' 
                  ? `${parentSel} ${tag.toLowerCase()}.${className.split(' ')[0]}`
                  : `${parentSel} ${tag.toLowerCase()}`;
              });
          }, parent);
          
          elements.forEach(selector => {
            alternatives.push({
              selector,
              method: 'css',
              confidence: 0.5
            });
          });
        }
      } catch (err) {
        // Continue with next parent
      }
    }
    
    return alternatives;
  }

  async tryParsingStrategy(page, strategy, targetData) {
    switch (strategy) {
      case 'semantic':
        return await this.semanticParsing(page, targetData);
        
      case 'visual':
        return await this.visualParsing(page, targetData);
        
      case 'pattern':
        return await this.patternParsing(page, targetData);
        
      case 'flexible':
        return await this.flexibleParsing(page, targetData);
        
      default:
        return { success: false };
    }
  }

  async semanticParsing(page, targetData) {
    // Use NLP to understand content structure
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Simple semantic extraction (in production, use proper NLP)
    const patterns = {
      price: /\$[\d,]+(?:\.\d{2})?/g,
      email: /[\w.-]+@[\w.-]+\.\w+/g,
      phone: /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g,
      date: /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g
    };
    
    const extracted = {};
    
    for (const [key, pattern] of Object.entries(patterns)) {
      if (targetData.includes(key)) {
        const matches = pageText.match(pattern);
        if (matches && matches.length > 0) {
          extracted[key] = matches;
        }
      }
    }
    
    return {
      success: Object.keys(extracted).length > 0,
      data: extracted,
      confidence: 0.7
    };
  }

  async visualParsing(page, targetData) {
    // Use visual recognition for data extraction
    try {
      // Take screenshot
      const screenshot = await page.screenshot({ fullPage: true });
      
      // In production, use OCR or visual recognition
      // For now, return placeholder
      return {
        success: false,
        reason: 'Visual parsing not fully implemented'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async patternParsing(page, targetData) {
    // Look for common patterns in page structure
    const patterns = await page.evaluate(() => {
      const findRepeatingStructures = () => {
        const structures = new Map();
        
        // Find elements with similar classes
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ').filter(c => c.length > 0);
            classes.forEach(cls => {
              if (!structures.has(cls)) {
                structures.set(cls, []);
              }
              structures.set(cls, [...structures.get(cls), el]);
            });
          }
        });
        
        // Return patterns that repeat
        const repeating = [];
        structures.forEach((elements, className) => {
          if (elements.length > 3) {
            repeating.push({
              className,
              count: elements.length,
              sample: elements[0].innerText?.substring(0, 100)
            });
          }
        });
        
        return repeating.sort((a, b) => b.count - a.count);
      };
      
      return findRepeatingStructures();
    });
    
    // Use patterns to extract data
    if (patterns.length > 0) {
      const topPattern = patterns[0];
      const data = await page.evaluate((className) => {
        return Array.from(document.querySelectorAll(`.${className}`))
          .map(el => ({
            text: el.innerText,
            html: el.innerHTML.substring(0, 200)
          }));
      }, topPattern.className);
      
      return {
        success: true,
        data,
        pattern: topPattern.className,
        confidence: 0.6
      };
    }
    
    return { success: false };
  }

  async flexibleParsing(page, targetData) {
    // Use fuzzy matching and heuristics
    const results = await page.evaluate((targets) => {
      const extracted = {};
      
      // Fuzzy text matching
      const fuzzyMatch = (text, target, threshold = 0.7) => {
        const t1 = text.toLowerCase();
        const t2 = target.toLowerCase();
        
        // Simple character-based similarity
        let matches = 0;
        const minLen = Math.min(t1.length, t2.length);
        
        for (let i = 0; i < minLen; i++) {
          if (t1[i] === t2[i]) matches++;
        }
        
        return matches / Math.max(t1.length, t2.length) >= threshold;
      };
      
      // Search all text nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.nodeValue.trim();
        if (text.length > 0) {
          targets.forEach(target => {
            if (fuzzyMatch(text, target) || text.includes(target)) {
              if (!extracted[target]) extracted[target] = [];
              extracted[target].push({
                text,
                element: node.parentElement.tagName,
                path: getPath(node.parentElement)
              });
            }
          });
        }
      }
      
      function getPath(element) {
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
          let selector = element.tagName.toLowerCase();
          if (element.id) {
            selector += '#' + element.id;
          } else if (element.className) {
            selector += '.' + element.className.split(' ')[0];
          }
          path.unshift(selector);
          element = element.parentElement;
        }
        return path.join(' > ');
      }
      
      return extracted;
    }, targetData);
    
    return {
      success: Object.keys(results).length > 0,
      data: results,
      confidence: 0.5
    };
  }

  calculateBackoff(attempt) {
    const baseDelay = this.config.initialBackoff;
    const maxDelay = this.config.maxBackoff;
    const multiplier = this.config.backoffMultiplier;
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 - 0.15; // ±15%
    const delay = Math.min(
      baseDelay * Math.pow(multiplier, attempt - 1) * (1 + jitter),
      maxDelay
    );
    
    return Math.floor(delay);
  }

  recordErrorHistory(error, details) {
    const key = `${details.classification.category}_${details.classification.type}`;
    
    if (!this.errorHistory.has(key)) {
      this.errorHistory.set(key, {
        occurrences: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        successfulStrategies: new Map(),
        failedStrategies: new Set()
      });
    }
    
    const history = this.errorHistory.get(key);
    history.occurrences++;
    history.lastSeen = Date.now();
    
    // Keep history size manageable
    if (this.errorHistory.size > 1000) {
      // Remove oldest entries
      const sorted = Array.from(this.errorHistory.entries())
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
      
      for (let i = 0; i < 100; i++) {
        this.errorHistory.delete(sorted[i][0]);
      }
    }
  }

  recordSuccessfulStrategy(classification, strategy) {
    const key = `${classification.category}_${classification.type}`;
    const history = this.errorHistory.get(key);
    
    if (history) {
      const count = history.successfulStrategies.get(strategy) || 0;
      history.successfulStrategies.set(strategy, count + 1);
    }
  }

  async learnFromRecovery(error, classification, result) {
    // Analyze what worked
    const learning = {
      errorType: `${classification.category}_${classification.type}`,
      successfulStrategy: result.strategy,
      adjustments: result.adjustment,
      timestamp: Date.now()
    };
    
    // Update strategy preferences
    const history = this.errorHistory.get(learning.errorType);
    if (history && history.successfulStrategies.size > 5) {
      // Reorder strategies based on success rate
      const strategies = this.getRecoveryStrategies(classification);
      const sorted = strategies.sort((a, b) => {
        const aCount = history.successfulStrategies.get(a) || 0;
        const bCount = history.successfulStrategies.get(b) || 0;
        return bCount - aCount;
      });
      
      // Update pattern with learned preference
      if (classification.pattern) {
        classification.pattern.recovery = sorted;
      }
    }
    
    // Emit learning event
    this.emit('learning', learning);
  }

  updateAverageRecoveryTime(newTime) {
    const count = this.metrics.successfulRecoveries;
    const oldAvg = this.metrics.avgRecoveryTime;
    
    this.metrics.avgRecoveryTime = (oldAvg * (count - 1) + newTime) / count;
  }

  updateSelectorDatabase(url, update) {
    // In production, this would persist to a database
    console.log(`📝 Selector database updated for ${url}`);
    console.log(`   Old: ${update.old}`);
    console.log(`   New: ${update.new}`);
    console.log(`   Confidence: ${update.confidence}`);
    
    // Track failed selectors
    const domain = new URL(url).hostname;
    if (!this.detectionState.failedSelectors.has(domain)) {
      this.detectionState.failedSelectors.set(domain, new Map());
    }
    
    this.detectionState.failedSelectors.get(domain).set(update.old, {
      replacement: update.new,
      confidence: update.confidence,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      detectionState: {
        suspicionLevel: this.detectionState.suspicionLevel,
        detectionCount: this.detectionState.detectionCount,
        adaptationsMade: this.detectionState.adaptations.length
      },
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures
      },
      errorPatterns: {
        totalPatterns: Object.keys(this.errorPatterns).reduce(
          (sum, cat) => sum + Object.keys(this.errorPatterns[cat]).length,
          0
        ),
        knownErrors: this.errorHistory.size
      },
      performance: {
        avgRecoveryTimeMs: this.metrics.avgRecoveryTime.toFixed(2),
        successRate: (
          (this.metrics.successfulRecoveries / this.metrics.errorsHandled) * 100
        ).toFixed(2) + '%'
      }
    };
  }

  reset() {
    // Reset detection state
    this.detectionState = {
      suspicionLevel: 0,
      detectionCount: 0,
      lastDetection: null,
      blockedResources: new Set(),
      failedSelectors: new Map(),
      adaptations: []
    };
    
    // Reset circuit breaker
    this.circuitBreaker = {
      state: 'closed',
      failures: 0,
      lastFailure: null,
      cooldownPeriod: 300000
    };
    
    console.log('🔄 Error handler state reset');
  }
}

module.exports = ErrorHandlerRecovery;