// scripts/high-performance-scraper/adaptive-optimizer.js
// Adaptive Performance Optimization Engine

const os = require('os');
const { performance } = require('perf_hooks');

class AdaptiveOptimizer {
  constructor() {
    this.performanceHistory = [];
    this.optimizationRules = new Map();
    this.currentStrategy = null;
    this.learningData = {
      strategies: new Map(),
      patterns: new Map()
    };
    
    this.initializeRules();
  }

  initializeRules() {
    // Performance-based rules
    this.optimizationRules.set('high_latency', {
      condition: (metrics) => metrics.avgResponseTime > 5000,
      actions: [
        { type: 'reduce_concurrency', factor: 0.7 },
        { type: 'increase_timeout', value: 10000 },
        { type: 'enable_caching', value: true }
      ]
    });
    
    this.optimizationRules.set('low_success_rate', {
      condition: (metrics) => metrics.successRate < 70,
      actions: [
        { type: 'switch_strategy', value: 'browser' },
        { type: 'increase_retries', value: 5 },
        { type: 'reduce_concurrency', factor: 0.5 }
      ]
    });
    
    this.optimizationRules.set('high_memory_usage', {
      condition: (metrics) => metrics.memoryUsage > 0.8,
      actions: [
        { type: 'reduce_workers', factor: 0.5 },
        { type: 'reduce_batch_size', factor: 0.5 },
        { type: 'enable_gc_optimization', value: true }
      ]
    });
    
    this.optimizationRules.set('rate_limiting_detected', {
      condition: (metrics) => metrics.rateLimitErrors > 5,
      actions: [
        { type: 'exponential_backoff', value: true },
        { type: 'rotate_user_agents', value: true },
        { type: 'enable_proxy_rotation', value: true }
      ]
    });
  }

  analyzePerformance(currentMetrics) {
    // Add to history
    this.performanceHistory.push({
      timestamp: Date.now(),
      metrics: currentMetrics
    });
    
    // Keep only recent history (last 100 data points)
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
    
    // Analyze trends
    const trends = this.analyzeTrends();
    const recommendations = this.generateRecommendations(currentMetrics, trends);
    
    return {
      trends,
      recommendations,
      optimizations: this.applyOptimizations(currentMetrics, recommendations)
    };
  }

  analyzeTrends() {
    if (this.performanceHistory.length < 10) {
      return { status: 'insufficient_data' };
    }
    
    const recent = this.performanceHistory.slice(-10);
    const older = this.performanceHistory.slice(-20, -10);
    
    const recentAvg = this.calculateAverages(recent);
    const olderAvg = this.calculateAverages(older);
    
    return {
      responseTime: {
        current: recentAvg.responseTime,
        trend: this.getTrend(olderAvg.responseTime, recentAvg.responseTime),
        change: ((recentAvg.responseTime - olderAvg.responseTime) / olderAvg.responseTime * 100).toFixed(1)
      },
      successRate: {
        current: recentAvg.successRate,
        trend: this.getTrend(olderAvg.successRate, recentAvg.successRate),
        change: ((recentAvg.successRate - olderAvg.successRate) / olderAvg.successRate * 100).toFixed(1)
      },
      throughput: {
        current: recentAvg.throughput,
        trend: this.getTrend(olderAvg.throughput, recentAvg.throughput),
        change: ((recentAvg.throughput - olderAvg.throughput) / olderAvg.throughput * 100).toFixed(1)
      }
    };
  }

  calculateAverages(dataPoints) {
    const sum = dataPoints.reduce((acc, point) => ({
      responseTime: acc.responseTime + point.metrics.avgResponseTime,
      successRate: acc.successRate + point.metrics.successRate,
      throughput: acc.throughput + point.metrics.throughput
    }), { responseTime: 0, successRate: 0, throughput: 0 });
    
    const count = dataPoints.length;
    
    return {
      responseTime: sum.responseTime / count,
      successRate: sum.successRate / count,
      throughput: sum.throughput / count
    };
  }

  getTrend(oldValue, newValue) {
    const threshold = 0.05; // 5% change threshold
    const change = (newValue - oldValue) / oldValue;
    
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'improving' : 'degrading';
  }

  generateRecommendations(metrics, trends) {
    const recommendations = [];
    
    // Check optimization rules
    for (const [ruleName, rule] of this.optimizationRules) {
      if (rule.condition(metrics)) {
        recommendations.push({
          type: ruleName,
          priority: 'high',
          actions: rule.actions,
          reason: `Triggered by ${ruleName} condition`
        });
      }
    }
    
    // Trend-based recommendations
    if (trends.responseTime && trends.responseTime.trend === 'degrading') {
      recommendations.push({
        type: 'performance_degradation',
        priority: 'medium',
        actions: [
          { type: 'analyze_bottlenecks', value: true },
          { type: 'increase_caching', value: true }
        ],
        reason: `Response time degraded by ${Math.abs(trends.responseTime.change)}%`
      });
    }
    
    if (trends.successRate && trends.successRate.current < 90) {
      recommendations.push({
        type: 'improve_reliability',
        priority: 'high',
        actions: [
          { type: 'enhance_error_handling', value: true },
          { type: 'implement_fallback_strategies', value: true }
        ],
        reason: `Success rate at ${trends.successRate.current.toFixed(1)}%`
      });
    }
    
    // Machine learning-based recommendations
    const mlRecommendations = this.generateMLRecommendations(metrics);
    recommendations.push(...mlRecommendations);
    
    return recommendations;
  }

