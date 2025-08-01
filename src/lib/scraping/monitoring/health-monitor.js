// System health monitoring and diagnostics
const fs = require('fs').promises;
const path = require('path');

class HealthMonitor {
  constructor(options = {}) {
    this.options = {
      checkInterval: 60000, // 1 minute
      alertThreshold: 0.7,  // 70% failure rate triggers alert
      historySize: 1000,    // Keep last 1000 operations
      metricsFile: 'health-metrics.json',
      ...options
    };

    this.metrics = {
      extraction: {
        total: 0,
        successful: 0,
        failed: 0,
        partial: 0,
        byDataType: {},
        byStrategy: {},
        lastCheck: null
      },
      performance: {
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity,
        timeouts: 0
      },
      errors: [],
      alerts: [],
      history: []
    };

    this.healthStatus = {
      overall: 'healthy',
      extractionHealth: 'healthy',
      performanceHealth: 'healthy',
      strategyHealth: {},
      lastUpdated: new Date().toISOString()
    };

    this.loadMetrics();
  }

  /**
   * Load metrics from file
   */
  async loadMetrics() {
    try {
      const metricsPath = path.join(process.cwd(), 'data', 'scraping', this.options.metricsFile);
      const data = await fs.readFile(metricsPath, 'utf8');
      this.metrics = JSON.parse(data);
      console.log('📊 Loaded health metrics from file');
    } catch (error) {
      console.log('📊 Starting fresh health metrics');
    }
  }

  /**
   * Save metrics to file
   */
  async saveMetrics() {
    try {
      const metricsPath = path.join(process.cwd(), 'data', 'scraping', this.options.metricsFile);
      const dir = path.dirname(metricsPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(metricsPath, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Failed to save health metrics:', error);
    }
  }

  /**
   * Record extraction result
   */
  async recordExtractionResult(result) {
    this.metrics.extraction.total++;

    if (result.success) {
      this.metrics.extraction.successful++;
    } else if (result.partial) {
      this.metrics.extraction.partial++;
    } else {
      this.metrics.extraction.failed++;
    }

    // Track by data type
    if (result.extracted) {
      result.extracted.forEach(dataType => {
        if (!this.metrics.extraction.byDataType[dataType]) {
          this.metrics.extraction.byDataType[dataType] = {
            total: 0,
            successful: 0,
            failed: 0
          };
        }
        this.metrics.extraction.byDataType[dataType].total++;
        this.metrics.extraction.byDataType[dataType].successful++;
      });
    }

    // Track by strategy
    if (result.method) {
      if (!this.metrics.extraction.byStrategy[result.method]) {
        this.metrics.extraction.byStrategy[result.method] = {
          total: 0,
          successful: 0,
          failed: 0
        };
      }
      this.metrics.extraction.byStrategy[result.method].total++;
      if (result.success || result.partial) {
        this.metrics.extraction.byStrategy[result.method].successful++;
      } else {
        this.metrics.extraction.byStrategy[result.method].failed++;
      }
    }

    // Add to history
    this.addToHistory({
      type: 'extraction',
      success: result.success || result.partial,
      timestamp: new Date().toISOString(),
      details: result
    });

    // Check health status
    await this.checkHealth();
  }

  /**
   * Record performance metrics
   */
  async recordPerformance(duration, timeout = false) {
    if (timeout) {
      this.metrics.performance.timeouts++;
    } else {
      // Update average time
      const totalTime = this.metrics.performance.averageTime * (this.metrics.extraction.total - 1);
      this.metrics.performance.averageTime = (totalTime + duration) / this.metrics.extraction.total;

      // Update min/max
      this.metrics.performance.maxTime = Math.max(this.metrics.performance.maxTime, duration);
      this.metrics.performance.minTime = Math.min(this.metrics.performance.minTime, duration);
    }

    // Check if performance is degrading
    if (this.metrics.performance.averageTime > 20000) { // 20 seconds
      await this.raiseAlert('performance', 'Average extraction time exceeds 20 seconds');
    }
  }

  /**
   * Record error
   */
  async recordError(error, context = {}) {
    const errorRecord = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: context
    };

    this.metrics.errors.push(errorRecord);

    // Keep only recent errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-100);
    }

    // Check for critical errors
    const recentErrors = this.metrics.errors.filter(e => {
      const errorTime = new Date(e.timestamp);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return errorTime > fiveMinutesAgo;
    });

    if (recentErrors.length > 10) {
      await this.raiseAlert('error-rate', `High error rate: ${recentErrors.length} errors in 5 minutes`);
    }
  }

