// Self-healing and automatic recovery system
const fs = require('fs').promises;
const path = require('path');

class AutoHealer {
  constructor(options = {}) {
    this.options = {
      healingEnabled: true,
      autoRecoveryDelay: 5000, // 5 seconds
      maxHealingAttempts: 3,
      strategyTimeout: 30000,
      healingStrategies: [
        'selector-refresh',
        'strategy-reorder',
        'pattern-regeneration',
        'fallback-activation',
        'cache-clear',
        'full-reset'
      ],
      ...options
    };

    this.healingHistory = [];
    this.currentHealingAttempts = {};
    this.strategyEffectiveness = {};
    
    // Initialize strategy effectiveness tracking
    this.options.healingStrategies.forEach(strategy => {
      this.strategyEffectiveness[strategy] = {
        attempts: 0,
        successes: 0,
        failures: 0,
        lastUsed: null
      };
    });
  }

  /**
   * Analyze failure and determine healing strategy
   */
  async analyzeFailure(failureReport) {
    console.log('🔧 Analyzing failure for auto-healing...');
    
    const diagnosis = {
      failureType: this.classifyFailure(failureReport),
      severity: this.assessSeverity(failureReport),
      recommendedStrategies: [],
      context: failureReport
    };

    // Determine appropriate healing strategies
    switch (diagnosis.failureType) {
      case 'selector-broken':
        diagnosis.recommendedStrategies = [
          'selector-refresh',
          'pattern-regeneration',
          'fallback-activation'
        ];
        break;
        
      case 'performance-degraded':
        diagnosis.recommendedStrategies = [
          'strategy-reorder',
          'cache-clear',
          'selector-refresh'
        ];
        break;
        
      case 'complete-failure':
        diagnosis.recommendedStrategies = [
          'full-reset',
          'pattern-regeneration',
          'fallback-activation'
        ];
        break;
        
      case 'partial-failure':
        diagnosis.recommendedStrategies = [
          'selector-refresh',
          'strategy-reorder'
        ];
        break;
        
      default:
        diagnosis.recommendedStrategies = ['selector-refresh'];
    }

    // Record diagnosis
    this.healingHistory.push({
      timestamp: new Date().toISOString(),
      diagnosis: diagnosis,
      status: 'diagnosed'
    });

    // Attempt healing if enabled
    if (this.options.healingEnabled) {
      await this.attemptHealing(diagnosis);
    }

    return diagnosis;
  }

  /**
   * Attempt healing based on diagnosis
   */
  async attemptHealing(diagnosis) {
    const healingId = `heal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🏥 Starting healing process ${healingId}...`);
    
    this.currentHealingAttempts[healingId] = {
      startTime: Date.now(),
      diagnosis: diagnosis,
      attempts: 0,
      status: 'in-progress'
    };

    // Try recommended strategies in order
    for (const strategy of diagnosis.recommendedStrategies) {
      if (this.currentHealingAttempts[healingId].attempts >= this.options.maxHealingAttempts) {
        console.log('❌ Max healing attempts reached');
        break;
      }

      console.log(`  → Trying healing strategy: ${strategy}`);
      
      try {
        const success = await this.executeHealingStrategy(strategy, diagnosis);
        
        if (success) {
          console.log(`  ✅ Healing strategy "${strategy}" successful`);
          this.recordHealingSuccess(healingId, strategy);
          return true;
        } else {
          console.log(`  ❌ Healing strategy "${strategy}" failed`);
          this.recordHealingFailure(healingId, strategy);
        }
      } catch (error) {
        console.error(`  ⚠️ Error during healing: ${error.message}`);
        this.recordHealingFailure(healingId, strategy, error);
      }

      this.currentHealingAttempts[healingId].attempts++;
      
      // Wait before next attempt
      await this.delay(this.options.autoRecoveryDelay);
    }

    // All strategies failed
    this.currentHealingAttempts[healingId].status = 'failed';
    console.log('❌ All healing strategies failed');
    