  generateMLRecommendations(metrics) {
    const recommendations = [];
    
    // Pattern recognition
    const pattern = this.identifyPattern(metrics);
    
    if (pattern) {
      const bestStrategy = this.findBestStrategyForPattern(pattern);
      
      if (bestStrategy) {
        recommendations.push({
          type: 'ml_optimization',
          priority: 'high',
          actions: [
            { type: 'apply_strategy', value: bestStrategy }
          ],
          reason: `ML detected pattern: ${pattern.name}, best strategy: ${bestStrategy.name}`
        });
      }
    }
    
    return recommendations;
  }

  identifyPattern(metrics) {
    // Simple pattern recognition
    const patterns = [
      {
        name: 'high_load',
        conditions: {
          throughput: (v) => v > 1000,
          cpuUsage: (v) => v > 0.7
        }
      },
      {
        name: 'api_friendly',
        conditions: {
          apiSuccessRate: (v) => v > 95,
          avgResponseTime: (v) => v < 500
        }
      },
      {
        name: 'heavy_protection',
        conditions: {
          browserSuccessRate: (v) => v > 80,
          apiSuccessRate: (v) => v < 20
        }
      }
    ];
    
    for (const pattern of patterns) {
      let matches = true;
      
      for (const [metric, condition] of Object.entries(pattern.conditions)) {
        if (!condition(metrics[metric] || 0)) {
          matches = false;
          break;
        }
      }
      
      if (matches) return pattern;
    }
    
    return null;
  }

  findBestStrategyForPattern(pattern) {
    const strategies = {
      high_load: {
        name: 'distributed_api_first',
        config: {
          workers: 16,
          concurrency: 50,
          strategy: 'api_first',
          caching: true
        }
      },
      api_friendly: {
        name: 'pure_api',
        config: {
          workers: 8,
          concurrency: 100,
          strategy: 'api_only',
          caching: true
        }
      },
      heavy_protection: {
        name: 'stealth_browser',
        config: {
          workers: 4,
          concurrency: 5,
          strategy: 'browser_stealth',
          antiDetection: true
        }
      }
    };
    
    return strategies[pattern.name];
  }

  applyOptimizations(metrics, recommendations) {
    const optimizations = {
      applied: [],
      config: {}
    };
    
    // Sort by priority
    recommendations.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });
    
    // Apply top recommendations
    for (const recommendation of recommendations.slice(0, 3)) {
      for (const action of recommendation.actions) {
        this.applyAction(action, optimizations);
      }
    }
    
    // Update learning data
    this.updateLearningData(metrics, optimizations);
    
    return optimizations;
  }

  applyAction(action, optimizations) {
    switch (action.type) {
      case 'reduce_concurrency':
        optimizations.config.concurrency = Math.floor(
          (optimizations.config.concurrency || 20) * action.factor
        );
        optimizations.applied.push(`Reduced concurrency to ${optimizations.config.concurrency}`);
        break;
        
      case 'increase_timeout':
        optimizations.config.timeout = action.value;
        optimizations.applied.push(`Increased timeout to ${action.value}ms`);
        break;
        
      case 'enable_caching':
        optimizations.config.caching = true;
        optimizations.applied.push('Enabled caching');
        break;
        
      case 'switch_strategy':
        optimizations.config.strategy = action.value;
        optimizations.applied.push(`Switched to ${action.value} strategy`);
        break;
        
      case 'exponential_backoff':
        optimizations.config.backoff = {
          enabled: true,
          initialDelay: 1000,
          maxDelay: 60000,
          factor: 2
        };
        optimizations.applied.push('Enabled exponential backoff');
        break;
        
      case 'rotate_user_agents':
        optimizations.config.userAgentRotation = true;
        optimizations.applied.push('Enabled user agent rotation');
        break;
        
      case 'enable_proxy_rotation':
        optimizations.config.proxyRotation = true;
        optimizations.applied.push('Enabled proxy rotation');
        break;
    }
  }

  updateLearningData(metrics, optimizations) {
    // Track strategy performance
    const strategyKey = JSON.stringify(optimizations.config);
    
    if (!this.learningData.strategies.has(strategyKey)) {
      this.learningData.strategies.set(strategyKey, {
        uses: 0,
        totalPerformance: 0,
        avgPerformance: 0
      });
    }
    
    const strategyData = this.learningData.strategies.get(strategyKey);
    strategyData.uses++;
    strategyData.totalPerformance += metrics.throughput || 0;
    strategyData.avgPerformance = strategyData.totalPerformance / strategyData.uses;
  }

  getBestKnownStrategy() {
    let bestStrategy = null;
    let bestPerformance = 0;
    
    for (const [config, data] of this.learningData.strategies) {
      if (data.avgPerformance > bestPerformance && data.uses >= 5) {
        bestPerformance = data.avgPerformance;
        bestStrategy = JSON.parse(config);
      }
    }
    
    return bestStrategy;
  }

  generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      performanceHistory: this.performanceHistory.slice(-20),
      learningInsights: {
        totalStrategiesTested: this.learningData.strategies.size,
        bestKnownStrategy: this.getBestKnownStrategy(),
        patterns: Array.from(this.learningData.patterns.entries())
      },
      recommendations: []
    };
    
    // Generate insights
    if (this.performanceHistory.length >= 20) {
      const trends = this.analyzeTrends();
      
      if (trends.throughput && trends.throughput.trend === 'improving') {
        report.recommendations.push({
          type: 'continue_current',
          message: 'Current optimizations are working well'
        });
      }
      
      if (trends.successRate && trends.successRate.current < 80) {
        report.recommendations.push({
          type: 'improve_reliability',
          message: 'Focus on improving success rate through better error handling'
        });
      }
    }
    
    return report;
  }
}

module.exports = AdaptiveOptimizer;