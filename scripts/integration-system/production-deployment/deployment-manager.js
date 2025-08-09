// deployment-manager.js
// Production deployment with error recovery and scalable architecture

const EventEmitter = require('events');
const os = require('os');
const cluster = require('cluster');
const { performance } = require('perf_hooks');

class DeploymentManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Deployment environment
      environment: process.env.NODE_ENV || 'production',
      
      // Cluster configuration
      cluster: {
        enabled: true,
        workers: process.env.WORKER_COUNT || os.cpus().length,
        autoRestart: true,
        restartDelay: 5000,
        maxRestarts: 10,
        restartWindow: 60000 // 1 minute
      },
      
      // Health check configuration
      healthCheck: {
        enabled: true,
        interval: 30000, // 30 seconds
        timeout: 10000,
        unhealthyThreshold: 3,
        healthyThreshold: 2,
        endpoints: [
          { type: 'system', check: () => this.checkSystemHealth() },
          { type: 'database', check: () => this.checkDatabaseHealth() },
          { type: 'memory', check: () => this.checkMemoryHealth() },
          { type: 'disk', check: () => this.checkDiskHealth() }
        ]
      },
      
      // Error recovery configuration
      errorRecovery: {
        enabled: true,
        strategies: {
          restart: { maxAttempts: 3, delay: 5000 },
          rollback: { enabled: true, maxVersions: 3 },
          circuitBreaker: { 
            errorThreshold: 5,
            resetTimeout: 60000,
            halfOpenRequests: 3
          }
        },
        errorThresholds: {
          warning: 10,
          critical: 50,
          fatal: 100
        }
      },
      
      // Monitoring configuration
      monitoring: {
        enabled: true,
        metrics: {
          interval: 60000, // 1 minute
          retention: 7 * 24 * 60 * 60 * 1000 // 7 days
        },
        alerts: {
          channels: ['email', 'slack', 'webhook'],
          rules: [
            { metric: 'cpu', operator: '>', threshold: 80, severity: 'warning' },
            { metric: 'memory', operator: '>', threshold: 90, severity: 'critical' },
            { metric: 'errorRate', operator: '>', threshold: 0.05, severity: 'warning' },
            { metric: 'responseTime', operator: '>', threshold: 5000, severity: 'warning' }
          ]
        }
      },
      
      // Scaling configuration
      scaling: {
        enabled: true,
        mode: 'auto', // auto, manual
        minWorkers: 2,
        maxWorkers: os.cpus().length * 2,
        scaleUpThreshold: {
          cpu: 70,
          memory: 80,
          queueSize: 100
        },
        scaleDownThreshold: {
          cpu: 30,
          memory: 40,
          queueSize: 10
        },
        cooldownPeriod: 300000 // 5 minutes
      },
      
      // Deployment configuration
      deployment: {
        strategy: 'rolling', // rolling, blue-green, canary
        rollbackOnFailure: true,
        healthCheckGracePeriod: 30000,
        maxSurge: 1,
        maxUnavailable: 0
      },
      
      // Resource limits
      resources: {
        maxMemory: process.env.MAX_MEMORY || '2G',
        maxCpu: process.env.MAX_CPU || '100%',
        maxConnections: 10000,
        requestTimeout: 300000 // 5 minutes
      },
      
      ...config
    };

    // State management
    this.state = {
      status: 'initializing',
      workers: new Map(),
      health: {
        overall: 'unknown',
        checks: new Map()
      },
      metrics: {
        cpu: 0,
        memory: 0,
        uptime: 0,
        requests: 0,
        errors: 0,
        responseTime: []
      },
      errors: {
        count: 0,
        recent: [],
        byType: {}
      },
      scaling: {
        currentWorkers: 0,
        lastScaleAction: null,
        cooldownUntil: null
      },
      deployment: {
        version: process.env.APP_VERSION || '1.0.0',
        deployedAt: Date.now(),
        rollbackHistory: []
      }
    };

    // Circuit breakers
    this.circuitBreakers = new Map();
    
    // Worker restart tracking
    this.workerRestarts = new Map();
    
    // Initialize deployment manager
    this.initialize();
  }

  async initialize() {
    console.log('🚀 Initializing production deployment manager');
    
    try {
      // Setup process handlers
      this.setupProcessHandlers();
      
      // Initialize monitoring
      if (this.config.monitoring.enabled) {
        await this.initializeMonitoring();
      }
      
      // Initialize health checks
      if (this.config.healthCheck.enabled) {
        this.startHealthChecks();
      }
      
      // Initialize cluster if enabled
      if (this.config.cluster.enabled && cluster.isMaster) {
        await this.initializeCluster();
      } else if (cluster.isWorker) {
        await this.initializeWorker();
      } else {
        // Single process mode
        await this.initializeSingleProcess();
      }
      
      this.state.status = 'running';
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize deployment manager:', error);
      this.state.status = 'failed';
      throw error;
    }
  }

  async initializeCluster() {
    console.log(`🔧 Setting up cluster with ${this.config.cluster.workers} workers`);
    
    // Fork initial workers
    for (let i = 0; i < this.config.cluster.workers; i++) {
      this.forkWorker();
    }
    
    // Handle worker events
    cluster.on('exit', (worker, code, signal) => {
      this.handleWorkerExit(worker, code, signal);
    });
    
    cluster.on('message', (worker, message) => {
      this.handleWorkerMessage(worker, message);
    });
    
    // Start auto-scaling if enabled
    if (this.config.scaling.enabled) {
      this.startAutoScaling();
    }
  }

  forkWorker() {
    const worker = cluster.fork({
      ...process.env,
      WORKER_ID: Date.now().toString(36)
    });
    
    this.state.workers.set(worker.id, {
      id: worker.id,
      pid: worker.process.pid,
      startTime: Date.now(),
      status: 'starting',
      metrics: {
        cpu: 0,
        memory: 0,
        requests: 0,
        errors: 0
      }
    });
    
    this.state.scaling.currentWorkers++;
    
    // Setup worker timeout
    const timeout = setTimeout(() => {
      if (this.state.workers.get(worker.id)?.status === 'starting') {
        console.error(`Worker ${worker.id} failed to start`);
        worker.kill();
      }
    }, 30000);
    
    worker.once('online', () => {
      clearTimeout(timeout);
      const workerState = this.state.workers.get(worker.id);
      if (workerState) {
        workerState.status = 'online';
      }
      console.log(`✅ Worker ${worker.id} is online`);
    });
    
    return worker;
  }

  handleWorkerExit(worker, code, signal) {
    console.log(`Worker ${worker.id} exited (code: ${code}, signal: ${signal})`);
    
    const workerState = this.state.workers.get(worker.id);
    this.state.workers.delete(worker.id);
    this.state.scaling.currentWorkers--;
    
    // Track worker restarts
    const restartKey = worker.id;
    const restarts = this.workerRestarts.get(restartKey) || [];
    const now = Date.now();
    
    // Remove old restart entries
    const recentRestarts = restarts.filter(time => 
      now - time < this.config.cluster.restartWindow
    );
    
    recentRestarts.push(now);
    this.workerRestarts.set(restartKey, recentRestarts);
    
    // Check if we should restart
    if (this.config.cluster.autoRestart && 
        recentRestarts.length < this.config.cluster.maxRestarts &&
        this.state.status === 'running') {
      
      console.log(`Restarting worker in ${this.config.cluster.restartDelay}ms`);
      
      setTimeout(() => {
        if (this.state.status === 'running') {
          this.forkWorker();
        }
      }, this.config.cluster.restartDelay);
      
    } else if (recentRestarts.length >= this.config.cluster.maxRestarts) {
      console.error(`Worker restart limit reached (${this.config.cluster.maxRestarts})`);
      this.handleCriticalError(new Error('Worker restart limit exceeded'));
    }
    
    // Log error if unexpected exit
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      this.recordError({
        type: 'worker_crash',
        worker: worker.id,
        code,
        signal,
        message: `Worker ${worker.id} crashed unexpectedly`
      });
    }
  }

  handleWorkerMessage(worker, message) {
    if (message.type === 'metrics') {
      this.updateWorkerMetrics(worker.id, message.data);
    } else if (message.type === 'error') {
      this.recordError(message.data);
    } else if (message.type === 'health') {
      this.updateWorkerHealth(worker.id, message.data);
    }
  }

  async initializeWorker() {
    console.log(`👷 Worker ${process.pid} initializing`);
    
    // Setup worker-specific handlers
    process.on('message', (message) => {
      if (message.cmd === 'shutdown') {
        this.gracefulShutdown();
      }
    });
    
    // Send periodic metrics to master
    setInterval(() => {
      process.send({
        type: 'metrics',
        data: this.collectWorkerMetrics()
      });
    }, 30000);
    
    // Initialize application components
    await this.initializeApplication();
  }

  async initializeSingleProcess() {
    console.log('🔲 Running in single process mode');
    await this.initializeApplication();
  }

  async initializeApplication() {
    // This is where you would initialize your actual application
    // For now, we'll set up the integration system components
    
    const ControlPanel = require('../user-interface/control-panel');
    const DatabaseManager = require('../database-architecture/database-manager');
    const AnalyticsEngine = require('../logging-analytics/analytics-engine');
    const LoggerSystem = require('../logging-analytics/logger-system');
    
    // Initialize components with error recovery
    try {
      // Logger system
      this.logger = new LoggerSystem({
        logLevel: this.config.environment === 'production' ? 'info' : 'debug'
      });
      
      // Database manager
      this.database = new DatabaseManager({
        pool: { max: 20, min: 5 }
      });
      await this.database.initialize();
      
      // Analytics engine
      this.analytics = new AnalyticsEngine({
        alerting: { enabled: true }
      });
      
      // Control panel
      this.controlPanel = new ControlPanel({
        port: process.env.PORT || 3000
      });
      
      // Wire up components
      this.controlPanel.setSystem({
        database: this.database,
        analytics: this.analytics,
        logger: this.logger
      });
      
      console.log('✅ Application initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }

  async initializeMonitoring() {
    console.log('📊 Initializing monitoring system');
    
    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metrics.interval);
    
    // Initialize alert manager
    this.alertManager = new AlertManager(this.config.monitoring.alerts);
    
    // Subscribe to metrics for alerting
    this.on('metrics', (metrics) => {
      this.checkAlertRules(metrics);
    });
  }

  startHealthChecks() {
    console.log('💓 Starting health checks');
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheck.interval);
    
    // Perform initial health check
    this.performHealthChecks();
  }

  async performHealthChecks() {
    const results = new Map();
    let overallHealth = 'healthy';
    
    for (const endpoint of this.config.healthCheck.endpoints) {
      try {
        const startTime = performance.now();
        const result = await Promise.race([
          endpoint.check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 
                     this.config.healthCheck.timeout)
          )
        ]);
        
        const duration = performance.now() - startTime;
        
        results.set(endpoint.type, {
          status: result.status || 'healthy',
          message: result.message,
          duration,
          lastCheck: Date.now()
        });
        
        if (result.status === 'unhealthy') {
          overallHealth = 'degraded';
        }
        
      } catch (error) {
        results.set(endpoint.type, {
          status: 'unhealthy',
          message: error.message,
          lastCheck: Date.now()
        });
        overallHealth = 'unhealthy';
      }
    }
    
    // Update health state
    this.state.health.checks = results;
    this.state.health.overall = overallHealth;
    
    // Emit health status
    this.emit('health', {
      overall: overallHealth,
      checks: Object.fromEntries(results)
    });
    
    // Handle unhealthy state
    if (overallHealth === 'unhealthy') {
      this.handleUnhealthyState();
    }
  }

  async checkSystemHealth() {
    const cpu = os.loadavg()[0] / os.cpus().length;
    const memoryUsage = 1 - (os.freemem() / os.totalmem());
    
    if (cpu > 0.9 || memoryUsage > 0.95) {
      return { status: 'unhealthy', message: 'High resource usage' };
    }
    
    return { status: 'healthy' };
  }

  async checkDatabaseHealth() {
    if (!this.database) {
      return { status: 'unhealthy', message: 'Database not initialized' };
    }
    
    try {
      await this.database.query('SELECT 1');
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async checkMemoryHealth() {
    const usage = process.memoryUsage();
    const limit = this.parseMemoryLimit(this.config.resources.maxMemory);
    
    if (usage.heapUsed > limit * 0.9) {
      return { status: 'unhealthy', message: 'Memory usage too high' };
    }
    
    return { status: 'healthy' };
  }

  async checkDiskHealth() {
    // Implement disk space check
    // For now, return healthy
    return { status: 'healthy' };
  }

  collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      cpu: this.getCpuUsage(),
      memory: this.getMemoryUsage(),
      uptime: process.uptime(),
      workers: this.state.scaling.currentWorkers,
      requests: this.state.metrics.requests,
      errors: this.state.metrics.errors,
      errorRate: this.state.metrics.requests > 0 ? 
        this.state.metrics.errors / this.state.metrics.requests : 0,
      responseTime: this.calculateAverageResponseTime(),
      health: this.state.health.overall
    };
    
    // Update state
    Object.assign(this.state.metrics, metrics);
    
    // Emit metrics event
    this.emit('metrics', metrics);
    
    // Store metrics for historical analysis
    this.storeMetrics(metrics);
    
    return metrics;
  }

  collectWorkerMetrics() {
    return {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  updateWorkerMetrics(workerId, metrics) {
    const worker = this.state.workers.get(workerId);
    if (worker) {
      Object.assign(worker.metrics, metrics);
    }
  }

  getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    return ((totalTick - totalIdle) / totalTick) * 100;
  }

  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    return ((total - free) / total) * 100;
  }

  calculateAverageResponseTime() {
    if (this.state.metrics.responseTime.length === 0) return 0;
    
    const sum = this.state.metrics.responseTime.reduce((a, b) => a + b, 0);
    return sum / this.state.metrics.responseTime.length;
  }

  checkAlertRules(metrics) {
    for (const rule of this.config.monitoring.alerts.rules) {
      const value = metrics[rule.metric];
      if (value === undefined) continue;
      
      let triggered = false;
      
      switch (rule.operator) {
        case '>':
          triggered = value > rule.threshold;
          break;
        case '<':
          triggered = value < rule.threshold;
          break;
        case '>=':
          triggered = value >= rule.threshold;
          break;
        case '<=':
          triggered = value <= rule.threshold;
          break;
        case '==':
          triggered = value === rule.threshold;
          break;
      }
      
      if (triggered) {
        this.triggerAlert({
          rule,
          value,
          severity: rule.severity,
          message: `${rule.metric} ${rule.operator} ${rule.threshold} (current: ${value})`
        });
      }
    }
  }

  triggerAlert(alert) {
    console.warn(`🚨 Alert triggered: ${alert.message}`);
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Send to alert channels
    if (this.alertManager) {
      this.alertManager.send(alert);
    }
  }

  startAutoScaling() {
    console.log('⚖️ Starting auto-scaling monitor');
    
    this.scalingInterval = setInterval(() => {
      this.evaluateScaling();
    }, 60000); // Check every minute
  }

  async evaluateScaling() {
    // Check if in cooldown period
    if (this.state.scaling.cooldownUntil && 
        Date.now() < this.state.scaling.cooldownUntil) {
      return;
    }
    
    const metrics = this.state.metrics;
    const currentWorkers = this.state.scaling.currentWorkers;
    
    // Check scale up conditions
    if (currentWorkers < this.config.scaling.maxWorkers) {
      if (metrics.cpu > this.config.scaling.scaleUpThreshold.cpu ||
          metrics.memory > this.config.scaling.scaleUpThreshold.memory) {
        
        await this.scaleUp();
      }
    }
    
    // Check scale down conditions
    if (currentWorkers > this.config.scaling.minWorkers) {
      if (metrics.cpu < this.config.scaling.scaleDownThreshold.cpu &&
          metrics.memory < this.config.scaling.scaleDownThreshold.memory) {
        
        await this.scaleDown();
      }
    }
  }

  async scaleUp() {
    console.log('📈 Scaling up - adding worker');
    
    this.forkWorker();
    
    this.state.scaling.lastScaleAction = {
      type: 'up',
      timestamp: Date.now(),
      workers: this.state.scaling.currentWorkers
    };
    
    this.state.scaling.cooldownUntil = Date.now() + this.config.scaling.cooldownPeriod;
    
    this.emit('scaled', {
      direction: 'up',
      workers: this.state.scaling.currentWorkers
    });
  }

  async scaleDown() {
    console.log('📉 Scaling down - removing worker');
    
    // Find least busy worker
    let targetWorker = null;
    let minRequests = Infinity;
    
    for (const [id, worker] of this.state.workers) {
      if (worker.metrics.requests < minRequests) {
        minRequests = worker.metrics.requests;
        targetWorker = id;
      }
    }
    
    if (targetWorker && cluster.workers[targetWorker]) {
      cluster.workers[targetWorker].disconnect();
      
      setTimeout(() => {
        if (cluster.workers[targetWorker]) {
          cluster.workers[targetWorker].kill();
        }
      }, 30000); // Give 30 seconds for graceful shutdown
    }
    
    this.state.scaling.lastScaleAction = {
      type: 'down',
      timestamp: Date.now(),
      workers: this.state.scaling.currentWorkers
    };
    
    this.state.scaling.cooldownUntil = Date.now() + this.config.scaling.cooldownPeriod;
    
    this.emit('scaled', {
      direction: 'down',
      workers: this.state.scaling.currentWorkers
    });
  }

  recordError(error) {
    this.state.errors.count++;
    
    // Track by error type
    const errorType = error.type || 'unknown';
    this.state.errors.byType[errorType] = 
      (this.state.errors.byType[errorType] || 0) + 1;
    
    // Keep recent errors
    this.state.errors.recent.unshift({
      ...error,
      timestamp: Date.now()
    });
    
    if (this.state.errors.recent.length > 100) {
      this.state.errors.recent = this.state.errors.recent.slice(0, 100);
    }
    
    // Check error thresholds
    this.checkErrorThresholds();
    
    // Log error
    if (this.logger) {
      this.logger.error(error.message || 'Unknown error', error);
    }
  }

  checkErrorThresholds() {
    const errorCount = this.state.errors.count;
    const thresholds = this.config.errorRecovery.errorThresholds;
    
    if (errorCount >= thresholds.fatal) {
      this.handleFatalError();
    } else if (errorCount >= thresholds.critical) {
      this.handleCriticalError(new Error('Critical error threshold reached'));
    } else if (errorCount >= thresholds.warning) {
      this.triggerAlert({
        severity: 'warning',
        message: `Error count warning: ${errorCount} errors`
      });
    }
  }

  async handleCriticalError(error) {
    console.error('💀 Critical error:', error.message);
    
    // Try recovery strategies
    if (this.config.errorRecovery.enabled) {
      try {
        await this.executeRecoveryStrategy('restart');
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
        await this.executeRecoveryStrategy('rollback');
      }
    }
  }

  async handleFatalError() {
    console.error('☠️ Fatal error threshold reached - shutting down');
    
    this.state.status = 'failed';
    
    // Emit fatal event
    this.emit('fatal');
    
    // Attempt graceful shutdown
    await this.gracefulShutdown();
    
    // Exit process
    process.exit(1);
  }

  async executeRecoveryStrategy(strategy) {
    console.log(`🚑 Executing recovery strategy: ${strategy}`);
    
    switch (strategy) {
      case 'restart':
        await this.restartApplication();
        break;
        
      case 'rollback':
        await this.rollbackDeployment();
        break;
        
      case 'circuit_breaker':
        this.enableCircuitBreaker();
        break;
        
      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`);
    }
  }

  async restartApplication() {
    // In cluster mode, restart workers
    if (cluster.isMaster) {
      for (const id in cluster.workers) {
        cluster.workers[id].disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.forkWorker();
      }
    } else {
      // In single process mode, exit and let process manager restart
      process.exit(1);
    }
  }

  async rollbackDeployment() {
    if (this.state.deployment.rollbackHistory.length === 0) {
      throw new Error('No rollback history available');
    }
    
    const previousVersion = this.state.deployment.rollbackHistory[0];
    console.log(`Rolling back to version: ${previousVersion.version}`);
    
    // Implement actual rollback logic here
    // This would typically involve:
    // 1. Switching to previous code version
    // 2. Restoring previous configuration
    // 3. Restarting services
    
    this.state.deployment.version = previousVersion.version;
    this.state.deployment.deployedAt = Date.now();
    
    await this.restartApplication();
  }

  enableCircuitBreaker() {
    // Implement circuit breaker pattern
    console.log('🔌 Circuit breaker enabled');
    
    this.circuitBreakers.set('main', {
      state: 'open',
      failures: 0,
      lastFailure: Date.now(),
      nextAttempt: Date.now() + this.config.errorRecovery.strategies.circuitBreaker.resetTimeout
    });
  }

  handleUnhealthyState() {
    console.warn('⚠️ Application in unhealthy state');
    
    // Emit unhealthy event
    this.emit('unhealthy', this.state.health);
    
    // Take corrective action based on health checks
    const unhealthyChecks = Array.from(this.state.health.checks.entries())
      .filter(([_, check]) => check.status === 'unhealthy');
    
    for (const [type, check] of unhealthyChecks) {
      this.handleUnhealthyCheck(type, check);
    }
  }

  handleUnhealthyCheck(type, check) {
    switch (type) {
      case 'memory':
        this.handleMemoryPressure();
        break;
      case 'database':
        this.handleDatabaseFailure();
        break;
      default:
        console.error(`Unhealthy check: ${type} - ${check.message}`);
    }
  }

  handleMemoryPressure() {
    console.warn('🧠 Memory pressure detected');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Emit memory pressure event
    this.emit('memory_pressure');
  }

  handleDatabaseFailure() {
    console.error('💾 Database failure detected');
    
    // Enable circuit breaker for database
    this.circuitBreakers.set('database', {
      state: 'open',
      failures: 0,
      lastFailure: Date.now(),
      nextAttempt: Date.now() + 60000 // 1 minute
    });
    
    // Emit database failure event
    this.emit('database_failure');
  }

  setupProcessHandlers() {
    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`Received ${signal}, starting graceful shutdown`);
      await this.gracefulShutdown();
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      this.recordError({
        type: 'uncaught_exception',
        message: error.message,
        stack: error.stack
      });
      
      // Give time for error to be logged
      setTimeout(() => process.exit(1), 1000);
    });
    
    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection:', reason);
      this.recordError({
        type: 'unhandled_rejection',
        reason: reason?.toString(),
        promise: promise?.toString()
      });
    });
  }

  async gracefulShutdown() {
    console.log('🛑 Starting graceful shutdown');
    
    this.state.status = 'shutting_down';
    
    // Stop accepting new work
    this.emit('shutdown');
    
    // Clear intervals
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.scalingInterval) clearInterval(this.scalingInterval);
    
    // Shutdown workers gracefully
    if (cluster.isMaster) {
      for (const id in cluster.workers) {
        cluster.workers[id].send({ cmd: 'shutdown' });
      }
      
      // Wait for workers to exit
      await new Promise(resolve => {
        const checkWorkers = setInterval(() => {
          if (Object.keys(cluster.workers).length === 0) {
            clearInterval(checkWorkers);
            resolve();
          }
        }, 100);
        
        // Force kill after timeout
        setTimeout(() => {
          for (const id in cluster.workers) {
            cluster.workers[id].kill();
          }
          clearInterval(checkWorkers);
          resolve();
        }, 30000);
      });
    }
    
    // Cleanup resources
    if (this.database) {
      await this.database.close();
    }
    
    if (this.controlPanel) {
      this.controlPanel.shutdown();
    }
    
    console.log('✅ Graceful shutdown complete');
  }

  parseMemoryLimit(limit) {
    const match = limit.match(/^(\d+)([KMG])?$/i);
    if (!match) return 2 * 1024 * 1024 * 1024; // Default 2GB
    
    const value = parseInt(match[1]);
    const unit = match[2]?.toUpperCase();
    
    switch (unit) {
      case 'K': return value * 1024;
      case 'M': return value * 1024 * 1024;
      case 'G': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  storeMetrics(metrics) {
    // In production, this would store to time-series database
    // For now, emit event for external storage
    this.emit('store_metrics', metrics);
  }

  // Public API
  getStatus() {
    return {
      status: this.state.status,
      health: this.state.health,
      metrics: this.state.metrics,
      workers: Array.from(this.state.workers.values()),
      errors: {
        count: this.state.errors.count,
        recent: this.state.errors.recent.slice(0, 10)
      },
      deployment: this.state.deployment
    };
  }

  getMetrics() {
    return this.state.metrics;
  }

  getHealth() {
    return this.state.health;
  }

  async deploy(version, options = {}) {
    console.log(`🚀 Deploying version ${version}`);
    
    // Store current version in rollback history
    this.state.deployment.rollbackHistory.unshift({
      version: this.state.deployment.version,
      deployedAt: this.state.deployment.deployedAt
    });
    
    // Keep only configured number of rollback versions
    if (this.state.deployment.rollbackHistory.length > 
        this.config.errorRecovery.strategies.rollback.maxVersions) {
      this.state.deployment.rollbackHistory.pop();
    }
    
    // Update deployment state
    this.state.deployment.version = version;
    this.state.deployment.deployedAt = Date.now();
    
    // Perform deployment based on strategy
    switch (this.config.deployment.strategy) {
      case 'rolling':
        await this.rollingDeploy(options);
        break;
      case 'blue-green':
        await this.blueGreenDeploy(options);
        break;
      case 'canary':
        await this.canaryDeploy(options);
        break;
    }
    
    this.emit('deployed', {
      version,
      strategy: this.config.deployment.strategy,
      timestamp: Date.now()
    });
  }

  async rollingDeploy(options) {
    // Implement rolling deployment
    console.log('Performing rolling deployment');
    
    if (cluster.isMaster) {
      const workers = Object.keys(cluster.workers);
      const batchSize = Math.ceil(workers.length / 3); // Deploy in 3 batches
      
      for (let i = 0; i < workers.length; i += batchSize) {
        const batch = workers.slice(i, i + batchSize);
        
        for (const workerId of batch) {
          cluster.workers[workerId].disconnect();
          await new Promise(resolve => setTimeout(resolve, 5000));
          this.forkWorker();
        }
        
        // Wait for health check
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Check health
        await this.performHealthChecks();
        if (this.state.health.overall === 'unhealthy') {
          console.error('Deployment failed health check');
          if (this.config.deployment.rollbackOnFailure) {
            await this.rollbackDeployment();
          }
          throw new Error('Deployment failed');
        }
      }
    }
  }

  async blueGreenDeploy(options) {
    // Implement blue-green deployment
    console.log('Blue-green deployment not yet implemented');
  }

  async canaryDeploy(options) {
    // Implement canary deployment
    console.log('Canary deployment not yet implemented');
  }
}

// Alert Manager class
class AlertManager {
  constructor(config) {
    this.config = config;
    this.channels = new Map();
    
    // Initialize channels
    this.initializeChannels();
  }

  initializeChannels() {
    for (const channel of this.config.channels) {
      switch (channel) {
        case 'email':
          // Initialize email channel
          break;
        case 'slack':
          // Initialize Slack channel
          break;
        case 'webhook':
          // Initialize webhook channel
          break;
      }
    }
  }

  async send(alert) {
    for (const [name, channel] of this.channels) {
      try {
        await channel.send(alert);
      } catch (error) {
        console.error(`Failed to send alert via ${name}:`, error);
      }
    }
  }
}

module.exports = DeploymentManager;