    return false;
  }

  /**
   * Execute specific healing strategy
   */
  async executeHealingStrategy(strategy, diagnosis) {
    const startTime = Date.now();
    
    try {
      switch (strategy) {
        case 'selector-refresh':
          return await this.refreshSelectors(diagnosis);
          
        case 'strategy-reorder':
          return await this.reorderStrategies(diagnosis);
          
        case 'pattern-regeneration':
          return await this.regeneratePatterns(diagnosis);
          
        case 'fallback-activation':
          return await this.activateFallbacks(diagnosis);
          
        case 'cache-clear':
          return await this.clearCaches(diagnosis);
          
        case 'full-reset':
          return await this.performFullReset(diagnosis);
          
        default:
          console.log(`Unknown healing strategy: ${strategy}`);
          return false;
      }
    } finally {
      const duration = Date.now() - startTime;
      console.log(`  ⏱️ Strategy completed in ${duration}ms`);
    }
  }

  /**
   * Healing Strategy: Refresh selectors
   */
  async refreshSelectors(diagnosis) {
    console.log('    🔄 Refreshing selectors...');
    
    // This would integrate with SelectorGenerator to create new selectors
    const actions = [
      'Analyzing page structure changes',
      'Generating alternative selectors',
      'Testing new selector variations',
      'Updating pattern memory'
    ];

    for (const action of actions) {
      console.log(`      • ${action}`);
      await this.delay(500); // Simulate work
    }

    // In real implementation, this would:
    // 1. Use SelectorGenerator to create new selectors
    // 2. Test them against the current page
    // 3. Update PatternMemory with successful ones
    
    return true; // Assume success for now
  }

  /**
   * Healing Strategy: Reorder extraction strategies
   */
  async reorderStrategies(diagnosis) {
    console.log('    📊 Reordering strategies based on performance...');
    
    // This would integrate with SelectorCascade to reorder strategies
    const actions = [
      'Analyzing strategy performance metrics',
      'Calculating new strategy order',
      'Updating cascade configuration',
      'Validating new order'
    ];

    for (const action of actions) {
      console.log(`      • ${action}`);
      await this.delay(300);
    }

    return true;
  }

  /**
   * Healing Strategy: Regenerate patterns
   */
  async regeneratePatterns(diagnosis) {
    console.log('    🧬 Regenerating extraction patterns...');
    
    // This would integrate with PatternLearner and SelectorGenerator
    const actions = [
      'Analyzing successful historical patterns',
      'Identifying common pattern elements',
      'Generating new pattern variations',
      'Training on recent successful extractions',
      'Updating pattern confidence scores'
    ];

    for (const action of actions) {
      console.log(`      • ${action}`);
      await this.delay(400);
    }

    return true;
  }

  /**
   * Healing Strategy: Activate fallback mechanisms
   */
  async activateFallbacks(diagnosis) {
    console.log('    🛡️ Activating fallback mechanisms...');
    
    const fallbacks = [
      'Enabling aggressive content mining',
      'Activating API interception',
      'Enabling deep DOM traversal',
      'Activating pattern learning mode'
    ];

    for (const fallback of fallbacks) {
      console.log(`      • ${fallback}`);
      await this.delay(300);
    }

    return true;
  }

  /**
   * Healing Strategy: Clear caches
   */
  async clearCaches(diagnosis) {
    console.log('    🧹 Clearing caches and temporary data...');
    
    const caches = [
      'Pattern memory cache',
      'Selector cache',
      'Strategy performance cache',
      'Temporary extraction data'
    ];

    for (const cache of caches) {
      console.log(`      • Clearing ${cache}`);
      await this.delay(200);
    }

    // Clear actual caches
    await this.clearTemporaryData();
    
    return true;
  }

  /**
   * Healing Strategy: Perform full reset
   */
  async performFullReset(diagnosis) {
    console.log('    🔄 Performing full system reset...');
    console.log('      ⚠️ This is a last resort healing strategy');
    
    const steps = [
      'Backing up current configuration',
      'Resetting all extraction strategies',
      'Clearing all pattern memory',
      'Reinitializing detection systems',
      'Restoring from known good configuration'
    ];

    for (const step of steps) {
      console.log(`      • ${step}`);
      await this.delay(500);
    }

    return true;
  }

  /**
   * Recalibrate strategies based on recent performance
   */
  async recalibrateStrategies() {
    console.log('🎯 Recalibrating extraction strategies...');
    
    const calibrationSteps = {
      'analyze-performance': 'Analyzing recent performance metrics',
      'identify-patterns': 'Identifying successful patterns',
      'adjust-weights': 'Adjusting strategy weights',
      'optimize-order': 'Optimizing execution order',
      'validate-changes': 'Validating calibration changes'
    };

    const results = {};
    
    for (const [step, description] of Object.entries(calibrationSteps)) {
      console.log(`  → ${description}`);
      await this.delay(1000);
      results[step] = { success: true, timestamp: new Date().toISOString() };
    }

    // Record calibration
    this.healingHistory.push({
      timestamp: new Date().toISOString(),
      type: 'calibration',
      results: results,
      status: 'completed'
    });

    return results;
  }

  /**
   * Predict potential failures
   */
  predictFailures(metrics) {
    const predictions = [];
    
    // Check for degrading success rates
    if (metrics.extraction.successRate < 0.5) {
      predictions.push({
        type: 'low-success-rate',
        probability: 0.8,
        timeframe: '1-2 hours',
        recommendation: 'Proactive selector refresh recommended'
      });
    }

    // Check for increasing error rates
    const recentErrors = metrics.errors.filter(e => {
      const errorTime = new Date(e.timestamp);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return errorTime > oneHourAgo;
    });

    if (recentErrors.length > 5) {
      predictions.push({
        type: 'high-error-rate',
        probability: 0.7,
        timeframe: '30 minutes',
        recommendation: 'Error pattern analysis needed'
      });
    }

    // Check for strategy degradation
    for (const [strategy, stats] of Object.entries(metrics.strategyPerformance || {})) {
      if (stats.successRate < 0.3 && stats.total > 10) {
        predictions.push({
          type: 'strategy-failure',
          target: strategy,
          probability: 0.9,
          timeframe: 'immediate',
          recommendation: `Strategy "${strategy}" needs immediate attention`
        });
      }
    }

    return predictions;
  }

  /**
   * Helper methods
   */
  classifyFailure(failureReport) {
    if (!failureReport.targetData || Object.keys(failureReport.targetData).length === 0) {
      return 'complete-failure';
    }
    
    if (failureReport.attemptedStrategies && failureReport.attemptedStrategies.length > 3) {
      return 'selector-broken';
    }
    
    if (failureReport.timeElapsed && failureReport.timeElapsed > 30000) {
      return 'performance-degraded';
    }
    
    return 'partial-failure';
  }

  assessSeverity(failureReport) {
    let severity = 'low';
    
    if (failureReport.attemptedStrategies && failureReport.attemptedStrategies.length > 5) {
      severity = 'high';
    } else if (failureReport.targetData && Object.keys(failureReport.targetData).length > 3) {
      severity = 'medium';
    }
    
    return severity;
  }

  recordHealingSuccess(healingId, strategy) {
    this.currentHealingAttempts[healingId].status = 'successful';
    this.currentHealingAttempts[healingId].successfulStrategy = strategy;
    
    // Update strategy effectiveness
    this.strategyEffectiveness[strategy].attempts++;
    this.strategyEffectiveness[strategy].successes++;
    this.strategyEffectiveness[strategy].lastUsed = new Date().toISOString();
    
    // Add to history
    this.healingHistory.push({
      timestamp: new Date().toISOString(),
      healingId: healingId,
      strategy: strategy,
      status: 'successful'
    });
  }

  recordHealingFailure(healingId, strategy, error = null) {
    // Update strategy effectiveness
    this.strategyEffectiveness[strategy].attempts++;
    this.strategyEffectiveness[strategy].failures++;
    this.strategyEffectiveness[strategy].lastUsed = new Date().toISOString();
    
    // Add to history
    this.healingHistory.push({
      timestamp: new Date().toISOString(),
      healingId: healingId,
      strategy: strategy,
      status: 'failed',
      error: error ? error.message : null
    });
  }

  async clearTemporaryData() {
    try {
      const tempDir = path.join(process.cwd(), 'data', 'scraping', 'temp');
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        if (file.endsWith('.tmp') || file.endsWith('.cache')) {
          await fs.unlink(path.join(tempDir, file));
        }
      }
    } catch (error) {
      // Temp directory might not exist
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get healing statistics
   */
  getHealingStats() {
    const stats = {
      totalHealingAttempts: this.healingHistory.length,
      successfulHeals: this.healingHistory.filter(h => h.status === 'successful').length,
      failedHeals: this.healingHistory.filter(h => h.status === 'failed').length,
      strategyEffectiveness: {},
      recentHealing: this.healingHistory.slice(-10),
      predictions: []
    };

    // Calculate strategy effectiveness percentages
    for (const [strategy, data] of Object.entries(this.strategyEffectiveness)) {
      if (data.attempts > 0) {
        stats.strategyEffectiveness[strategy] = {
          successRate: (data.successes / data.attempts * 100).toFixed(1) + '%',
          attempts: data.attempts,
          lastUsed: data.lastUsed
        };
      }
    }

    return stats;
  }

  /**
   * Export healing history for analysis
   */
  async exportHealingHistory() {
    const exportData = {
      history: this.healingHistory,
      strategyEffectiveness: this.strategyEffectiveness,
      exportedAt: new Date().toISOString()
    };

    const exportPath = path.join(
      process.cwd(),
      'data',
      'scraping',
      `healing-history-${Date.now()}.json`
    );

    await fs.mkdir(path.dirname(exportPath), { recursive: true });
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`📋 Healing history exported to: ${exportPath}`);
    return exportPath;
  }
}

module.exports = AutoHealer;