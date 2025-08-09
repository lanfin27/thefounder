// analytics-engine.js
// Comprehensive analytics engine with performance insights

const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const ss = require('simple-statistics');

class AnalyticsEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      windowSize: 1000, // Number of data points to keep
      aggregationIntervals: ['1m', '5m', '15m', '1h', '24h'],
      performanceThresholds: {
        responseTime: {
          excellent: 1000,
          good: 3000,
          acceptable: 5000
        },
        successRate: {
          excellent: 0.95,
          good: 0.90,
          acceptable: 0.80
        },
        dataQuality: {
          excellent: 0.90,
          good: 0.80,
          acceptable: 0.70
        }
      },
      anomalyDetection: {
        enabled: true,
        sensitivity: 2, // Standard deviations
        minSamples: 100
      },
      ...config
    };

    // Time series data storage
    this.timeSeries = {
      responseTime: new RollingWindow(this.config.windowSize),
      successRate: new RollingWindow(this.config.windowSize),
      dataExtracted: new RollingWindow(this.config.windowSize),
      errorRate: new RollingWindow(this.config.windowSize),
      proxyLatency: new RollingWindow(this.config.windowSize),
      cpuUsage: new RollingWindow(this.config.windowSize),
      memoryUsage: new RollingWindow(this.config.windowSize)
    };

    // Aggregated metrics
    this.aggregations = new Map();
    this.config.aggregationIntervals.forEach(interval => {
      this.aggregations.set(interval, {
        responseTime: new AggregatedMetric(),
        successRate: new AggregatedMetric(),
        dataExtracted: new AggregatedMetric(),
        errorTypes: new Map(),
        strategyPerformance: new Map()
      });
    });

    // Pattern analysis
    this.patterns = {
      temporal: new TemporalPatternAnalyzer(),
      behavioral: new BehavioralPatternAnalyzer(),
      performance: new PerformancePatternAnalyzer(),
      error: new ErrorPatternAnalyzer()
    };

    // Insights and recommendations
    this.insights = {
      current: [],
      historical: [],
      recommendations: []
    };

    // Performance tracking
    this.performanceTracking = {
      operations: new Map(),
      slowQueries: [],
      bottlenecks: []
    };

    // Initialize analytics
    this.initialize();
  }

  initialize() {
    // Start aggregation timers
    this.startAggregation();
    
    // Start anomaly detection
    if (this.config.anomalyDetection.enabled) {
      this.startAnomalyDetection();
    }
    
    // Start pattern analysis
    this.startPatternAnalysis();
    
    console.log('📊 Analytics engine initialized');
  }

  // =====================================================
  // DATA INGESTION
  // =====================================================

  recordMetric(type, value, metadata = {}) {
    const timestamp = Date.now();
    const dataPoint = { timestamp, value, metadata };
    
    // Add to time series
    if (this.timeSeries[type]) {
      this.timeSeries[type].add(dataPoint);
    }
    
    // Update aggregations
    this.updateAggregations(type, value, metadata);
    
    // Check for anomalies
    if (this.config.anomalyDetection.enabled) {
      this.checkAnomaly(type, value);
    }
    
    // Emit metric event
    this.emit('metric', { type, value, timestamp, metadata });
  }

  recordOperation(operationName, duration, success = true, metadata = {}) {
    const operation = {
      name: operationName,
      duration,
      success,
      timestamp: Date.now(),
      ...metadata
    };
    
    // Track operation performance
    if (!this.performanceTracking.operations.has(operationName)) {
      this.performanceTracking.operations.set(operationName, {
        count: 0,
        totalDuration: 0,
        successes: 0,
        failures: 0,
        durations: []
      });
    }
    
    const opStats = this.performanceTracking.operations.get(operationName);
    opStats.count++;
    opStats.totalDuration += duration;
    opStats.durations.push(duration);
    
    if (success) {
      opStats.successes++;
    } else {
      opStats.failures++;
    }
    
    // Keep only recent durations
    if (opStats.durations.length > 100) {
      opStats.durations = opStats.durations.slice(-100);
    }
    
    // Check for slow operations
    if (duration > this.getOperationThreshold(operationName)) {
      this.performanceTracking.slowQueries.push(operation);
      this.emit('slow_operation', operation);
    }
  }

  recordError(error) {
    const errorData = {
      type: error.type || 'unknown',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context: error.context || {}
    };
    
    // Update error patterns
    this.patterns.error.addError(errorData);
    
    // Update error type aggregations
    this.aggregations.forEach(agg => {
      const errorCount = agg.errorTypes.get(errorData.type) || 0;
      agg.errorTypes.set(errorData.type, errorCount + 1);
    });
    
    // Record error rate
    this.recordMetric('errorRate', 1);
  }

  // =====================================================
  // AGGREGATION
  // =====================================================

  startAggregation() {
    // 1-minute aggregation
    setInterval(() => this.aggregate('1m', 60), 60 * 1000);
    
    // 5-minute aggregation
    setInterval(() => this.aggregate('5m', 300), 5 * 60 * 1000);
    
    // 15-minute aggregation
    setInterval(() => this.aggregate('15m', 900), 15 * 60 * 1000);
    
    // 1-hour aggregation
    setInterval(() => this.aggregate('1h', 3600), 60 * 60 * 1000);
    
    // 24-hour aggregation
    setInterval(() => this.aggregate('24h', 86400), 24 * 60 * 60 * 1000);
  }

  aggregate(interval, windowSeconds) {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    const aggregation = this.aggregations.get(interval);
    
    // Aggregate each metric type
    Object.entries(this.timeSeries).forEach(([metric, series]) => {
      const recentData = series.getDataSince(windowStart);
      
      if (recentData.length > 0) {
        const values = recentData.map(d => d.value);
        
        aggregation[metric] = {
          count: values.length,
          sum: ss.sum(values),
          mean: ss.mean(values),
          median: ss.median(values),
          min: ss.min(values),
          max: ss.max(values),
          stdDev: values.length > 1 ? ss.standardDeviation(values) : 0,
          percentiles: {
            p50: ss.quantile(values, 0.5),
            p90: ss.quantile(values, 0.9),
            p95: ss.quantile(values, 0.95),
            p99: ss.quantile(values, 0.99)
          }
        };
      }
    });
    
    // Generate insights from aggregation
    this.generateAggregationInsights(interval, aggregation);
  }

  updateAggregations(type, value, metadata) {
    // Update running aggregations for all intervals
    this.aggregations.forEach(agg => {
      if (agg[type]) {
        agg[type].update(value);
      }
    });
    
    // Update strategy performance if applicable
    if (metadata.strategy) {
      this.aggregations.forEach(agg => {
        if (!agg.strategyPerformance.has(metadata.strategy)) {
          agg.strategyPerformance.set(metadata.strategy, {
            executions: 0,
            successes: 0,
            totalResponseTime: 0,
            dataExtracted: 0
          });
        }
        
        const stratPerf = agg.strategyPerformance.get(metadata.strategy);
        stratPerf.executions++;
        
        if (metadata.success) {
          stratPerf.successes++;
        }
        
        if (type === 'responseTime') {
          stratPerf.totalResponseTime += value;
        }
        
        if (type === 'dataExtracted') {
          stratPerf.dataExtracted += value;
        }
      });
    }
  }

  // =====================================================
  // ANOMALY DETECTION
  // =====================================================

  startAnomalyDetection() {
    setInterval(() => {
      Object.entries(this.timeSeries).forEach(([metric, series]) => {
        const recentData = series.getRecentData(100);
        if (recentData.length >= this.config.anomalyDetection.minSamples) {
          this.detectAnomalies(metric, recentData);
        }
      });
    }, 30 * 1000); // Check every 30 seconds
  }

  detectAnomalies(metric, data) {
    const values = data.map(d => d.value);
    const mean = ss.mean(values);
    const stdDev = ss.standardDeviation(values);
    
    const threshold = this.config.anomalyDetection.sensitivity * stdDev;
    const latest = values[values.length - 1];
    
    if (Math.abs(latest - mean) > threshold) {
      const anomaly = {
        metric,
        value: latest,
        mean,
        stdDev,
        deviation: (latest - mean) / stdDev,
        timestamp: Date.now(),
        severity: this.calculateAnomalySeverity(latest, mean, stdDev)
      };
      
      this.emit('anomaly', anomaly);
      this.generateAnomalyInsight(anomaly);
    }
  }

  calculateAnomalySeverity(value, mean, stdDev) {
    const deviation = Math.abs(value - mean) / stdDev;
    
    if (deviation > 4) return 'critical';
    if (deviation > 3) return 'high';
    if (deviation > 2) return 'medium';
    return 'low';
  }

  checkAnomaly(type, value) {
    const series = this.timeSeries[type];
    if (!series) return;
    
    const recentData = series.getRecentData(50);
    if (recentData.length < this.config.anomalyDetection.minSamples) return;
    
    const values = recentData.map(d => d.value);
    const mean = ss.mean(values);
    const stdDev = ss.standardDeviation(values);
    
    const zScore = (value - mean) / stdDev;
    
    if (Math.abs(zScore) > this.config.anomalyDetection.sensitivity) {
      this.emit('anomaly_detected', {
        type,
        value,
        zScore,
        mean,
        stdDev,
        timestamp: Date.now()
      });
    }
  }

  // =====================================================
  // PATTERN ANALYSIS
  // =====================================================

  startPatternAnalysis() {
    // Analyze patterns every 5 minutes
    setInterval(() => {
      this.analyzePatterns();
    }, 5 * 60 * 1000);
  }

  analyzePatterns() {
    // Temporal patterns
    const temporalPatterns = this.patterns.temporal.analyze(this.timeSeries);
    
    // Performance patterns
    const performancePatterns = this.patterns.performance.analyze(
      this.performanceTracking.operations
    );
    
    // Error patterns
    const errorPatterns = this.patterns.error.analyze();
    
    // Generate insights from patterns
    this.generatePatternInsights({
      temporal: temporalPatterns,
      performance: performancePatterns,
      error: errorPatterns
    });
  }

  // =====================================================
  // INSIGHTS GENERATION
  // =====================================================

  generateAggregationInsights(interval, aggregation) {
    const insights = [];
    
    // Response time insights
    if (aggregation.responseTime) {
      const avg = aggregation.responseTime.mean;
      const p95 = aggregation.responseTime.percentiles.p95;
      
      if (avg > this.config.performanceThresholds.responseTime.acceptable) {
        insights.push({
          type: 'performance',
          severity: 'warning',
          message: `Average response time (${Math.round(avg)}ms) exceeds acceptable threshold`,
          metric: 'responseTime',
          value: avg,
          threshold: this.config.performanceThresholds.responseTime.acceptable
        });
      }
      
      if (p95 > this.config.performanceThresholds.responseTime.acceptable * 2) {
        insights.push({
          type: 'performance',
          severity: 'warning',
          message: `95th percentile response time (${Math.round(p95)}ms) indicates performance issues`,
          metric: 'responseTime_p95',
          value: p95
        });
      }
    }
    
    // Success rate insights
    if (aggregation.successRate) {
      const rate = aggregation.successRate.mean;
      
      if (rate < this.config.performanceThresholds.successRate.acceptable) {
        insights.push({
          type: 'reliability',
          severity: rate < this.config.performanceThresholds.successRate.good ? 'high' : 'medium',
          message: `Success rate (${(rate * 100).toFixed(1)}%) below acceptable threshold`,
          metric: 'successRate',
          value: rate,
          threshold: this.config.performanceThresholds.successRate.acceptable
        });
      }
    }
    
    // Error type insights
    if (aggregation.errorTypes.size > 0) {
      const topErrors = Array.from(aggregation.errorTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      if (topErrors.length > 0) {
        insights.push({
          type: 'error',
          severity: 'medium',
          message: `Top error types: ${topErrors.map(([type, count]) => `${type} (${count})`).join(', ')}`,
          metric: 'errorTypes',
          value: Object.fromEntries(topErrors)
        });
      }
    }
    
    // Add insights to current list
    insights.forEach(insight => {
      insight.interval = interval;
      insight.timestamp = Date.now();
      this.insights.current.push(insight);
    });
    
    // Keep only recent insights
    this.insights.current = this.insights.current
      .filter(i => Date.now() - i.timestamp < 3600000) // 1 hour
      .slice(-100); // Keep last 100
  }

  generateAnomalyInsight(anomaly) {
    const insight = {
      type: 'anomaly',
      severity: anomaly.severity,
      message: `Anomaly detected in ${anomaly.metric}: ${anomaly.value.toFixed(2)} (${anomaly.deviation.toFixed(1)}σ from mean)`,
      metric: anomaly.metric,
      value: anomaly.value,
      mean: anomaly.mean,
      deviation: anomaly.deviation,
      timestamp: anomaly.timestamp
    };
    
    this.insights.current.push(insight);
    
    // Generate recommendation
    const recommendation = this.generateAnomalyRecommendation(anomaly);
    if (recommendation) {
      this.insights.recommendations.push(recommendation);
    }
  }

  generateAnomalyRecommendation(anomaly) {
    const recommendations = {
      responseTime: {
        high: 'Consider scaling resources or optimizing slow operations',
        low: 'System performing exceptionally well - document current configuration'
      },
      errorRate: {
        high: 'Investigate error spike - check recent deployments or external dependencies',
        low: 'Error rate improvement detected - maintain current practices'
      },
      cpuUsage: {
        high: 'CPU usage spike detected - consider horizontal scaling or process optimization',
        low: 'CPU usage optimal'
      },
      memoryUsage: {
        high: 'Memory usage high - check for memory leaks or increase available memory',
        low: 'Memory usage optimal'
      }
    };
    
    const direction = anomaly.value > anomaly.mean ? 'high' : 'low';
    const recommendation = recommendations[anomaly.metric]?.[direction];
    
    if (recommendation) {
      return {
        type: 'anomaly_response',
        metric: anomaly.metric,
        action: recommendation,
        priority: anomaly.severity === 'critical' ? 'high' : 'medium',
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  generatePatternInsights(patterns) {
    // Temporal pattern insights
    if (patterns.temporal.peakHours) {
      this.insights.current.push({
        type: 'pattern',
        subtype: 'temporal',
        message: `Peak activity hours: ${patterns.temporal.peakHours.join(', ')}`,
        data: patterns.temporal,
        timestamp: Date.now()
      });
    }
    
    // Performance bottleneck insights
    if (patterns.performance.bottlenecks.length > 0) {
      patterns.performance.bottlenecks.forEach(bottleneck => {
        this.insights.current.push({
          type: 'bottleneck',
          severity: 'high',
          message: `Performance bottleneck: ${bottleneck.operation} (avg: ${bottleneck.avgDuration}ms)`,
          operation: bottleneck.operation,
          impact: bottleneck.impact,
          timestamp: Date.now()
        });
      });
    }
    
    // Error pattern insights
    if (patterns.error.recurringErrors.length > 0) {
      this.insights.current.push({
        type: 'pattern',
        subtype: 'error',
        severity: 'medium',
        message: `Recurring error patterns detected: ${patterns.error.recurringErrors.length} patterns`,
        patterns: patterns.error.recurringErrors,
        timestamp: Date.now()
      });
    }
  }

  // =====================================================
  // OPTIMIZATION RECOMMENDATIONS
  // =====================================================

  generateOptimizationRecommendations() {
    const recommendations = [];
    
    // Analyze operation performance
    this.performanceTracking.operations.forEach((stats, operation) => {
      const avgDuration = stats.totalDuration / stats.count;
      const successRate = stats.successes / stats.count;
      
      if (avgDuration > 5000) {
        recommendations.push({
          type: 'performance',
          target: operation,
          issue: 'slow_operation',
          current: avgDuration,
          recommendation: 'Optimize operation or implement caching',
          priority: avgDuration > 10000 ? 'high' : 'medium',
          potentialImpact: 'high'
        });
      }
      
      if (successRate < 0.9) {
        recommendations.push({
          type: 'reliability',
          target: operation,
          issue: 'low_success_rate',
          current: successRate,
          recommendation: 'Implement retry logic or investigate failure causes',
          priority: successRate < 0.8 ? 'high' : 'medium',
          potentialImpact: 'medium'
        });
      }
    });
    
    // Analyze resource usage patterns
    const cpuData = this.timeSeries.cpuUsage.getAllData();
    const memoryData = this.timeSeries.memoryUsage.getAllData();
    
    if (cpuData.length > 100) {
      const cpuValues = cpuData.map(d => d.value);
      const avgCpu = ss.mean(cpuValues);
      const maxCpu = ss.max(cpuValues);
      
      if (avgCpu > 70) {
        recommendations.push({
          type: 'resource',
          target: 'cpu',
          issue: 'high_usage',
          current: avgCpu,
          recommendation: 'Consider horizontal scaling or CPU optimization',
          priority: 'high',
          potentialImpact: 'high'
        });
      }
    }
    
    // Analyze error patterns
    const errorPatterns = this.patterns.error.getTopPatterns(5);
    errorPatterns.forEach(pattern => {
      if (pattern.frequency > 10) {
        recommendations.push({
          type: 'error',
          target: pattern.type,
          issue: 'recurring_error',
          frequency: pattern.frequency,
          recommendation: `Investigate and fix root cause of ${pattern.type} errors`,
          priority: pattern.frequency > 50 ? 'high' : 'medium',
          potentialImpact: 'medium'
        });
      }
    });
    
    // Sort by priority and impact
    recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const impactWeight = { high: 3, medium: 2, low: 1 };
      
      const scoreA = priorityWeight[a.priority] * impactWeight[a.potentialImpact];
      const scoreB = priorityWeight[b.priority] * impactWeight[b.potentialImpact];
      
      return scoreB - scoreA;
    });
    
    this.insights.recommendations = recommendations;
    return recommendations;
  }

  // =====================================================
  // REPORTING
  // =====================================================

  generateReport(period = '1h') {
    const aggregation = this.aggregations.get(period);
    if (!aggregation) return null;
    
    const report = {
      period,
      timestamp: Date.now(),
      summary: {
        avgResponseTime: aggregation.responseTime?.mean || 0,
        p95ResponseTime: aggregation.responseTime?.percentiles?.p95 || 0,
        successRate: aggregation.successRate?.mean || 0,
        totalDataExtracted: aggregation.dataExtracted?.sum || 0,
        errorRate: aggregation.errorRate?.mean || 0
      },
      performance: {
        operations: this.getOperationsSummary(),
        bottlenecks: this.identifyBottlenecks(),
        trends: this.calculateTrends(period)
      },
      errors: {
        distribution: Object.fromEntries(aggregation.errorTypes),
        patterns: this.patterns.error.getTopPatterns(10)
      },
      insights: {
        current: this.insights.current.filter(i => i.severity === 'high' || i.severity === 'critical'),
        recommendations: this.insights.recommendations.slice(0, 10)
      },
      health: this.calculateSystemHealth()
    };
    
    return report;
  }

  getOperationsSummary() {
    const summary = [];
    
    this.performanceTracking.operations.forEach((stats, operation) => {
      summary.push({
        operation,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        successRate: stats.successes / stats.count,
        p95Duration: stats.durations.length > 0 ? ss.quantile(stats.durations, 0.95) : 0
      });
    });
    
    return summary.sort((a, b) => b.count - a.count);
  }

  identifyBottlenecks() {
    const bottlenecks = [];
    
    this.performanceTracking.operations.forEach((stats, operation) => {
      const avgDuration = stats.totalDuration / stats.count;
      const impact = stats.count * avgDuration; // Total time impact
      
      if (avgDuration > 3000 || impact > 600000) { // 10 minutes total
        bottlenecks.push({
          operation,
          avgDuration,
          count: stats.count,
          impact,
          recommendation: this.getBottleneckRecommendation(operation, avgDuration, stats.count)
        });
      }
    });
    
    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  getBottleneckRecommendation(operation, avgDuration, count) {
    if (avgDuration > 10000) {
      return 'Critical performance issue - immediate optimization required';
    } else if (count > 1000 && avgDuration > 3000) {
      return 'High-frequency slow operation - consider caching or batch processing';
    } else if (avgDuration > 5000) {
      return 'Slow operation - investigate optimization opportunities';
    } else {
      return 'Monitor for further degradation';
    }
  }

  calculateTrends(period) {
    const trends = {};
    
    Object.entries(this.timeSeries).forEach(([metric, series]) => {
      const data = series.getAllData();
      if (data.length < 10) return;
      
      const values = data.map(d => d.value);
      const timestamps = data.map(d => d.timestamp);
      
      // Simple linear regression for trend
      const regression = ss.linearRegression(timestamps.map((t, i) => [t, values[i]]));
      const slope = regression.m;
      
      trends[metric] = {
        direction: slope > 0 ? 'increasing' : 'decreasing',
        rate: slope,
        current: values[values.length - 1],
        average: ss.mean(values),
        volatility: ss.standardDeviation(values) / ss.mean(values)
      };
    });
    
    return trends;
  }

  calculateSystemHealth() {
    const weights = {
      successRate: 0.3,
      responseTime: 0.25,
      errorRate: 0.25,
      resourceUsage: 0.2
    };
    
    let healthScore = 0;
    
    // Success rate component
    const successRate = this.timeSeries.successRate.getRecentData(100);
    if (successRate.length > 0) {
      const avgSuccess = ss.mean(successRate.map(d => d.value));
      healthScore += weights.successRate * Math.min(avgSuccess / 0.95, 1);
    }
    
    // Response time component
    const responseTime = this.timeSeries.responseTime.getRecentData(100);
    if (responseTime.length > 0) {
      const avgResponse = ss.mean(responseTime.map(d => d.value));
      const responseScore = Math.max(0, 1 - (avgResponse / 5000));
      healthScore += weights.responseTime * responseScore;
    }
    
    // Error rate component
    const errorRate = this.timeSeries.errorRate.getRecentData(100);
    if (errorRate.length > 0) {
      const avgError = ss.mean(errorRate.map(d => d.value));
      healthScore += weights.errorRate * Math.max(0, 1 - avgError);
    }
    
    // Resource usage component
    const cpuUsage = this.timeSeries.cpuUsage.getRecentData(50);
    const memoryUsage = this.timeSeries.memoryUsage.getRecentData(50);
    
    if (cpuUsage.length > 0 && memoryUsage.length > 0) {
      const avgCpu = ss.mean(cpuUsage.map(d => d.value));
      const avgMemory = ss.mean(memoryUsage.map(d => d.value));
      const resourceScore = Math.max(0, 1 - ((avgCpu + avgMemory) / 200));
      healthScore += weights.resourceUsage * resourceScore;
    }
    
    return {
      score: healthScore,
      status: this.getHealthStatus(healthScore),
      components: {
        successRate: avgSuccess || 0,
        responseTime: avgResponse || 0,
        errorRate: avgError || 0,
        cpuUsage: avgCpu || 0,
        memoryUsage: avgMemory || 0
      }
    };
  }

  getHealthStatus(score) {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.8) return 'good';
    if (score >= 0.7) return 'fair';
    if (score >= 0.6) return 'poor';
    return 'critical';
  }

  getOperationThreshold(operationName) {
    // Define custom thresholds for specific operations
    const thresholds = {
      'page_load': 5000,
      'data_extraction': 3000,
      'proxy_rotation': 1000,
      'database_query': 500
    };
    
    return thresholds[operationName] || 2000; // Default 2 seconds
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  getMetrics() {
    return {
      timeSeries: Object.entries(this.timeSeries).reduce((acc, [key, series]) => {
        acc[key] = {
          count: series.size(),
          latest: series.getLatest()
        };
        return acc;
      }, {}),
      aggregations: Object.fromEntries(this.aggregations),
      insights: {
        current: this.insights.current.length,
        recommendations: this.insights.recommendations.length
      },
      operations: this.performanceTracking.operations.size,
      slowQueries: this.performanceTracking.slowQueries.length
    };
  }

  reset() {
    // Reset all time series
    Object.values(this.timeSeries).forEach(series => series.clear());
    
    // Reset aggregations
    this.aggregations.forEach(agg => {
      Object.keys(agg).forEach(key => {
        if (key === 'errorTypes' || key === 'strategyPerformance') {
          agg[key].clear();
        } else {
          agg[key] = new AggregatedMetric();
        }
      });
    });
    
    // Reset insights
    this.insights = {
      current: [],
      historical: [],
      recommendations: []
    };
    
    // Reset performance tracking
    this.performanceTracking.operations.clear();
    this.performanceTracking.slowQueries = [];
    this.performanceTracking.bottlenecks = [];
  }
}

// Helper Classes

class RollingWindow {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.data = [];
  }
  
  add(point) {
    this.data.push(point);
    if (this.data.length > this.maxSize) {
      this.data.shift();
    }
  }
  
  getRecentData(count) {
    return this.data.slice(-count);
  }
  
  getDataSince(timestamp) {
    return this.data.filter(d => d.timestamp >= timestamp);
  }
  
  getAllData() {
    return [...this.data];
  }
  
  getLatest() {
    return this.data[this.data.length - 1];
  }
  
  size() {
    return this.data.length;
  }
  
  clear() {
    this.data = [];
  }
}

class AggregatedMetric {
  constructor() {
    this.reset();
  }
  
  update(value) {
    this.count++;
    this.sum += value;
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
    
    // Update running mean and variance
    const delta = value - this.mean;
    this.mean += delta / this.count;
    this.m2 += delta * (value - this.mean);
  }
  
  getStats() {
    return {
      count: this.count,
      sum: this.sum,
      mean: this.mean,
      min: this.min,
      max: this.max,
      variance: this.count > 1 ? this.m2 / (this.count - 1) : 0,
      stdDev: this.count > 1 ? Math.sqrt(this.m2 / (this.count - 1)) : 0
    };
  }
  
  reset() {
    this.count = 0;
    this.sum = 0;
    this.mean = 0;
    this.min = Infinity;
    this.max = -Infinity;
    this.m2 = 0;
  }
}

class TemporalPatternAnalyzer {
  analyze(timeSeries) {
    const patterns = {
      hourlyDistribution: new Array(24).fill(0),
      dailyDistribution: new Array(7).fill(0),
      peakHours: [],
      quietHours: []
    };
    
    // Analyze response time patterns by hour
    const responseData = timeSeries.responseTime.getAllData();
    
    responseData.forEach(point => {
      const date = new Date(point.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      
      patterns.hourlyDistribution[hour]++;
      patterns.dailyDistribution[day]++;
    });
    
    // Find peak and quiet hours
    const hourlyAvg = patterns.hourlyDistribution.reduce((a, b) => a + b) / 24;
    patterns.peakHours = patterns.hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > hourlyAvg * 1.5)
      .map(h => h.hour);
    
    patterns.quietHours = patterns.hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count < hourlyAvg * 0.5)
      .map(h => h.hour);
    
    return patterns;
  }
}

