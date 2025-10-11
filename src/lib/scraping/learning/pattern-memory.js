// Pattern success tracking and optimization system
const fs = require('fs').promises;
const path = require('path');

class PatternMemory {
  constructor(memoryFile = 'pattern-memory.json') {
    this.memoryFile = path.join(process.cwd(), 'data', 'scraping', memoryFile);
    this.memory = {
      patterns: {},           // Successful patterns by data type
      failures: {},          // Failed patterns to avoid
      statistics: {},        // Success rate statistics
      lastUpdated: new Date().toISOString()
    };
    this.loadMemory();
  }

  /**
   * Load pattern memory from file
   */
  async loadMemory() {
    try {
      const data = await fs.readFile(this.memoryFile, 'utf8');
      this.memory = JSON.parse(data);
      console.log(`Loaded ${Object.keys(this.memory.patterns).length} pattern types from memory`);
    } catch (error) {
      console.log('No existing pattern memory found, starting fresh');
      await this.ensureDirectoryExists();
    }
  }

  /**
   * Save pattern memory to file
   */
  async saveMemory() {
    try {
      await this.ensureDirectoryExists();
      await fs.writeFile(this.memoryFile, JSON.stringify(this.memory, null, 2));
    } catch (error) {
      console.error('Failed to save pattern memory:', error);
    }
  }

  /**
   * Record a successful pattern
   */
  async recordSuccessfulPattern(selector, dataType, successRate, context = {}) {
    const patternKey = this.generatePatternKey(selector, dataType);
    
    if (!this.memory.patterns[dataType]) {
      this.memory.patterns[dataType] = {};
    }

    // Update or create pattern record
    if (!this.memory.patterns[dataType][patternKey]) {
      this.memory.patterns[dataType][patternKey] = {
        selector: selector,
        firstSeen: new Date().toISOString(),
        lastSuccess: new Date().toISOString(),
        successCount: 0,
        totalAttempts: 0,
        averageSuccessRate: 0,
        contexts: [],
        confidence: 50,
        method: context.method || 'unknown'
      };
    }

    const pattern = this.memory.patterns[dataType][patternKey];
    pattern.successCount++;
    pattern.totalAttempts++;
    pattern.lastSuccess = new Date().toISOString();
    pattern.averageSuccessRate = this.calculateRunningAverage(
      pattern.averageSuccessRate,
      successRate,
      pattern.successCount
    );

    // Update confidence based on success rate and frequency
    pattern.confidence = this.calculateConfidence(pattern);

    // Store context information
    if (context && Object.keys(context).length > 0) {
      pattern.contexts.push({
        timestamp: new Date().toISOString(),
        ...context
      });
      // Keep only last 10 contexts
      if (pattern.contexts.length > 10) {
        pattern.contexts = pattern.contexts.slice(-10);
      }
    }

    // Update statistics
    this.updateStatistics(dataType, true);

    // Save to disk periodically
    if (Math.random() < 0.1) { // 10% chance to save
      await this.saveMemory();
    }

    return pattern;
  }

  /**
   * Record a failed pattern attempt
   */
  async recordFailedPattern(selector, dataType, reason = '', context = {}) {
    const patternKey = this.generatePatternKey(selector, dataType);
    
    if (!this.memory.failures[dataType]) {
      this.memory.failures[dataType] = {};
    }

    if (!this.memory.failures[dataType][patternKey]) {
      this.memory.failures[dataType][patternKey] = {
        selector: selector,
        firstFailed: new Date().toISOString(),
        lastFailed: new Date().toISOString(),
        failureCount: 0,
        reasons: [],
        contexts: []
      };
    }

    const failure = this.memory.failures[dataType][patternKey];
    failure.failureCount++;
    failure.lastFailed = new Date().toISOString();
    
    if (reason) {
      failure.reasons.push({
        timestamp: new Date().toISOString(),
        reason: reason
      });
      // Keep only last 5 reasons
      if (failure.reasons.length > 5) {
        failure.reasons = failure.reasons.slice(-5);
      }
    }

    if (context && Object.keys(context).length > 0) {
      failure.contexts.push({
        timestamp: new Date().toISOString(),
        ...context
      });
      if (failure.contexts.length > 5) {
        failure.contexts = failure.contexts.slice(-5);
      }
    }

    // Update pattern confidence if it exists
    if (this.memory.patterns[dataType]?.[patternKey]) {
      const pattern = this.memory.patterns[dataType][patternKey];
      pattern.totalAttempts++;
      pattern.averageSuccessRate = pattern.successCount / pattern.totalAttempts;
      pattern.confidence = this.calculateConfidence(pattern);
    }

    // Update statistics
    this.updateStatistics(dataType, false);

    // Save periodically
    if (Math.random() < 0.1) {
      await this.saveMemory();
    }
  }

