// adaptive-learning-system.js
// Real-time adaptation algorithms that learn from successful interactions

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AdaptiveLearningSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      learningRate: 0.1,
      memorySize: 10000,
      adaptationThreshold: 0.8,
      persistenceEnabled: true,
      persistencePath: './learning-data',
      modelUpdateInterval: 60000, // 1 minute
      confidenceDecay: 0.99,
      explorationRate: 0.1,
      ...config
    };

    // Learning models for different aspects
    this.models = {
      timing: new TimingAdaptationModel(),
      behavior: new BehaviorAdaptationModel(),
      extraction: new ExtractionAdaptationModel(),
      detection: new DetectionAvoidanceModel(),
      performance: new PerformanceOptimizationModel()
    };

    // Interaction memory
    this.interactionMemory = {
      successful: new LimitedQueue(this.config.memorySize),
      failed: new LimitedQueue(Math.floor(this.config.memorySize / 2)),
      patterns: new Map(),
      strategies: new Map()
    };

    // Real-time metrics
    this.metrics = {
      totalInteractions: 0,
      successfulAdaptations: 0,
      detectionEvents: 0,
      averageConfidence: 0,
      learningProgress: 0
    };

    // Active adaptation state
    this.adaptationState = {
      currentStrategy: null,
      confidenceLevel: 1.0,
      riskLevel: 0,
      adaptationsApplied: [],
      lastAdaptation: null
    };

    // Pattern recognition engine
    this.patternEngine = {
      sequences: new Map(),
      frequencies: new Map(),
      correlations: new Map()
    };

    // Initialize learning system
    this.initialize();
  }

  async initialize() {
    console.log('🧠 Initializing Adaptive Learning System...');
    
    // Load persisted learning data
    if (this.config.persistenceEnabled) {
      await this.loadPersistedData();
    }
    
    // Start model update cycle
    this.startModelUpdateCycle();
    
    // Initialize pattern recognition
    this.initializePatternRecognition();
    
    console.log('✅ Adaptive Learning System initialized');
  }

  // Real-time interaction learning
  async learnFromInteraction(interaction) {
    this.metrics.totalInteractions++;
    
    const analysis = {
      timestamp: Date.now(),
      context: this.extractContext(interaction),
      outcome: interaction.success ? 'success' : 'failure',
      metrics: this.extractMetrics(interaction),
      patterns: this.detectPatterns(interaction)
    };
    
    // Store in appropriate memory
    if (interaction.success) {
      this.interactionMemory.successful.enqueue(analysis);
      await this.updateSuccessfulPatterns(analysis);
    } else {
      this.interactionMemory.failed.enqueue(analysis);
      await this.analyzeFailure(analysis);
    }
    
    // Update models
    await this.updateModels(analysis);
    
    // Check if adaptation needed
    const adaptationNeeded = await this.checkAdaptationNeed(analysis);
    if (adaptationNeeded) {
      return await this.generateAdaptation(analysis);
    }
    
    return null;
  }

  extractContext(interaction) {
    return {
      url: interaction.url,
      domain: new URL(interaction.url).hostname,
      pageType: interaction.pageType,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      sessionDuration: interaction.sessionDuration,
      previousActions: interaction.previousActions || [],
      browserFingerprint: interaction.fingerprint,
      proxyLocation: interaction.proxy?.country,
      behaviorProfile: interaction.behaviorProfile
    };
  }

  extractMetrics(interaction) {
    return {
      responseTime: interaction.responseTime,
      dataQuality: interaction.dataQuality || 0,
      resourcesLoaded: interaction.resourcesLoaded,
      errorsEncountered: interaction.errors || [],
      detectionsTriggered: interaction.detections || [],
      bandwidthUsed: interaction.bandwidth,
      cpuUsage: interaction.cpuUsage,
      memoryUsage: interaction.memoryUsage
    };
  }

  detectPatterns(interaction) {
    const patterns = [];
    
    // Temporal patterns
    const timePattern = this.detectTemporalPattern(interaction);
    if (timePattern) patterns.push(timePattern);
    
    // Behavioral patterns
    const behaviorPattern = this.detectBehavioralPattern(interaction);
    if (behaviorPattern) patterns.push(behaviorPattern);
    
    // Navigation patterns
    const navPattern = this.detectNavigationPattern(interaction);
    if (navPattern) patterns.push(navPattern);
    
    // Error patterns
    const errorPattern = this.detectErrorPattern(interaction);
    if (errorPattern) patterns.push(errorPattern);
    
    return patterns;
  }

  detectTemporalPattern(interaction) {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const key = `${dayOfWeek}_${hour}`;
    
    if (!this.patternEngine.frequencies.has(key)) {
      this.patternEngine.frequencies.set(key, {
        successes: 0,
        failures: 0,
        avgResponseTime: 0
      });
    }
    
    const freq = this.patternEngine.frequencies.get(key);
    
    if (interaction.success) {
      freq.successes++;
    } else {
      freq.failures++;
    }
    
    // Update average response time
    const count = freq.successes + freq.failures;
    freq.avgResponseTime = 
      (freq.avgResponseTime * (count - 1) + interaction.responseTime) / count;
    
    // Detect pattern
    if (count > 10) {
      const successRate = freq.successes / count;
      if (successRate < 0.5) {
        return {
          type: 'temporal_difficulty',
          confidence: 1 - successRate,
          recommendation: 'avoid_timeframe',
          details: { dayOfWeek, hour, successRate }
        };
      } else if (successRate > 0.9) {
        return {
          type: 'temporal_opportunity',
          confidence: successRate,
          recommendation: 'prefer_timeframe',
          details: { dayOfWeek, hour, successRate }
        };
      }
    }
    
    return null;
  }

  detectBehavioralPattern(interaction) {
    const sequence = interaction.previousActions?.slice(-5).join('->');
    if (!sequence) return null;
    
    if (!this.patternEngine.sequences.has(sequence)) {
      this.patternEngine.sequences.set(sequence, {
        occurrences: 0,
        successes: 0,
        avgDuration: 0
      });
    }
    
    const seq = this.patternEngine.sequences.get(sequence);
    seq.occurrences++;
    
    if (interaction.success) {
      seq.successes++;
    }
    
    // Update average duration
    seq.avgDuration = 
      (seq.avgDuration * (seq.occurrences - 1) + interaction.duration) / seq.occurrences;
    
    // Detect pattern
    if (seq.occurrences > 5) {
      const successRate = seq.successes / seq.occurrences;
      
      if (successRate < 0.3) {
        return {
          type: 'problematic_sequence',
          confidence: 1 - successRate,
          recommendation: 'avoid_sequence',
          details: { sequence, successRate, occurrences: seq.occurrences }
        };
      } else if (successRate > 0.8 && seq.avgDuration < 5000) {
        return {
          type: 'efficient_sequence',
          confidence: successRate,
          recommendation: 'prefer_sequence',
          details: { sequence, successRate, avgDuration: seq.avgDuration }
        };
      }
    }
    
    return null;
  }

  detectNavigationPattern(interaction) {
    const navPath = interaction.navigationPath;
    if (!navPath || navPath.length < 2) return null;
    
    // Analyze navigation efficiency
    const directPath = navPath[0] + '->' + navPath[navPath.length - 1];
    const actualPath = navPath.join('->');
    
    const efficiency = directPath.length / actualPath.length;
    
    if (efficiency < 0.5 && navPath.length > 3) {
      return {
        type: 'inefficient_navigation',
        confidence: 1 - efficiency,
        recommendation: 'optimize_path',
        details: {
          currentPath: navPath,
          suggestedPath: [navPath[0], navPath[navPath.length - 1]],
          efficiency
        }
      };
    }
    
    return null;
  }

  detectErrorPattern(interaction) {
    if (!interaction.errors || interaction.errors.length === 0) return null;
    
    const errorTypes = interaction.errors.map(e => e.type || 'unknown');
    const errorKey = errorTypes.sort().join(',');
    
    if (!this.patternEngine.correlations.has(errorKey)) {
      this.patternEngine.correlations.set(errorKey, {
        occurrences: 0,
        contexts: [],
        resolutions: []
      });
    }
    
    const correlation = this.patternEngine.correlations.get(errorKey);
    correlation.occurrences++;
    correlation.contexts.push(interaction.context);
    
    // Look for successful resolution in memory
    const successfulResolution = this.findSuccessfulResolution(errorKey);
    
    if (successfulResolution) {
      return {
        type: 'known_error_pattern',
        confidence: 0.9,
        recommendation: 'apply_known_solution',
        details: {
          errors: errorTypes,
          solution: successfulResolution,
          occurrences: correlation.occurrences
        }
      };
    }
    
    return null;
  }

  async updateSuccessfulPatterns(analysis) {
    // Extract successful strategies
    const strategy = {
      context: analysis.context,
      actions: analysis.context.previousActions,
      timing: analysis.metrics.responseTime,
      outcome: 'success'
    };
    
    // Update strategy database
    const strategyKey = this.generateStrategyKey(strategy.context);
    
    if (!this.interactionMemory.strategies.has(strategyKey)) {
      this.interactionMemory.strategies.set(strategyKey, {
        successes: 0,
        failures: 0,
        avgMetrics: {},
        bestConfiguration: null
      });
    }
    
    const record = this.interactionMemory.strategies.get(strategyKey);
    record.successes++;
    
    // Update best configuration if this was particularly successful
    if (!record.bestConfiguration || 
        analysis.metrics.dataQuality > record.bestConfiguration.dataQuality) {
      record.bestConfiguration = {
        fingerprint: analysis.context.browserFingerprint,
        behaviorProfile: analysis.context.behaviorProfile,
        timing: analysis.metrics.responseTime,
        dataQuality: analysis.metrics.dataQuality
      };
    }
    
    // Learn timing patterns
    await this.models.timing.learn({
      context: analysis.context,
      optimalTiming: analysis.metrics.responseTime,
      success: true
    });
    
    // Learn behavioral patterns
    await this.models.behavior.learn({
      profile: analysis.context.behaviorProfile,
      actions: analysis.context.previousActions,
      success: true
    });
  }

  async analyzeFailure(analysis) {
    console.log(`📉 Analyzing failure: ${analysis.context.url}`);
    
    // Identify failure cause
    const cause = this.identifyFailureCause(analysis);
    
    // Update detection model
    if (cause.type === 'detection') {
      await this.models.detection.learn({
        context: analysis.context,
        detectionIndicators: cause.indicators,
        avoided: false
      });
    }
    
    // Find similar successful interactions
    const similar = this.findSimilarSuccessful(analysis.context);
    
    if (similar.length > 0) {
      // Extract differences
      const differences = this.extractDifferences(analysis, similar[0]);
      
      console.log('   Found successful similar interaction');
      console.log(`   Key differences: ${Object.keys(differences).join(', ')}`);
      
      // Learn from differences
      await this.learnFromDifferences(differences);
    }
  }

  identifyFailureCause(analysis) {
    // Check for detection indicators
    if (analysis.metrics.detectionsTriggered.length > 0) {
      return {
        type: 'detection',
        indicators: analysis.metrics.detectionsTriggered,
        confidence: 0.9
      };
    }
    
    // Check for error patterns
    if (analysis.metrics.errorsEncountered.length > 0) {
      const errorTypes = analysis.metrics.errorsEncountered.map(e => e.type);
      return {
        type: 'error',
        errorTypes,
        confidence: 0.8
      };
    }
    
    // Check for performance issues
    if (analysis.metrics.responseTime > 30000) {
      return {
        type: 'timeout',
        duration: analysis.metrics.responseTime,
        confidence: 0.7
      };
    }
    
    // Unknown cause
    return {
      type: 'unknown',
      confidence: 0.3
    };
  }

  findSimilarSuccessful(context) {
    const successful = Array.from(this.interactionMemory.successful.items);
    
    // Calculate similarity scores
    const scored = successful.map(item => ({
      item,
      similarity: this.calculateSimilarity(context, item.context)
    }));
    
    // Sort by similarity
    scored.sort((a, b) => b.similarity - a.similarity);
    
    // Return top matches with high similarity
    return scored
      .filter(s => s.similarity > 0.7)
      .map(s => s.item)
      .slice(0, 5);
  }

  calculateSimilarity(context1, context2) {
    let similarity = 0;
    let factors = 0;
    
    // Domain similarity
    if (context1.domain === context2.domain) {
      similarity += 0.3;
    }
    factors += 0.3;
    
    // Page type similarity
    if (context1.pageType === context2.pageType) {
      similarity += 0.2;
    }
    factors += 0.2;
    
    // Time similarity (within 2 hours)
    const timeDiff = Math.abs(context1.timeOfDay - context2.timeOfDay);
    if (timeDiff <= 2) {
      similarity += 0.1 * (1 - timeDiff / 2);
    }
    factors += 0.1;
    
    // Action sequence similarity
    const seq1 = context1.previousActions || [];
    const seq2 = context2.previousActions || [];
    const commonActions = seq1.filter(a => seq2.includes(a)).length;
    const maxActions = Math.max(seq1.length, seq2.length);
    
    if (maxActions > 0) {
      similarity += 0.2 * (commonActions / maxActions);
    }
    factors += 0.2;
    
    // Behavioral profile similarity
    if (context1.behaviorProfile === context2.behaviorProfile) {
      similarity += 0.2;
    }
    factors += 0.2;
    
    return similarity / factors;
  }

  extractDifferences(failed, successful) {
    const differences = {};
    
    // Compare contexts
    const failedCtx = failed.context;
    const successCtx = successful.context;
    
    // Timing differences
    if (Math.abs(failedCtx.timeOfDay - successCtx.timeOfDay) > 2) {
      differences.timing = {
        failed: failedCtx.timeOfDay,
        successful: successCtx.timeOfDay
      };
    }
    
    // Behavioral differences
    if (failedCtx.behaviorProfile !== successCtx.behaviorProfile) {
      differences.behavior = {
        failed: failedCtx.behaviorProfile,
        successful: successCtx.behaviorProfile
      };
    }
    
    // Proxy location differences
    if (failedCtx.proxyLocation !== successCtx.proxyLocation) {
      differences.proxy = {
        failed: failedCtx.proxyLocation,
        successful: successCtx.proxyLocation
      };
    }
    
    // Action sequence differences
    const failedActions = failedCtx.previousActions || [];
    const successActions = successCtx.previousActions || [];
    
    if (failedActions.join(',') !== successActions.join(',')) {
      differences.actions = {
        failed: failedActions,
        successful: successActions
      };
    }
    
    // Performance differences
    if (failed.metrics.responseTime > successful.metrics.responseTime * 1.5) {
      differences.performance = {
        failed: failed.metrics.responseTime,
        successful: successful.metrics.responseTime
      };
    }
    
    return differences;
  }

  async learnFromDifferences(differences) {
    // Update models based on identified differences
    
    if (differences.timing) {
      await this.models.timing.learn({
        avoidHour: differences.timing.failed,
        preferHour: differences.timing.successful,
        weight: 0.8
      });
    }
    
    if (differences.behavior) {
      await this.models.behavior.learn({
        avoidProfile: differences.behavior.failed,
        preferProfile: differences.behavior.successful,
        weight: 0.9
      });
    }
    
    if (differences.proxy) {
      // Update proxy preferences
      this.updateProxyPreferences(
        differences.proxy.failed,
        differences.proxy.successful
      );
    }
    
    if (differences.actions) {
      // Learn action sequences
      await this.learnActionSequence(
        differences.actions.failed,
        differences.actions.successful
      );
    }
  }

  async updateModels(analysis) {
    // Update all relevant models
    const updatePromises = [];
    
    // Timing model
    updatePromises.push(this.models.timing.update(analysis));
    
    // Behavior model
    updatePromises.push(this.models.behavior.update(analysis));
    
    // Extraction model
    if (analysis.metrics.dataQuality !== undefined) {
      updatePromises.push(this.models.extraction.update(analysis));
    }
    
    // Detection model
    if (analysis.metrics.detectionsTriggered.length > 0 || analysis.outcome === 'success') {
      updatePromises.push(this.models.detection.update(analysis));
    }
    
    // Performance model
    updatePromises.push(this.models.performance.update(analysis));
    
    await Promise.all(updatePromises);
    
    // Update confidence level
    this.updateConfidence(analysis);
  }

  updateConfidence(analysis) {
    const wasSuccessful = analysis.outcome === 'success';
    
    if (wasSuccessful) {
      // Increase confidence
      this.adaptationState.confidenceLevel = Math.min(
        1.0,
        this.adaptationState.confidenceLevel * 1.1
      );
    } else {
      // Decrease confidence
      this.adaptationState.confidenceLevel = Math.max(
        0.1,
        this.adaptationState.confidenceLevel * 0.9
      );
    }
    
    // Apply decay
    this.adaptationState.confidenceLevel *= this.config.confidenceDecay;
    
    // Update risk level
    this.adaptationState.riskLevel = 1 - this.adaptationState.confidenceLevel;
  }

  async checkAdaptationNeed(analysis) {
    // Check confidence threshold
    if (this.adaptationState.confidenceLevel < this.config.adaptationThreshold) {
      return true;
    }
    
    // Check for repeated failures
    const recentFailures = this.countRecentFailures();
    if (recentFailures > 3) {
      return true;
    }
    
    // Check for detection events
    if (analysis.metrics.detectionsTriggered.length > 0) {
      return true;
    }
    
    // Check for performance degradation
    const performanceDegraded = await this.models.performance.checkDegradation();
    if (performanceDegraded) {
      return true;
    }
    
    // Check for pattern changes
    const patternShift = this.detectPatternShift();
    if (patternShift) {
      return true;
    }
    
    return false;
  }

  countRecentFailures() {
    const recent = Array.from(this.interactionMemory.failed.items)
      .filter(item => Date.now() - item.timestamp < 300000); // Last 5 minutes
    
    return recent.length;
  }

  detectPatternShift() {
    // Compare recent patterns with historical patterns
    const recentPatterns = this.getRecentPatterns();
    const historicalPatterns = this.getHistoricalPatterns();
    
    // Calculate pattern divergence
    const divergence = this.calculatePatternDivergence(
      recentPatterns,
      historicalPatterns
    );
    
    return divergence > 0.3; // Significant shift threshold
  }

  async generateAdaptation(analysis) {
    console.log('\n🔄 Generating real-time adaptation...');
    
    const adaptation = {
      timestamp: Date.now(),
      trigger: analysis,
      recommendations: [],
      confidence: 0
    };
    
    // Get recommendations from each model
    const modelRecommendations = await Promise.all([
      this.models.timing.recommend(analysis),
      this.models.behavior.recommend(analysis),
      this.models.extraction.recommend(analysis),
      this.models.detection.recommend(analysis),
      this.models.performance.recommend(analysis)
    ]);
    
    // Combine and prioritize recommendations
    const combinedRecommendations = this.combineRecommendations(modelRecommendations);
    
    // Apply exploration vs exploitation
    const finalRecommendations = this.applyExplorationStrategy(combinedRecommendations);
    
    adaptation.recommendations = finalRecommendations;
    adaptation.confidence = this.calculateAdaptationConfidence(finalRecommendations);
    
    // Record adaptation
    this.adaptationState.adaptationsApplied.push({
      timestamp: Date.now(),
      type: finalRecommendations[0]?.type || 'unknown',
      trigger: analysis.patterns[0]?.type || 'manual'
    });
    
    this.adaptationState.lastAdaptation = Date.now();
    
    // Emit adaptation event
    this.emit('adaptation', adaptation);
    
    console.log(`   Generated ${finalRecommendations.length} recommendations`);
    console.log(`   Confidence: ${(adaptation.confidence * 100).toFixed(1)}%`);
    
    return adaptation;
  }

  combineRecommendations(modelRecommendations) {
    const combined = [];
    const seen = new Set();
    
    // Flatten and deduplicate
    modelRecommendations.forEach(recommendations => {
      recommendations.forEach(rec => {
        const key = `${rec.type}_${rec.action}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(rec);
        }
      });
    });
    
    // Sort by priority and confidence
    combined.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      return (b.confidence || 0) - (a.confidence || 0);
    });
    
    return combined;
  }

  applyExplorationStrategy(recommendations) {
    const explorationNeeded = Math.random() < this.config.explorationRate;
    
    if (explorationNeeded && recommendations.length > 1) {
      console.log('   🎲 Applying exploration strategy');
      
      // Shuffle recommendations to try something different
      const shuffled = [...recommendations];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Mark as exploration
      shuffled[0].exploration = true;
      
      return shuffled;
    }
    
    return recommendations;
  }

  calculateAdaptationConfidence(recommendations) {
    if (recommendations.length === 0) return 0;
    
    // Average confidence of top 3 recommendations
    const topConfidences = recommendations
      .slice(0, 3)
      .map(r => r.confidence || 0.5);
    
    const avgConfidence = topConfidences.reduce((a, b) => a + b, 0) / topConfidences.length;
    
    // Adjust based on current system confidence
    return avgConfidence * this.adaptationState.confidenceLevel;
  }

  startModelUpdateCycle() {
    setInterval(async () => {
      console.log('🔄 Updating adaptation models...');
      
      // Update each model
      for (const [name, model] of Object.entries(this.models)) {
        try {
          await model.periodicUpdate();
          console.log(`   ✓ ${name} model updated`);
        } catch (error) {
          console.error(`   ✗ ${name} model update failed:`, error.message);
        }
      }
      
      // Clean old memory
      this.cleanOldMemory();
      
      // Update learning progress
      this.updateLearningProgress();
      
      // Persist if enabled
      if (this.config.persistenceEnabled) {
        await this.persistLearningData();
      }
      
    }, this.config.modelUpdateInterval);
  }

  cleanOldMemory() {
    // Remove patterns older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    for (const [key, data] of this.interactionMemory.patterns) {
      if (data.lastSeen < cutoff) {
        this.interactionMemory.patterns.delete(key);
      }
    }
    
    // Clean correlation data
    for (const [key, data] of this.patternEngine.correlations) {
      if (data.contexts.length > 100) {
        data.contexts = data.contexts.slice(-50);
      }
    }
  }

  updateLearningProgress() {
    const totalStrategies = this.interactionMemory.strategies.size;
    const successfulStrategies = Array.from(this.interactionMemory.strategies.values())
      .filter(s => s.successes > s.failures).length;
    
    this.metrics.learningProgress = totalStrategies > 0 
      ? successfulStrategies / totalStrategies 
      : 0;
    
    console.log(`📊 Learning progress: ${(this.metrics.learningProgress * 100).toFixed(1)}%`);
  }

  async persistLearningData() {
    try {
      const data = {
        timestamp: Date.now(),
        models: {},
        patterns: Array.from(this.interactionMemory.patterns.entries()),
        strategies: Array.from(this.interactionMemory.strategies.entries()),
        metrics: this.metrics
      };
      
      // Serialize model states
      for (const [name, model] of Object.entries(this.models)) {
        data.models[name] = await model.serialize();
      }
      
      // Save to file
      const filename = `learning_${Date.now()}.json`;
      const filepath = path.join(this.config.persistencePath, filename);
      
      await fs.mkdir(this.config.persistencePath, { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      
      console.log(`💾 Learning data persisted to ${filename}`);
      
      // Clean old persistence files
      await this.cleanOldPersistenceFiles();
      
    } catch (error) {
      console.error('Failed to persist learning data:', error.message);
    }
  }

  async loadPersistedData() {
    try {
      const files = await fs.readdir(this.config.persistencePath);
      const learningFiles = files.filter(f => f.startsWith('learning_')).sort();
      
      if (learningFiles.length === 0) {
        console.log('No persisted learning data found');
        return;
      }
      
      // Load most recent file
      const latestFile = learningFiles[learningFiles.length - 1];
      const filepath = path.join(this.config.persistencePath, latestFile);
      const content = await fs.readFile(filepath, 'utf8');
      const data = JSON.parse(content);
      
      // Restore patterns and strategies
      this.interactionMemory.patterns = new Map(data.patterns);
      this.interactionMemory.strategies = new Map(data.strategies);
      
      // Restore model states
      for (const [name, modelData] of Object.entries(data.models)) {
        if (this.models[name]) {
          await this.models[name].deserialize(modelData);
        }
      }
      
      console.log(`📂 Loaded learning data from ${latestFile}`);
      
    } catch (error) {
      console.error('Failed to load persisted data:', error.message);
    }
  }

  async cleanOldPersistenceFiles() {
    try {
      const files = await fs.readdir(this.config.persistencePath);
      const learningFiles = files.filter(f => f.startsWith('learning_')).sort();
      
      // Keep only last 10 files
      if (learningFiles.length > 10) {
        const toDelete = learningFiles.slice(0, learningFiles.length - 10);
        
        for (const file of toDelete) {
          await fs.unlink(path.join(this.config.persistencePath, file));
        }
        
        console.log(`🗑️ Cleaned ${toDelete.length} old persistence files`);
      }
    } catch (error) {
      console.error('Failed to clean old files:', error.message);
    }
  }

  initializePatternRecognition() {
    // Set up pattern detection algorithms
    this.patternRecognizers = {
      sequential: new SequentialPatternRecognizer(),
      temporal: new TemporalPatternRecognizer(),
      behavioral: new BehavioralPatternRecognizer(),
      anomaly: new AnomalyDetector()
    };
  }

  generateStrategyKey(context) {
    const components = [
      context.domain,
      context.pageType || 'unknown',
      context.behaviorProfile || 'default'
    ];
    
    return crypto
      .createHash('md5')
      .update(components.join('_'))
      .digest('hex')
      .substring(0, 16);
  }

  updateProxyPreferences(avoidLocation, preferLocation) {
    // This would interface with the proxy rotation system
    console.log(`   Proxy preference: avoid ${avoidLocation}, prefer ${preferLocation}`);
  }

  async learnActionSequence(failedSequence, successfulSequence) {
    // Learn optimal action sequences
    const key = successfulSequence.join('->');
    
    if (!this.interactionMemory.patterns.has(key)) {
      this.interactionMemory.patterns.set(key, {
        type: 'action_sequence',
        sequence: successfulSequence,
        successes: 0,
        failures: 0,
        avgDuration: 0,
        lastSeen: Date.now()
      });
    }
    
    const pattern = this.interactionMemory.patterns.get(key);
    pattern.successes++;
    pattern.lastSeen = Date.now();
  }

  findSuccessfulResolution(errorKey) {
    // Look for previously successful resolutions to similar errors
    const resolutions = [];
    
    for (const [key, strategy] of this.interactionMemory.strategies) {
      if (strategy.successes > 0 && strategy.bestConfiguration) {
        // Check if this strategy resolved similar errors
        resolutions.push({
          strategy: key,
          configuration: strategy.bestConfiguration,
          successRate: strategy.successes / (strategy.successes + strategy.failures)
        });
      }
    }
    
    // Return best resolution
    resolutions.sort((a, b) => b.successRate - a.successRate);
    return resolutions[0] || null;
  }

  getRecentPatterns() {
    const cutoff = Date.now() - 3600000; // Last hour
    const recent = [];
    
    for (const [key, pattern] of this.interactionMemory.patterns) {
      if (pattern.lastSeen > cutoff) {
        recent.push(pattern);
      }
    }
    
    return recent;
  }

  getHistoricalPatterns() {
    const cutoff = Date.now() - 86400000; // Last 24 hours
    const historical = [];
    
    for (const [key, pattern] of this.interactionMemory.patterns) {
      if (pattern.lastSeen < cutoff) {
        historical.push(pattern);
      }
    }
    
    return historical;
  }

  calculatePatternDivergence(recent, historical) {
    if (historical.length === 0) return 0;
    
    // Calculate type distribution
    const recentTypes = this.getTypeDistribution(recent);
    const historicalTypes = this.getTypeDistribution(historical);
    
    // Calculate KL divergence
    let divergence = 0;
    
    for (const type in recentTypes) {
      if (historicalTypes[type] > 0) {
        divergence += recentTypes[type] * Math.log(recentTypes[type] / historicalTypes[type]);
      }
    }
    
    return Math.abs(divergence);
  }

  getTypeDistribution(patterns) {
    const distribution = {};
    const total = patterns.length;
    
    patterns.forEach(pattern => {
      const type = pattern.type || 'unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    // Normalize
    for (const type in distribution) {
      distribution[type] /= total;
    }
    
    return distribution;
  }

  getMetrics() {
    return {
      ...this.metrics,
      adaptationState: {
        confidence: this.adaptationState.confidenceLevel,
        risk: this.adaptationState.riskLevel,
        adaptationsApplied: this.adaptationState.adaptationsApplied.length,
        currentStrategy: this.adaptationState.currentStrategy
      },
      memory: {
        successfulInteractions: this.interactionMemory.successful.size,
        failedInteractions: this.interactionMemory.failed.size,
        knownPatterns: this.interactionMemory.patterns.size,
        learnedStrategies: this.interactionMemory.strategies.size
      },
      models: Object.entries(this.models).reduce((acc, [name, model]) => {
        acc[name] = model.getMetrics();
        return acc;
      }, {})
    };
  }
}

// Model implementations
class TimingAdaptationModel {
  constructor() {
    this.optimalTimings = new Map();
    this.avoidanceWindows = [];
  }
  
  async learn(data) {
    const key = `${data.context.domain}_${data.context.pageType}`;
    
    if (!this.optimalTimings.has(key)) {
      this.optimalTimings.set(key, {
        samples: [],
        optimal: null
      });
    }
    
    const timing = this.optimalTimings.get(key);
    
    if (data.success) {
      timing.samples.push(data.optimalTiming);
      
      // Update optimal timing (median of successful timings)
      if (timing.samples.length > 5) {
        const sorted = [...timing.samples].sort((a, b) => a - b);
        timing.optimal = sorted[Math.floor(sorted.length / 2)];
      }
    }
  }
  
  async update(analysis) {
    // Update timing preferences based on analysis
  }
  
  async recommend(analysis) {
    const key = `${analysis.context.domain}_${analysis.context.pageType}`;
    const timing = this.optimalTimings.get(key);
    
    const recommendations = [];
    
    if (timing && timing.optimal) {
      recommendations.push({
        type: 'timing',
        action: 'adjust_delays',
        value: timing.optimal,
        confidence: 0.8,
        priority: 5
      });
    }
    
    return recommendations;
  }
  
  async periodicUpdate() {
    // Clean old samples
    for (const [key, timing] of this.optimalTimings) {
      if (timing.samples.length > 100) {
        timing.samples = timing.samples.slice(-50);
      }
    }
  }
  
  async serialize() {
    return {
      optimalTimings: Array.from(this.optimalTimings.entries()),
      avoidanceWindows: this.avoidanceWindows
    };
  }
  
  async deserialize(data) {
    this.optimalTimings = new Map(data.optimalTimings);
    this.avoidanceWindows = data.avoidanceWindows;
  }
  
  getMetrics() {
    return {
      knownDomains: this.optimalTimings.size,
      avoidanceWindows: this.avoidanceWindows.length
    };
  }
}

class BehaviorAdaptationModel {
  constructor() {
    this.profilePerformance = new Map();
    this.optimalProfiles = new Map();
  }
  
  async learn(data) {
    const profile = data.profile || data.preferProfile;
    
    if (!this.profilePerformance.has(profile)) {
      this.profilePerformance.set(profile, {
        successes: 0,
        failures: 0,
        contexts: []
      });
    }
    
    const perf = this.profilePerformance.get(profile);
    
    if (data.success || data.preferProfile) {
      perf.successes++;
    } else {
      perf.failures++;
    }
    
    perf.contexts.push(data.context);
  }
  
  async update(analysis) {
    // Update profile preferences
  }
  
  async recommend(analysis) {
    const recommendations = [];
    
    // Find best performing profile for context
    let bestProfile = null;
    let bestScore = 0;
    
    for (const [profile, perf] of this.profilePerformance) {
      const score = perf.successes / (perf.successes + perf.failures + 1);
      if (score > bestScore) {
        bestScore = score;
        bestProfile = profile;
      }
    }
    
    if (bestProfile && bestScore > 0.7) {
      recommendations.push({
        type: 'behavior',
        action: 'switch_profile',
        value: bestProfile,
        confidence: bestScore,
        priority: 8
      });
    }
    
    return recommendations;
  }
  
  async periodicUpdate() {
    // Update optimal profiles
  }
  
  async serialize() {
    return {
      profilePerformance: Array.from(this.profilePerformance.entries()),
      optimalProfiles: Array.from(this.optimalProfiles.entries())
    };
  }
  
  async deserialize(data) {
    this.profilePerformance = new Map(data.profilePerformance);
    this.optimalProfiles = new Map(data.optimalProfiles);
  }
  
  getMetrics() {
    return {
      profilesAnalyzed: this.profilePerformance.size
    };
  }
}

class ExtractionAdaptationModel {
  constructor() {
    this.selectorPerformance = new Map();
    this.adaptiveSelectors = new Map();
  }
  
  async learn(data) {
    // Learn from extraction performance
  }
  
  async update(analysis) {
    if (analysis.metrics.dataQuality !== undefined) {
      const key = analysis.context.domain;
      
      if (!this.selectorPerformance.has(key)) {
        this.selectorPerformance.set(key, {
          attempts: 0,
          totalQuality: 0,
          selectors: []
        });
      }
      
      const perf = this.selectorPerformance.get(key);
      perf.attempts++;
      perf.totalQuality += analysis.metrics.dataQuality;
    }
  }
  
  async recommend(analysis) {
    const recommendations = [];
    
    const domain = analysis.context.domain;
    const adaptiveSelector = this.adaptiveSelectors.get(domain);
    
    if (adaptiveSelector) {
      recommendations.push({
        type: 'extraction',
        action: 'use_adaptive_selector',
        value: adaptiveSelector,
        confidence: 0.7,
        priority: 6
      });
    }
    
    return recommendations;
  }
  
  async periodicUpdate() {
    // Update adaptive selectors
  }
  
  async serialize() {
    return {
      selectorPerformance: Array.from(this.selectorPerformance.entries()),
      adaptiveSelectors: Array.from(this.adaptiveSelectors.entries())
    };
  }
  
  async deserialize(data) {
    this.selectorPerformance = new Map(data.selectorPerformance);
    this.adaptiveSelectors = new Map(data.adaptiveSelectors);
  }
  
  getMetrics() {
    return {
      domainsOptimized: this.adaptiveSelectors.size
    };
  }
}

class DetectionAvoidanceModel {
  constructor() {
    this.detectionIndicators = new Map();
    this.avoidanceStrategies = new Map();
  }
  
  async learn(data) {
    if (data.detectionIndicators) {
      data.detectionIndicators.forEach(indicator => {
        if (!this.detectionIndicators.has(indicator)) {
          this.detectionIndicators.set(indicator, {
            occurrences: 0,
            contexts: []
          });
        }
        
        const ind = this.detectionIndicators.get(indicator);
        ind.occurrences++;
        ind.contexts.push(data.context);
      });
    }
  }
  
  async update(analysis) {
    // Update detection patterns
  }
  
  async recommend(analysis) {
    const recommendations = [];
    
    // Check for known detection risks
    const riskIndicators = this.assessDetectionRisk(analysis.context);
    
    if (riskIndicators.length > 0) {
      recommendations.push({
        type: 'detection',
        action: 'increase_stealth',
        value: {
          slowDown: true,
          enhanceBehavior: true,
          rotateIdentity: riskIndicators.length > 2
        },
        confidence: 0.9,
        priority: 10
      });
    }
    
    return recommendations;
  }
  
  assessDetectionRisk(context) {
    const risks = [];
    
    for (const [indicator, data] of this.detectionIndicators) {
      // Check if context matches known risk contexts
      const matchingContexts = data.contexts.filter(ctx => 
        ctx.domain === context.domain && 
        ctx.pageType === context.pageType
      );
      
      if (matchingContexts.length > 0) {
        risks.push(indicator);
      }
    }
    
    return risks;
  }
  
  async periodicUpdate() {
    // Update avoidance strategies
  }
  
  async serialize() {
    return {
      detectionIndicators: Array.from(this.detectionIndicators.entries()),
      avoidanceStrategies: Array.from(this.avoidanceStrategies.entries())
    };
  }
  
  async deserialize(data) {
    this.detectionIndicators = new Map(data.detectionIndicators);
    this.avoidanceStrategies = new Map(data.avoidanceStrategies);
  }
  
  getMetrics() {
    return {
      knownIndicators: this.detectionIndicators.size,
      avoidanceStrategies: this.avoidanceStrategies.size
    };
  }
}

class PerformanceOptimizationModel {
  constructor() {
    this.performanceBaselines = new Map();
    this.optimizationStrategies = [];
  }
  
  async learn(data) {
    // Learn from performance metrics
  }
  
  async update(analysis) {
    const key = analysis.context.domain;
    
    if (!this.performanceBaselines.has(key)) {
      this.performanceBaselines.set(key, {
        avgResponseTime: 0,
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        samples: 0
      });
    }
    
    const baseline = this.performanceBaselines.get(key);
    const n = baseline.samples;
    
    baseline.avgResponseTime = (baseline.avgResponseTime * n + analysis.metrics.responseTime) / (n + 1);
    baseline.avgCpuUsage = (baseline.avgCpuUsage * n + (analysis.metrics.cpuUsage || 0)) / (n + 1);
    baseline.avgMemoryUsage = (baseline.avgMemoryUsage * n + (analysis.metrics.memoryUsage || 0)) / (n + 1);
    baseline.samples++;
  }
  
  async checkDegradation() {
    // Check if performance is degrading
    // This would compare recent performance with baselines
    return false;
  }
  
  async recommend(analysis) {
    const recommendations = [];
    
    const key = analysis.context.domain;
    const baseline = this.performanceBaselines.get(key);
    
    if (baseline && analysis.metrics.responseTime > baseline.avgResponseTime * 1.5) {
      recommendations.push({
        type: 'performance',
        action: 'optimize_resources',
        value: {
          reduceParallelism: true,
          increaseTimeouts: true,
          simplifyExtraction: true
        },
        confidence: 0.7,
        priority: 4
      });
    }
    
    return recommendations;
  }
  
  async periodicUpdate() {
    // Update optimization strategies
  }
  
  async serialize() {
    return {
      performanceBaselines: Array.from(this.performanceBaselines.entries()),
      optimizationStrategies: this.optimizationStrategies
    };
  }
  
  async deserialize(data) {
    this.performanceBaselines = new Map(data.performanceBaselines);
    this.optimizationStrategies = data.optimizationStrategies;
  }
  
  getMetrics() {
    return {
      baselinedDomains: this.performanceBaselines.size
    };
  }
}

// Helper classes
class LimitedQueue {
  constructor(limit) {
    this.limit = limit;
    this.items = [];
  }
  
  enqueue(item) {
    this.items.push(item);
    
    if (this.items.length > this.limit) {
      this.items.shift();
    }
  }
  
  get size() {
    return this.items.length;
  }
}

class SequentialPatternRecognizer {
  constructor() {
    this.sequences = new Map();
  }
  
  recognize(sequence) {
    // Implement sequential pattern recognition
    return null;
  }
}

class TemporalPatternRecognizer {
  constructor() {
    this.patterns = new Map();
  }
  
  recognize(timestamp, data) {
    // Implement temporal pattern recognition
    return null;
  }
}

class BehavioralPatternRecognizer {
  constructor() {
    this.behaviors = new Map();
  }
  
  recognize(actions) {
    // Implement behavioral pattern recognition
    return null;
  }
}

class AnomalyDetector {
  constructor() {
    this.baselines = new Map();
  }
  
  detect(data) {
    // Implement anomaly detection
    return null;
  }
}

module.exports = AdaptiveLearningSystem;