class BehavioralPatternAnalyzer {
  analyze(data) {
    // Analyze user behavior patterns
    return {
      sessionDurations: [],
      navigationPaths: [],
      interactionSequences: []
    };
  }
}

class PerformancePatternAnalyzer {
  analyze(operations) {
    const patterns = {
      bottlenecks: [],
      degradations: [],
      improvements: []
    };
    
    operations.forEach((stats, operation) => {
      const avgDuration = stats.totalDuration / stats.count;
      const recentDurations = stats.durations.slice(-20);
      
      if (recentDurations.length >= 20) {
        const recentAvg = ss.mean(recentDurations);
        const oldAvg = ss.mean(stats.durations.slice(0, 20));
        
        if (recentAvg > oldAvg * 1.2) {
          patterns.degradations.push({
            operation,
            oldAvg,
            recentAvg,
            degradation: ((recentAvg - oldAvg) / oldAvg) * 100
          });
        } else if (recentAvg < oldAvg * 0.8) {
          patterns.improvements.push({
            operation,
            oldAvg,
            recentAvg,
            improvement: ((oldAvg - recentAvg) / oldAvg) * 100
          });
        }
      }
      
      if (avgDuration > 5000) {
        patterns.bottlenecks.push({
          operation,
          avgDuration,
          impact: stats.count * avgDuration
        });
      }
    });
    
    return patterns;
  }
}