  /**
   * Check overall system health
   */
  async checkHealth() {
    const now = new Date();
    this.metrics.extraction.lastCheck = now.toISOString();

    // Calculate success rates
    const overallSuccessRate = this.calculateSuccessRate(
      this.metrics.extraction.successful + this.metrics.extraction.partial,
      this.metrics.extraction.total
    );

    // Check extraction health
    if (overallSuccessRate < 0.3) {
      this.healthStatus.extractionHealth = 'critical';
    } else if (overallSuccessRate < 0.7) {
      this.healthStatus.extractionHealth = 'degraded';
    } else {
      this.healthStatus.extractionHealth = 'healthy';
    }

    // Check performance health
    if (this.metrics.performance.timeouts > this.metrics.extraction.total * 0.1) {
      this.healthStatus.performanceHealth = 'degraded';
    } else if (this.metrics.performance.averageTime > 30000) {
      this.healthStatus.performanceHealth = 'slow';
    } else {
      this.healthStatus.performanceHealth = 'healthy';
    }

    // Check strategy health
    for (const [strategy, stats] of Object.entries(this.metrics.extraction.byStrategy)) {
      const successRate = this.calculateSuccessRate(stats.successful, stats.total);
      
      if (successRate < 0.3) {
        this.healthStatus.strategyHealth[strategy] = 'failing';
      } else if (successRate < 0.7) {
        this.healthStatus.strategyHealth[strategy] = 'degraded';
      } else {
        this.healthStatus.strategyHealth[strategy] = 'healthy';
      }
    }

    // Determine overall health
    const healthStates = [
      this.healthStatus.extractionHealth,
      this.healthStatus.performanceHealth,
      ...Object.values(this.healthStatus.strategyHealth)
    ];

    if (healthStates.includes('critical')) {
      this.healthStatus.overall = 'critical';
      await this.raiseAlert('health', 'System health is critical');
    } else if (healthStates.filter(h => h === 'degraded' || h === 'failing').length > 2) {
      this.healthStatus.overall = 'degraded';
    } else {
      this.healthStatus.overall = 'healthy';
    }

    this.healthStatus.lastUpdated = now.toISOString();

    // Save metrics periodically
    if (Math.random() < 0.1) {
      await this.saveMetrics();
    }
  }

