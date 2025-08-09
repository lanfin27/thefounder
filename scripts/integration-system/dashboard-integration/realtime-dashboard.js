// realtime-dashboard.js
// Real-time dashboard integration with WebSocket support

const EventEmitter = require('events');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

class RealtimeDashboard extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      port: 3001,
      updateInterval: 1000, // 1 second
      historySize: 1000,
      metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        errorRate: 0.1,
        successRate: 0.8,
        responseTime: 5000,
        cpuUsage: 80,
        memoryUsage: 80
      },
      ...config
    };

    // Express app setup
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });

    // Real-time metrics storage
    this.metrics = {
      current: {
        activeSessions: 0,
        successRate: 1.0,
        errorRate: 0,
        avgResponseTime: 0,
        dataExtracted: 0,
        proxiesHealthy: 0,
        adaptationsApplied: 0
      },
      history: {
        timestamps: [],
        successRates: [],
        errorRates: [],
        responseTimes: [],
        dataExtraction: [],
        sessionCounts: []
      },
      aggregated: {
        hourly: new Map(),
        daily: new Map()
      }
    };

    // Active strategies tracking
    this.strategies = {
      current: null,
      history: [],
      performance: new Map()
    };

    // System health indicators
    this.health = {
      status: 'healthy',
      components: {
        proxy: { status: 'healthy', details: {} },
        browser: { status: 'healthy', details: {} },
        extractor: { status: 'healthy', details: {} },
        database: { status: 'healthy', details: {} }
      },
      alerts: []
    };

    // Connected clients
    this.clients = new Set();

    // Initialize dashboard
    this.initialize();
  }

  initialize() {
    // Setup Express routes
    this.setupRoutes();
    
    // Setup WebSocket handlers
    this.setupWebSocket();
    
    // Start metric collection
    this.startMetricCollection();
    
    // Start server
    this.server.listen(this.config.port, () => {
      console.log(`📊 Dashboard running at http://localhost:${this.config.port}`);
    });
  }

  setupRoutes() {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());

    // API endpoints
    this.app.get('/api/metrics/current', (req, res) => {
      res.json(this.metrics.current);
    });

    this.app.get('/api/metrics/history', (req, res) => {
      const { period = '1h' } = req.query;
      res.json(this.getHistoricalMetrics(period));
    });

    this.app.get('/api/strategies', (req, res) => {
      res.json({
        current: this.strategies.current,
        history: this.strategies.history.slice(-10),
        performance: Array.from(this.strategies.performance.entries())
      });
    });

    this.app.get('/api/health', (req, res) => {
      res.json(this.health);
    });

    this.app.get('/api/alerts', (req, res) => {
      res.json(this.health.alerts);
    });

    this.app.post('/api/alerts/acknowledge/:id', (req, res) => {
      const alertId = req.params.id;
      this.acknowledgeAlert(alertId);
      res.json({ success: true });
    });

    this.app.get('/api/sessions', (req, res) => {
      res.json(this.getActiveSessions());
    });

    this.app.get('/api/export', (req, res) => {
      const { format = 'json', period = '24h' } = req.query;
      const data = this.exportMetrics(period, format);
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=metrics_${Date.now()}.${format}`);
      res.send(data);
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('📱 New dashboard client connected');
      
      // Add to clients
      this.clients.add(ws);
      
      // Send initial state
      ws.send(JSON.stringify({
        type: 'initial',
        data: {
          metrics: this.metrics,
          strategies: this.strategies,
          health: this.health
        }
      }));
      
      // Handle client messages
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message);
          this.handleClientMessage(ws, msg);
        } catch (error) {
          console.error('Invalid message from client:', error);
        }
      });
      
      // Handle disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('📱 Dashboard client disconnected');
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  handleClientMessage(ws, message) {
    switch (message.type) {
      case 'subscribe':
        // Client wants specific updates
        ws.subscriptions = message.channels || ['all'];
        break;
        
      case 'command':
        // Handle dashboard commands
        this.handleCommand(message.command, message.params)
          .then(result => {
            ws.send(JSON.stringify({
              type: 'command_result',
              command: message.command,
              result
            }));
          })
          .catch(error => {
            ws.send(JSON.stringify({
              type: 'command_error',
              command: message.command,
              error: error.message
            }));
          });
        break;
        
      case 'query':
        // Handle data queries
        const result = this.handleQuery(message.query, message.params);
        ws.send(JSON.stringify({
          type: 'query_result',
          query: message.query,
          result
        }));
        break;
    }
  }

  startMetricCollection() {
    // Collect metrics at regular intervals
    setInterval(() => {
      this.collectMetrics();
      this.broadcastUpdate('metrics', this.metrics.current);
    }, this.config.updateInterval);
    
    // Aggregate metrics hourly
    setInterval(() => {
      this.aggregateMetrics('hourly');
    }, 60 * 60 * 1000);
    
    // Clean old metrics daily
    setInterval(() => {
      this.cleanOldMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  collectMetrics() {
    // Update history
    const now = Date.now();
    
    this.metrics.history.timestamps.push(now);
    this.metrics.history.successRates.push(this.metrics.current.successRate);
    this.metrics.history.errorRates.push(this.metrics.current.errorRate);
    this.metrics.history.responseTimes.push(this.metrics.current.avgResponseTime);
    this.metrics.history.dataExtraction.push(this.metrics.current.dataExtracted);
    this.metrics.history.sessionCounts.push(this.metrics.current.activeSessions);
    
    // Trim history to size limit
    if (this.metrics.history.timestamps.length > this.config.historySize) {
      Object.keys(this.metrics.history).forEach(key => {
        this.metrics.history[key] = this.metrics.history[key].slice(-this.config.historySize);
      });
    }
    
    // Check for alerts
    this.checkAlertConditions();
  }

  checkAlertConditions() {
    const { current } = this.metrics;
    const { alertThresholds } = this.config;
    
    // Error rate alert
    if (current.errorRate > alertThresholds.errorRate) {
      this.createAlert('high_error_rate', {
        severity: 'warning',
        message: `Error rate (${(current.errorRate * 100).toFixed(1)}%) exceeds threshold`,
        value: current.errorRate,
        threshold: alertThresholds.errorRate
      });
    }
    
    // Success rate alert
    if (current.successRate < alertThresholds.successRate) {
      this.createAlert('low_success_rate', {
        severity: 'warning',
        message: `Success rate (${(current.successRate * 100).toFixed(1)}%) below threshold`,
        value: current.successRate,
        threshold: alertThresholds.successRate
      });
    }
    
    // Response time alert
    if (current.avgResponseTime > alertThresholds.responseTime) {
      this.createAlert('slow_response', {
        severity: 'warning',
        message: `Average response time (${current.avgResponseTime}ms) exceeds threshold`,
        value: current.avgResponseTime,
        threshold: alertThresholds.responseTime
      });
    }
  }

  createAlert(type, data) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      acknowledged: false,
      ...data
    };
    
    // Add to alerts
    this.health.alerts.push(alert);
    
    // Keep only recent alerts
    this.health.alerts = this.health.alerts.slice(-50);
    
    // Broadcast alert
    this.broadcastUpdate('alert', alert);
    
    // Emit event
    this.emit('alert', alert);
  }

  acknowledgeAlert(alertId) {
    const alert = this.health.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
    }
  }

  broadcastUpdate(type, data) {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this type
        if (!client.subscriptions || 
            client.subscriptions.includes('all') || 
            client.subscriptions.includes(type)) {
          client.send(message);
        }
      }
    });
  }

  // Update methods called by the main system
  updateMetrics(updates) {
    Object.assign(this.metrics.current, updates);
    
    // Calculate derived metrics
    if (updates.totalRequests && updates.successfulRequests) {
      this.metrics.current.successRate = updates.successfulRequests / updates.totalRequests;
      this.metrics.current.errorRate = 1 - this.metrics.current.successRate;
    }
  }

  updateStrategy(strategy) {
    // Record strategy change
    this.strategies.history.push({
      strategy: strategy.name,
      timestamp: Date.now(),
      reason: strategy.reason,
      confidence: strategy.confidence
    });
    
    this.strategies.current = strategy;
    
    // Update performance metrics
    if (!this.strategies.performance.has(strategy.name)) {
      this.strategies.performance.set(strategy.name, {
        uses: 0,
        successes: 0,
        avgPerformance: 0
      });
    }
    
    const perf = this.strategies.performance.get(strategy.name);
    perf.uses++;
    
    this.broadcastUpdate('strategy', this.strategies);
  }

  updateHealth(component, status, details = {}) {
    this.health.components[component] = { status, details, lastUpdate: Date.now() };
    
    // Update overall health
    const statuses = Object.values(this.health.components).map(c => c.status);
    if (statuses.includes('critical')) {
      this.health.status = 'critical';
    } else if (statuses.includes('degraded')) {
      this.health.status = 'degraded';
    } else {
      this.health.status = 'healthy';
    }
    
    this.broadcastUpdate('health', this.health);
  }

  recordSession(session) {
    // Track session performance
    const sessionMetrics = {
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime || Date.now(),
      duration: (session.endTime || Date.now()) - session.startTime,
      dataExtracted: session.dataExtracted,
      errors: session.errors,
      strategy: session.strategy,
      proxy: session.proxy
    };
    
    // Update strategy performance
    if (session.strategy && this.strategies.performance.has(session.strategy)) {
      const perf = this.strategies.performance.get(session.strategy);
      if (session.success) {
        perf.successes++;
      }
      perf.avgPerformance = (perf.avgPerformance * (perf.uses - 1) + sessionMetrics.duration) / perf.uses;
    }
    
    this.broadcastUpdate('session', sessionMetrics);
  }

  getHistoricalMetrics(period) {
    const now = Date.now();
    const durations = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - (durations[period] || durations['1h']);
    const { history } = this.metrics;
    
    // Find starting index
    let startIdx = 0;
    for (let i = history.timestamps.length - 1; i >= 0; i--) {
      if (history.timestamps[i] < cutoff) {
        startIdx = i + 1;
        break;
      }
    }
    
    return {
      timestamps: history.timestamps.slice(startIdx),
      successRates: history.successRates.slice(startIdx),
      errorRates: history.errorRates.slice(startIdx),
      responseTimes: history.responseTimes.slice(startIdx),
      dataExtraction: history.dataExtraction.slice(startIdx),
      sessionCounts: history.sessionCounts.slice(startIdx)
    };
  }

  aggregateMetrics(interval) {
    const now = Date.now();
    const { current } = this.metrics;
    
    const key = interval === 'hourly' 
      ? new Date(now).toISOString().slice(0, 13) // YYYY-MM-DDTHH
      : new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD
    
    const aggregated = {
      timestamp: now,
      avgSuccessRate: current.successRate,
      avgErrorRate: current.errorRate,
      avgResponseTime: current.avgResponseTime,
      totalDataExtracted: current.dataExtracted,
      maxSessions: current.activeSessions
    };
    
    this.metrics.aggregated[interval].set(key, aggregated);
    
    // Clean old aggregated data
    const maxAge = interval === 'hourly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    for (const [k, v] of this.metrics.aggregated[interval]) {
      if (now - v.timestamp > maxAge) {
        this.metrics.aggregated[interval].delete(k);
      }
    }
  }

  cleanOldMetrics() {
    const cutoff = Date.now() - this.config.metricsRetention;
    
    // Clean alerts
    this.health.alerts = this.health.alerts.filter(a => a.timestamp > cutoff);
    
    // Clean strategy history
    this.strategies.history = this.strategies.history.filter(s => s.timestamp > cutoff);
  }

  async handleCommand(command, params) {
    switch (command) {
      case 'pause_collection':
        this.emit('command', { command: 'pause' });
        return { success: true, message: 'Collection paused' };
        
      case 'resume_collection':
        this.emit('command', { command: 'resume' });
        return { success: true, message: 'Collection resumed' };
        
      case 'adjust_concurrency':
        this.emit('command', { command: 'adjust_concurrency', value: params.value });
        return { success: true, message: `Concurrency adjusted to ${params.value}` };
        
      case 'force_rotation':
        this.emit('command', { command: 'rotate_proxies' });
        return { success: true, message: 'Proxy rotation initiated' };
        
      case 'clear_alerts':
        this.health.alerts = [];
        return { success: true, message: 'Alerts cleared' };
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  handleQuery(query, params) {
    switch (query) {
      case 'top_strategies':
        return Array.from(this.strategies.performance.entries())
          .sort((a, b) => b[1].successes - a[1].successes)
          .slice(0, params.limit || 10);
        
      case 'error_distribution':
        // Analyze error patterns
        return this.analyzeErrorDistribution();
        
      case 'peak_times':
        // Find peak performance times
        return this.analyzePeakTimes();
        
      case 'proxy_performance':
        // Get proxy performance stats
        return this.getProxyPerformance();
        
      default:
        return null;
    }
  }

  analyzeErrorDistribution() {
    // Placeholder for error analysis
    return {
      byType: {
        network: 0.3,
        parsing: 0.2,
        detection: 0.4,
        other: 0.1
      },
      byTime: {
        morning: 0.2,
        afternoon: 0.3,
        evening: 0.4,
        night: 0.1
      }
    };
  }

  analyzePeakTimes() {
    // Analyze historical data for peak times
    const hourlyStats = new Map();
    
    this.metrics.history.timestamps.forEach((ts, idx) => {
      const hour = new Date(ts).getHours();
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, {
          count: 0,
          totalSuccess: 0,
          totalResponse: 0
        });
      }
      
      const stats = hourlyStats.get(hour);
      stats.count++;
      stats.totalSuccess += this.metrics.history.successRates[idx];
      stats.totalResponse += this.metrics.history.responseTimes[idx];
    });
    
    return Array.from(hourlyStats.entries()).map(([hour, stats]) => ({
      hour,
      avgSuccessRate: stats.totalSuccess / stats.count,
      avgResponseTime: stats.totalResponse / stats.count,
      samples: stats.count
    }));
  }

  getProxyPerformance() {
    // Placeholder - would get from proxy system
    return {
      total: 100,
      healthy: 85,
      degraded: 10,
      blocked: 5,
      byCountry: {
        US: { healthy: 40, total: 45 },
        GB: { healthy: 15, total: 15 },
        CA: { healthy: 10, total: 10 }
      }
    };
  }

  exportMetrics(period, format) {
    const data = this.getHistoricalMetrics(period);
    
    if (format === 'csv') {
      // Convert to CSV
      let csv = 'timestamp,success_rate,error_rate,response_time,data_extracted,active_sessions\n';
      
      data.timestamps.forEach((ts, idx) => {
        csv += `${new Date(ts).toISOString()},`;
        csv += `${data.successRates[idx]},`;
        csv += `${data.errorRates[idx]},`;
        csv += `${data.responseTimes[idx]},`;
        csv += `${data.dataExtraction[idx]},`;
        csv += `${data.sessionCounts[idx]}\n`;
      });
      
      return csv;
    }
    
    return JSON.stringify(data, null, 2);
  }

  getActiveSessions() {
    // Placeholder - would get from main system
    return {
      total: this.metrics.current.activeSessions,
      byStatus: {
        running: Math.floor(this.metrics.current.activeSessions * 0.7),
        waiting: Math.floor(this.metrics.current.activeSessions * 0.2),
        error: Math.floor(this.metrics.current.activeSessions * 0.1)
      }
    };
  }

  shutdown() {
    // Close all connections
    this.clients.forEach(client => {
      client.close();
    });
    
    // Close server
    this.server.close();
    
    console.log('📊 Dashboard shut down');
  }
}

module.exports = RealtimeDashboard;