  /**
   * Suggest next attempt based on historical success
   */
  suggestNextAttempt(dataType, excludeSelectors = []) {
    if (!this.memory.patterns[dataType]) {
      return null;
    }

    // Get all patterns for this data type
    const patterns = Object.values(this.memory.patterns[dataType])
      .filter(p => !excludeSelectors.includes(p.selector))
      .filter(p => p.confidence > 30); // Minimum confidence threshold

    if (patterns.length === 0) {
      return null;
    }

    // Sort by confidence and recency
    patterns.sort((a, b) => {
      // Primary sort by confidence
      const confDiff = b.confidence - a.confidence;
      if (Math.abs(confDiff) > 10) return confDiff;
      
      // Secondary sort by recency
      return new Date(b.lastSuccess) - new Date(a.lastSuccess);
    });

    // Return top suggestions
    const suggestions = patterns.slice(0, 5).map(p => ({
      selector: p.selector,
      confidence: p.confidence,
      successRate: p.averageSuccessRate,
      lastSuccess: p.lastSuccess,
      method: p.method,
      attempts: p.totalAttempts
    }));

    return {
      primary: suggestions[0],
      alternatives: suggestions.slice(1)
    };
  }

  /**
   * Get patterns by confidence level
   */
  getPatternsByConfidence(dataType, minConfidence = 70) {
    if (!this.memory.patterns[dataType]) {
      return [];
    }

    return Object.values(this.memory.patterns[dataType])
      .filter(p => p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Adapt to failures by analyzing patterns
   */
  async adaptToFailures(failedPattern, context) {
    const insights = {
      likelyReasons: [],
      suggestedAlternatives: [],
      adaptationStrategy: null
    };

    // Analyze failure patterns
    const allFailures = Object.values(this.memory.failures).flatMap(f => Object.values(f));
    const recentFailures = allFailures.filter(f => {
      const hoursSinceFailure = (Date.now() - new Date(f.lastFailed)) / (1000 * 60 * 60);
      return hoursSinceFailure < 24; // Last 24 hours
    });

    // Check if this is part of a broader pattern
    if (recentFailures.length > 10) {
      insights.likelyReasons.push('Possible website structure change detected');
      insights.adaptationStrategy = 'full-rescan';
    }

    // Analyze specific failure
    const failureKey = this.generatePatternKey(failedPattern, context.dataType);
    const failureRecord = this.memory.failures[context.dataType]?.[failureKey];
    
    if (failureRecord && failureRecord.failureCount > 3) {
      insights.likelyReasons.push('Pattern consistently failing');
      
      // Look for similar successful patterns
      const similar = this.findSimilarPatterns(failedPattern, context.dataType);
      insights.suggestedAlternatives = similar;
    }

    // Check timing patterns
    if (this.isTimeBasedFailure(failureRecord)) {
      insights.likelyReasons.push('Time-based content changes detected');
      insights.adaptationStrategy = 'time-aware-scraping';
    }

    return insights;
  }

  /**
   * Get learning insights and recommendations
   */
  getLearningInsights() {
    const insights = {
      summary: {
        totalPatterns: 0,
        totalFailures: 0,
        overallSuccessRate: 0,
        lastUpdated: this.memory.lastUpdated
      },
      byDataType: {},
      recommendations: []
    };

    // Calculate summary statistics
    for (const dataType in this.memory.patterns) {
      const patterns = Object.values(this.memory.patterns[dataType]);
      insights.summary.totalPatterns += patterns.length;
      
      insights.byDataType[dataType] = {
        patternCount: patterns.length,
        averageConfidence: this.average(patterns.map(p => p.confidence)),
        averageSuccessRate: this.average(patterns.map(p => p.averageSuccessRate)),
        topPattern: patterns.sort((a, b) => b.confidence - a.confidence)[0]
      };
    }

    for (const dataType in this.memory.failures) {
      insights.summary.totalFailures += Object.keys(this.memory.failures[dataType]).length;
    }

    // Generate recommendations
    if (insights.summary.totalFailures > insights.summary.totalPatterns * 0.5) {
      insights.recommendations.push({
        type: 'high-failure-rate',
        message: 'High failure rate detected. Consider refreshing detection strategies.',
        severity: 'high'
      });
    }

    for (const [dataType, stats] of Object.entries(insights.byDataType)) {
      if (stats.averageConfidence < 50) {
        insights.recommendations.push({
          type: 'low-confidence',
          dataType: dataType,
          message: `Low confidence patterns for ${dataType}. Need more training data.`,
          severity: 'medium'
        });
      }
    }

    return insights;
  }

  /**
   * Helper methods
   */
  generatePatternKey(selector, dataType) {
    return `${dataType}:${selector}`.replace(/\s+/g, '_');
  }

  calculateRunningAverage(currentAvg, newValue, count) {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  calculateConfidence(pattern) {
    let confidence = 50; // Base confidence

    // Success rate factor (0-40 points)
    confidence += pattern.averageSuccessRate * 40;

    // Frequency factor (0-20 points)
    const frequencyScore = Math.min(pattern.successCount / 10, 1) * 20;
    confidence += frequencyScore;

    // Recency factor (0-20 points)
    const hoursSinceSuccess = (Date.now() - new Date(pattern.lastSuccess)) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 20 - (hoursSinceSuccess / 24) * 2);
    confidence += recencyScore;

    // Consistency factor (0-20 points)
    if (pattern.totalAttempts > 0) {
      const consistencyScore = (pattern.successCount / pattern.totalAttempts) * 20;
      confidence += consistencyScore;
    }

    return Math.min(Math.round(confidence), 100);
  }

  updateStatistics(dataType, success) {
    if (!this.memory.statistics[dataType]) {
      this.memory.statistics[dataType] = {
        totalAttempts: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        lastAttempt: null,
        lastSuccess: null,
        lastFailure: null
      };
    }

    const stats = this.memory.statistics[dataType];
    stats.totalAttempts++;
    stats.lastAttempt = new Date().toISOString();

    if (success) {
      stats.totalSuccesses++;
      stats.lastSuccess = new Date().toISOString();
    } else {
      stats.totalFailures++;
      stats.lastFailure = new Date().toISOString();
    }

    this.memory.lastUpdated = new Date().toISOString();
  }

  findSimilarPatterns(selector, dataType) {
    if (!this.memory.patterns[dataType]) {
      return [];
    }

    const similar = [];
    const selectorParts = selector.toLowerCase().split(/[.\s>#]+/);

    for (const pattern of Object.values(this.memory.patterns[dataType])) {
      if (pattern.selector === selector) continue;
      
      const patternParts = pattern.selector.toLowerCase().split(/[.\s>#]+/);
      const commonParts = selectorParts.filter(part => patternParts.includes(part));
      
      if (commonParts.length >= selectorParts.length * 0.5) {
        similar.push({
          selector: pattern.selector,
          confidence: pattern.confidence,
          similarity: commonParts.length / selectorParts.length
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  isTimeBasedFailure(failureRecord) {
    if (!failureRecord || failureRecord.contexts.length < 3) {
      return false;
    }

    // Check if failures occur at specific times
    const hours = failureRecord.contexts.map(c => 
      new Date(c.timestamp).getHours()
    );
    
    // If all failures happen in similar hour ranges, it might be time-based
    const hourRange = Math.max(...hours) - Math.min(...hours);
    return hourRange <= 3;
  }

  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  async ensureDirectoryExists() {
    const dir = path.dirname(this.memoryFile);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Clean up old or low-confidence patterns
   */
  async cleanup(daysToKeep = 30, minConfidence = 20) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let removed = 0;

    for (const dataType in this.memory.patterns) {
      const patterns = this.memory.patterns[dataType];
      for (const key in patterns) {
        const pattern = patterns[key];
        const lastSuccess = new Date(pattern.lastSuccess);
        
        if (lastSuccess < cutoffDate || pattern.confidence < minConfidence) {
          delete patterns[key];
          removed++;
        }
      }
    }

    if (removed > 0) {
      console.log(`Cleaned up ${removed} old or low-confidence patterns`);
      await this.saveMemory();
    }
  }
}

module.exports = PatternMemory;