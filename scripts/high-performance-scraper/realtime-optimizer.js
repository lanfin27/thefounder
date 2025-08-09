// scripts/high-performance-scraper/realtime-optimizer.js
// Real-time Performance Optimization with Predictive Analytics

const { performance } = require('perf_hooks');
const os = require('os');
const EventEmitter = require('events');

class RealtimeOptimizer extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      current: {},
      historical: [],
      predictions: {}
    };
    
    this.optimizationState = {
      workers: 32,
      concurrency: 15,
      batchSize: 50,
      cacheEnabled: true,
      strategy: 'hybrid'
    };
    
    this.performanceTargets = {
      throughput: 1000, // listings per minute
      latency: 60, // ms per listing
      cpuUsage: 0.7, // 70% max
      memoryUsage: 0.8, // 80% max
      errorRate: 0.01 // 1% max
    };
    
    this.mlModel = {
      weights: new Map(),
      learningRate: 0.01,
      trainingData: []
    };
    
    this.isOptimizing = false;
    this.optimizationInterval = null;
  }

  startOptimization() {
    if (this.isOptimizing) return;
    
    console.log('🚀 Starting Real-time Performance Optimization');
    this.isOptimizing = true;
    
    // Collect metrics every second
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000);
    
    // Run optimization every 5 seconds
    this.optimizationInterval = setInterval(() => {
      this.optimizePerformance();
    }, 5000);
    
    // Predict performance every 10 seconds
    this.predictionInterval = setInterval(() => {
      this.predictPerformance();
    }, 10000);
  }

  stopOptimization() {
    this.isOptimizing = false;
    
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.optimizationInterval) clearInterval(this.optimizationInterval);
    if (this.predictionInterval) clearInterval(this.predictionInterval);
    
    console.log('🛑 Real-time optimization stopped');
  }

  collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      system: this.getSystemMetrics(),
      performance: this.getPerformanceMetrics(),
      quality: this.getQualityMetrics()
    };
    
    // Add to current metrics
    this.metrics.current = metrics;
    
    // Add to historical data
    this.metrics.historical.push(metrics);
    
    // Keep only last 1000 data points
    if (this.metrics.historical.length > 1000) {
      this.metrics.historical.shift();
    }
    
    // Train ML model with new data
    this.trainModel(metrics);
    
    // Emit metrics for monitoring
    this.emit('metrics', metrics);
  }

  getSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + (1 - idle / total);
    }, 0) / cpus.length;
    
    return {
      cpuUsage,
      memoryUsage: 1 - (freeMemory / totalMemory),
      cpuCount: cpus.length,
      loadAverage: os.loadavg()[0],
      freeMemory: Math.round(freeMemory / 1024 / 1024), // MB
      activeWorkers: this.optimizationState.workers
    };
  }

  getPerformanceMetrics() {
    // These would be populated by actual scraping metrics
    return {
      throughput: this.calculateThroughput(),
      avgLatency: this.calculateAvgLatency(),
      p95Latency: this.calculateP95Latency(),
      errorRate: this.calculateErrorRate(),
      cacheHitRate: this.calculateCacheHitRate(),
      queueLength: this.getQueueLength()
    };
  }

  getQualityMetrics() {
    return {
      dataCompleteness: this.calculateDataCompleteness(),
      extractionAccuracy: this.calculateExtractionAccuracy(),
      duplicateRate: this.calculateDuplicateRate()
    };
  }

  optimizePerformance() {
    const current = this.metrics.current;
    const predictions = this.metrics.predictions;
    
    console.log('\n📊 Running Performance Optimization...');
    
    // Analyze current state
    const analysis = this.analyzePerformance(current);
    
    // Generate optimization actions
    const actions = this.generateOptimizationActions(analysis, predictions);
    
    // Apply optimizations
    actions.forEach(action => this.applyOptimization(action));
    
    // Report optimization results
    this.reportOptimization(actions);
  }

  analyzePerformance(metrics) {
    const analysis = {
      bottlenecks: [],
      opportunities: [],
      risks: []
    };
    
    // CPU bottleneck detection
    if (metrics.system.cpuUsage > this.performanceTargets.cpuUsage) {
      analysis.bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        value: metrics.system.cpuUsage,
        threshold: this.performanceTargets.cpuUsage
      });
    }
    
    // Memory bottleneck detection
    if (metrics.system.memoryUsage > this.performanceTargets.memoryUsage) {
      analysis.bottlenecks.push({
        type: 'memory',
        severity: 'high',
        value: metrics.system.memoryUsage,
        threshold: this.performanceTargets.memoryUsage
      });
    }
    
    // Throughput analysis
    if (metrics.performance.throughput < this.performanceTargets.throughput) {
      analysis.opportunities.push({
        type: 'throughput',
        potential: this.performanceTargets.throughput - metrics.performance.throughput,
        confidence: 0.8
      });
    }
    
    // Error rate analysis
    if (metrics.performance.errorRate > this.performanceTargets.errorRate) {
      analysis.risks.push({
        type: 'reliability',
        severity: 'medium',
        value: metrics.performance.errorRate,
        threshold: this.performanceTargets.errorRate
      });
    }
    
    return analysis;
  }

  generateOptimizationActions(analysis, predictions) {
    const actions = [];
    
    // Handle bottlenecks
    analysis.bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'cpu':
          if (this.optimizationState.workers > 16) {
            actions.push({
              type: 'reduce_workers',
              value: Math.max(16, this.optimizationState.workers - 4),
              reason: 'CPU overload',
              impact: 'high'
            });
          }
          break;
          
        case 'memory':
          actions.push({
            type: 'reduce_batch_size',
            value: Math.max(25, this.optimizationState.batchSize * 0.7),
            reason: 'Memory pressure',
            impact: 'medium'
          });
          
          if (!this.optimizationState.cacheEnabled) {
            actions.push({
              type: 'enable_cache_compression',
              value: true,
              reason: 'Memory optimization',
              impact: 'medium'
            });
          }
          break;
      }
    });
    
    // Exploit opportunities
    analysis.opportunities.forEach(opportunity => {
      switch (opportunity.type) {
        case 'throughput':
          if (this.metrics.current.system.cpuUsage < 0.5) {
            actions.push({
              type: 'increase_workers',
              value: Math.min(32, this.optimizationState.workers + 4),
              reason: 'Underutilized resources',
              impact: 'high'
            });
          }
          
          if (this.metrics.current.performance.cacheHitRate < 0.7) {
            actions.push({
              type: 'optimize_cache',
              value: 'predictive',
              reason: 'Low cache hit rate',
              impact: 'medium'
            });
          }
          break;
      }
    });
    
    // Mitigate risks
    analysis.risks.forEach(risk => {
      switch (risk.type) {
        case 'reliability':
          actions.push({
            type: 'increase_retries',
            value: 5,
            reason: 'High error rate',
            impact: 'low'
          });
          
          actions.push({
            type: 'switch_strategy',
            value: 'conservative',
            reason: 'Reliability concerns',
            impact: 'medium'
          });
          break;
      }
    });
    
    // Use predictions to proactively optimize
    if (predictions.cpuSpike && predictions.cpuSpike.probability > 0.7) {
      actions.push({
        type: 'preemptive_scaling',
        value: 'down',
        reason: 'Predicted CPU spike',
        impact: 'preventive'
      });
    }
    
    return actions;
  }

  applyOptimization(action) {
    console.log(`⚡ Applying optimization: ${action.type}`);
    
    switch (action.type) {
      case 'reduce_workers':
        this.optimizationState.workers = action.value;
        this.emit('config_change', { workers: action.value });
        break;
        
      case 'increase_workers':
        this.optimizationState.workers = action.value;
        this.emit('config_change', { workers: action.value });
        break;
        
      case 'reduce_batch_size':
        this.optimizationState.batchSize = Math.round(action.value);
        this.emit('config_change', { batchSize: this.optimizationState.batchSize });
        break;
        
      case 'optimize_cache':
        this.optimizationState.cacheStrategy = action.value;
        this.emit('config_change', { cacheStrategy: action.value });
        break;
        
      case 'switch_strategy':
        this.optimizationState.strategy = action.value;
        this.emit('config_change', { strategy: action.value });
        break;
        
      case 'increase_retries':
        this.optimizationState.retries = action.value;
        this.emit('config_change', { retries: action.value });
        break;
    }
  }

  predictPerformance() {
    if (this.metrics.historical.length < 100) return;
    
    console.log('\n🔮 Generating Performance Predictions...');
    
    const predictions = {
      timestamp: Date.now(),
      horizon: '5_minutes',
      metrics: {}
    };
    
    // Time series analysis for CPU prediction
    predictions.cpuSpike = this.predictCPUSpike();
    
    // Throughput prediction
    predictions.throughput = this.predictThroughput();
    
    // Memory usage prediction
    predictions.memoryUsage = this.predictMemoryUsage();
    
    // Error rate prediction
    predictions.errorRate = this.predictErrorRate();
    
    // Bottleneck prediction
    predictions.bottlenecks = this.predictBottlenecks();
    
    this.metrics.predictions = predictions;
    this.emit('predictions', predictions);
    
    // Alert on high-confidence predictions
    this.alertOnPredictions(predictions);
  }

  predictCPUSpike() {
    const recentCPU = this.metrics.historical
      .slice(-60)
      .map(m => m.system.cpuUsage);
    
    // Simple trend analysis
    const trend = this.calculateTrend(recentCPU);
    const volatility = this.calculateVolatility(recentCPU);
    const current = recentCPU[recentCPU.length - 1];
    
    // Predict spike probability
    const spikeProbability = this.calculateSpikeProbability(current, trend, volatility);
    
    return {
      probability: spikeProbability,
      expectedValue: current + (trend * 5), // 5 minutes ahead
      confidence: Math.max(0, 1 - volatility)
    };
  }

  predictThroughput() {
    const recentThroughput = this.metrics.historical
      .slice(-60)
      .map(m => m.performance.throughput);
    
    // Use exponential smoothing for prediction
    const alpha = 0.3;
    let forecast = recentThroughput[0];
    
    recentThroughput.forEach(value => {
      forecast = alpha * value + (1 - alpha) * forecast;
    });
    
    // Adjust for current optimization state
    const optimizationFactor = this.optimizationState.workers / 32;
    forecast *= optimizationFactor;
    
    return {
      value: Math.round(forecast),
      confidence: 0.75,
      range: {
        min: Math.round(forecast * 0.8),
        max: Math.round(forecast * 1.2)
      }
    };
  }

  predictMemoryUsage() {
    const recentMemory = this.metrics.historical
      .slice(-60)
      .map(m => m.system.memoryUsage);
    
    const trend = this.calculateTrend(recentMemory);
    const current = recentMemory[recentMemory.length - 1];
    
    // Linear projection
    const projected = current + (trend * 5);
    
    return {
      value: Math.min(1, Math.max(0, projected)),
      trend: trend > 0 ? 'increasing' : 'decreasing',
      criticalIn: trend > 0 ? Math.round((0.9 - current) / trend) : null
    };
  }

  predictErrorRate() {
    const recentErrors = this.metrics.historical
      .slice(-60)
      .map(m => m.performance.errorRate);
    
    // Calculate moving average
    const ma = recentErrors.slice(-10).reduce((a, b) => a + b, 0) / 10;
    
    // Detect anomalies
    const stdDev = this.calculateStdDev(recentErrors);
    const isAnomalous = ma > (this.performanceTargets.errorRate + 2 * stdDev);
    
    return {
      value: ma,
      isAnomalous,
      probability: isAnomalous ? 0.8 : 0.2,
      recommendation: isAnomalous ? 'switch_to_conservative_mode' : 'maintain_current'
    };
  }

  predictBottlenecks() {
    const predictions = [];
    
    // CPU bottleneck prediction
    if (this.metrics.predictions.cpuSpike?.probability > 0.6) {
      predictions.push({
        type: 'cpu',
        probability: this.metrics.predictions.cpuSpike.probability,
        timeToImpact: '2-5 minutes',
        severity: 'high'
      });
    }
    
    // Memory bottleneck prediction
    if (this.metrics.predictions.memoryUsage?.criticalIn && 
        this.metrics.predictions.memoryUsage.criticalIn < 10) {
      predictions.push({
        type: 'memory',
        probability: 0.9,
        timeToImpact: `${this.metrics.predictions.memoryUsage.criticalIn} minutes`,
        severity: 'critical'
      });
    }
    
    // Throughput bottleneck prediction
    if (this.metrics.predictions.throughput?.value < this.performanceTargets.throughput * 0.8) {
      predictions.push({
        type: 'throughput',
        probability: 0.7,
        timeToImpact: 'immediate',
        severity: 'medium'
      });
    }
    
    return predictions;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  calculateVolatility(values) {
    const stdDev = this.calculateStdDev(values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return mean > 0 ? stdDev / mean : 0;
  }

  calculateStdDev(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  calculateSpikeProbability(current, trend, volatility) {
    const threshold = this.performanceTargets.cpuUsage;
    const projected = current + (trend * 5);
    
    if (projected > threshold) {
      return Math.min(0.9, 0.5 + volatility + Math.abs(trend) * 10);
    }
    
    return Math.max(0.1, volatility);
  }

  trainModel(metrics) {
    // Simple online learning for performance prediction
    const features = this.extractFeatures(metrics);
    const target = metrics.performance.throughput;
    
    // Update weights using gradient descent
    const prediction = this.predict(features);
    const error = target - prediction;
    
    features.forEach((value, key) => {
      const currentWeight = this.mlModel.weights.get(key) || 0;
      const newWeight = currentWeight + this.mlModel.learningRate * error * value;
      this.mlModel.weights.set(key, newWeight);
    });
    
    // Store training data
    this.mlModel.trainingData.push({ features, target });
    if (this.mlModel.trainingData.length > 1000) {
      this.mlModel.trainingData.shift();
    }
  }

  extractFeatures(metrics) {
    return new Map([
      ['cpu_usage', metrics.system.cpuUsage],
      ['memory_usage', metrics.system.memoryUsage],
      ['workers', this.optimizationState.workers / 32],
      ['batch_size', this.optimizationState.batchSize / 100],
      ['cache_hit_rate', metrics.performance.cacheHitRate || 0],
      ['queue_length', Math.min(1, (metrics.performance.queueLength || 0) / 1000)]
    ]);
  }

  predict(features) {
    let prediction = 0;
    
    features.forEach((value, key) => {
      const weight = this.mlModel.weights.get(key) || 0;
      prediction += weight * value;
    });
    
    return Math.max(0, prediction);
  }

  alertOnPredictions(predictions) {
    // Alert on critical predictions
    predictions.bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'critical' && bottleneck.probability > 0.8) {
        console.warn(`⚠️ CRITICAL: ${bottleneck.type} bottleneck predicted in ${bottleneck.timeToImpact}`);
        this.emit('critical_alert', bottleneck);
      }
    });
    
    // Alert on performance degradation
    if (predictions.throughput?.value < this.performanceTargets.throughput * 0.5) {
      console.warn('⚠️ WARNING: Significant throughput degradation predicted');
      this.emit('performance_alert', {
        type: 'throughput_degradation',
        predicted: predictions.throughput.value,
        target: this.performanceTargets.throughput
      });
    }
  }

  reportOptimization(actions) {
    if (actions.length === 0) {
      console.log('✅ System performing optimally, no actions needed');
      return;
    }
    
    console.log(`\n📋 Applied ${actions.length} optimizations:`);
    actions.forEach(action => {
      console.log(`   - ${action.type}: ${action.reason} (Impact: ${action.impact})`);
    });
    
    // Report current state
    console.log('\n📊 Current Optimization State:');
    console.log(`   Workers: ${this.optimizationState.workers}`);
    console.log(`   Batch Size: ${this.optimizationState.batchSize}`);
    console.log(`   Strategy: ${this.optimizationState.strategy}`);
    console.log(`   Cache: ${this.optimizationState.cacheEnabled ? 'Enabled' : 'Disabled'}`);
  }

  generatePerformanceReport() {
    const current = this.metrics.current;
    const predictions = this.metrics.predictions;
    const historical = this.metrics.historical.slice(-60);
    
    return {
      timestamp: new Date().toISOString(),
      current: {
        throughput: current.performance?.throughput || 0,
        cpuUsage: (current.system?.cpuUsage * 100).toFixed(1) + '%',
        memoryUsage: (current.system?.memoryUsage * 100).toFixed(1) + '%',
        errorRate: (current.performance?.errorRate * 100).toFixed(2) + '%'
      },
      predictions: {
        nextBottleneck: predictions.bottlenecks?.[0] || null,
        throughputForecast: predictions.throughput || null,
        alerts: predictions.bottlenecks?.filter(b => b.severity === 'critical') || []
      },
      optimization: {
        state: this.optimizationState,
        recentActions: this.getRecentActions(),
        effectiveness: this.calculateOptimizationEffectiveness()
      },
      recommendations: this.generateRecommendations()
    };
  }

  calculateOptimizationEffectiveness() {
    if (this.metrics.historical.length < 100) return 'insufficient_data';
    
    const recent = this.metrics.historical.slice(-50);
    const older = this.metrics.historical.slice(-100, -50);
    
    const recentAvg = recent.reduce((sum, m) => sum + (m.performance?.throughput || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + (m.performance?.throughput || 0), 0) / older.length;
    
    const improvement = ((recentAvg - olderAvg) / olderAvg * 100).toFixed(1);
    
    return {
      improvement: improvement + '%',
      rating: improvement > 10 ? 'excellent' : improvement > 0 ? 'good' : 'needs_improvement'
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const current = this.metrics.current;
    
    if (current.system?.cpuUsage > 0.8) {
      recommendations.push({
        priority: 'high',
        action: 'Scale down workers or optimize CPU-intensive operations',
        impact: 'Reduce CPU load by 20-30%'
      });
    }
    
    if (current.performance?.cacheHitRate < 0.5) {
      recommendations.push({
        priority: 'medium',
        action: 'Implement predictive caching for frequently accessed data',
        impact: 'Improve response time by 40%'
      });
    }
    
    if (current.performance?.errorRate > 0.02) {
      recommendations.push({
        priority: 'high',
        action: 'Investigate error patterns and implement targeted fixes',
        impact: 'Reduce errors by 80%'
      });
    }
    
    return recommendations;
  }

  getRecentActions() {
    // This would track actual optimization actions
    return [];
  }

  // Stub methods for metrics calculation
  calculateThroughput() { return Math.random() * 1200 + 800; }
  calculateAvgLatency() { return Math.random() * 20 + 40; }
  calculateP95Latency() { return Math.random() * 50 + 80; }
  calculateErrorRate() { return Math.random() * 0.02; }
  calculateCacheHitRate() { return Math.random() * 0.3 + 0.6; }
  getQueueLength() { return Math.floor(Math.random() * 100); }
  calculateDataCompleteness() { return Math.random() * 0.2 + 0.8; }
  calculateExtractionAccuracy() { return Math.random() * 0.1 + 0.9; }
  calculateDuplicateRate() { return Math.random() * 0.02; }
}

module.exports = RealtimeOptimizer;