  /**
   * Get health report
   */
  getHealthReport() {
    const report = {
      status: this.healthStatus,
      summary: {
        totalExtractions: this.metrics.extraction.total,
        successRate: this.calculateSuccessRate(
          this.metrics.extraction.successful + this.metrics.extraction.partial,
          this.metrics.extraction.total
        ),
        averageTime: Math.round(this.metrics.performance.averageTime),
        recentErrors: this.metrics.errors.slice(-5),
        activeAlerts: this.metrics.alerts.filter(a => !a.resolved)
      },
      dataTypePerformance: {},
      strategyPerformance: {},
      recommendations: []
    };

    // Calculate data type performance
    for (const [dataType, stats] of Object.entries(this.metrics.extraction.byDataType)) {
      report.dataTypePerformance[dataType] = {
        total: stats.total,
        successRate: this.calculateSuccessRate(stats.successful, stats.total)
      };
    }

    // Calculate strategy performance
    for (const [strategy, stats] of Object.entries(this.metrics.extraction.byStrategy)) {
      report.strategyPerformance[strategy] = {
        total: stats.total,
        successRate: this.calculateSuccessRate(stats.successful, stats.total),
        health: this.healthStatus.strategyHealth[strategy] || 'unknown'
      };
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations();

    return report;
  }

  /**
   * Generate recommendations based on metrics
   */
  generateRecommendations() {
    const recommendations = [];

    // Check overall success rate
    const overallSuccessRate = this.calculateSuccessRate(
      this.metrics.extraction.successful,
      this.metrics.extraction.total
    );

    if (overallSuccessRate < 0.5) {
      recommendations.push({
        severity: 'high',
        type: 'success-rate',
        message: 'Overall success rate is below 50%. Consider refreshing detection strategies.',
        action: 'refresh-strategies'
      });
    }

    // Check failing strategies
    for (const [strategy, health] of Object.entries(this.healthStatus.strategyHealth)) {
      if (health === 'failing') {
        recommendations.push({
          severity: 'medium',
          type: 'strategy-failure',
          message: `Strategy "${strategy}" is failing. Consider disabling or updating it.`,
          action: 'update-strategy',
          target: strategy
        });
      }
    }

    // Check performance
    if (this.metrics.performance.averageTime > 20000) {
      recommendations.push({
        severity: 'medium',
        type: 'performance',
        message: 'Average extraction time is high. Consider optimizing strategies or increasing timeouts.',
        action: 'optimize-performance'
      });
    }

    // Check specific data types
    for (const [dataType, stats] of Object.entries(this.metrics.extraction.byDataType)) {
      const successRate = this.calculateSuccessRate(stats.successful, stats.total);
      if (successRate < 0.3 && stats.total > 10) {
        recommendations.push({
          severity: 'high',
          type: 'data-type-failure',
          message: `Extraction for "${dataType}" is failing (${(successRate * 100).toFixed(1)}% success rate)`,
          action: 'train-patterns',
          target: dataType
        });
      }
    }

    return recommendations;
  }

  /**
   * Raise an alert
   */
  async raiseAlert(type, message, severity = 'medium') {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      message: message,
      severity: severity,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.metrics.alerts.push(alert);

    // Keep only recent alerts
    if (this.metrics.alerts.length > 50) {
      this.metrics.alerts = this.metrics.alerts.slice(-50);
    }

    console.log(`🚨 ALERT [${severity}]: ${message}`);
    
    // Save metrics with alert
    await this.saveMetrics();

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId) {
    const alert = this.metrics.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.metrics.alerts.filter(a => !a.resolved);
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentHistory = this.metrics.history.filter(h => 
      new Date(h.timestamp) > cutoff
    );

    // Group by hour
    const hourlyStats = {};
    
    recentHistory.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = {
          total: 0,
          successful: 0,
          failed: 0
        };
      }
      
      hourlyStats[hour].total++;
      if (record.success) {
        hourlyStats[hour].successful++;
      } else {
        hourlyStats[hour].failed++;
      }
    });

    return hourlyStats;
  }

  /**
   * Helper methods
   */
  calculateSuccessRate(successful, total) {
    if (total === 0) return 0;
    return successful / total;
  }

  addToHistory(record) {
    this.metrics.history.push(record);
    
    // Keep history size limited
    if (this.metrics.history.length > this.options.historySize) {
      this.metrics.history = this.metrics.history.slice(-this.options.historySize);
    }
  }

  /**
   * Reset metrics
   */
  async resetMetrics() {
    this.metrics = {
      extraction: {
        total: 0,
        successful: 0,
        failed: 0,
        partial: 0,
        byDataType: {},
        byStrategy: {},
        lastCheck: null
      },
      performance: {
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity,
        timeouts: 0
      },
      errors: [],
      alerts: [],
      history: []
    };

    await this.saveMetrics();
    console.log('📊 Health metrics reset');
  }

  /**
   * Export metrics for analysis
   */
  async exportMetrics(format = 'json') {
    const exportData = {
      metrics: this.metrics,
      healthStatus: this.healthStatus,
      report: this.getHealthReport(),
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      const exportPath = path.join(
        process.cwd(), 
        'data', 
        'scraping', 
        `health-export-${Date.now()}.json`
      );
      
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
      console.log(`📊 Metrics exported to: ${exportPath}`);
      return exportPath;
    }

    return exportData;
  }
}

module.exports = HealthMonitor;