class ErrorPatternAnalyzer {
  constructor() {
    this.errors = [];
    this.patterns = new Map();
  }
  
  addError(error) {
    this.errors.push(error);
    
    // Keep only recent errors
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
    
    // Update patterns
    this.updatePatterns(error);
  }
  
  updatePatterns(error) {
    const key = `${error.type}_${error.message?.substring(0, 50)}`;
    
    if (!this.patterns.has(key)) {
      this.patterns.set(key, {
        type: error.type,
        message: error.message,
        count: 0,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        contexts: []
      });
    }
    
    const pattern = this.patterns.get(key);
    pattern.count++;
    pattern.lastSeen = error.timestamp;
    pattern.contexts.push(error.context);
    
    // Keep only recent contexts
    if (pattern.contexts.length > 10) {
      pattern.contexts = pattern.contexts.slice(-10);
    }
  }
  
  analyze() {
    const analysis = {
      totalErrors: this.errors.length,
      uniquePatterns: this.patterns.size,
      recurringErrors: [],
      errorSpikes: []
    };
    
    // Find recurring errors
    this.patterns.forEach((pattern, key) => {
      if (pattern.count > 5) {
        analysis.recurringErrors.push({
          ...pattern,
          frequency: pattern.count / ((pattern.lastSeen - pattern.firstSeen) / 3600000) // per hour
        });
      }
    });
    
    // Detect error spikes
    const hourlyBuckets = new Map();
    this.errors.forEach(error => {
      const hourKey = Math.floor(error.timestamp / 3600000);
      hourlyBuckets.set(hourKey, (hourlyBuckets.get(hourKey) || 0) + 1);
    });
    
    const hourlyAvg = this.errors.length / 24;
    hourlyBuckets.forEach((count, hour) => {
      if (count > hourlyAvg * 3) {
        analysis.errorSpikes.push({
          timestamp: hour * 3600000,
          count,
          severity: count > hourlyAvg * 5 ? 'high' : 'medium'
        });
      }
    });
    
    return analysis;
  }
  
  getTopPatterns(limit = 10) {
    return Array.from(this.patterns.entries())
      .map(([key, pattern]) => ({ key, ...pattern }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

module.exports = AnalyticsEngine;