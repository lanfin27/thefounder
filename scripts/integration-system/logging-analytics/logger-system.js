// logger-system.js
// Comprehensive logging system with multiple outputs and log analysis

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { ElasticsearchTransport } = require('winston-elasticsearch');
const path = require('path');
const fs = require('fs').promises;
const { performance } = require('perf_hooks');

class LoggerSystem {
  constructor(config = {}) {
    this.config = {
      logLevel: process.env.LOG_LEVEL || 'info',
      logDir: process.env.LOG_DIR || './logs',
      
      // Output configurations
      outputs: {
        console: true,
        file: true,
        elasticsearch: false,
        database: true
      },
      
      // File rotation settings
      rotation: {
        datePattern: 'YYYY-MM-DD',
        maxSize: '100m',
        maxFiles: '30d',
        compress: true
      },
      
      // Elasticsearch settings
      elasticsearch: {
        node: process.env.ELASTIC_URL || 'http://localhost:9200',
        index: 'stealth-logs',
        pipeline: 'stealth-pipeline'
      },
      
      // Performance tracking
      performanceTracking: true,
      slowLogThreshold: 1000, // milliseconds
      
      // Log enrichment
      enrichment: {
        includeHostInfo: true,
        includeProcessInfo: true,
        includeStackTrace: true,
        includeTimestamp: true
      },
      
      // Sensitive data masking
      masking: {
        enabled: true,
        patterns: [
          /password["\s]*[:=]["\s]*["']?([^"',\s]+)["']?/gi,
          /api[_-]?key["\s]*[:=]["\s]*["']?([^"',\s]+)["']?/gi,
          /secret["\s]*[:=]["\s]*["']?([^"',\s]+)["']?/gi,
          /token["\s]*[:=]["\s]*["']?([^"',\s]+)["']?/gi,
          /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email
        ],
        replacement: '[REDACTED]'
      },
      
      ...config
    };

    // Logger instances
    this.loggers = new Map();
    
    // Log buffer for batch writing
    this.logBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    
    // Performance metrics
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {},
      logsByCategory: {},
      slowLogs: 0,
      errors: 0
    };
    
    // Host information
    this.hostInfo = this.gatherHostInfo();
    
    // Initialize logging system
    this.initialize();
  }

  async initialize() {
    // Create log directory
    await this.ensureLogDirectory();
    
    // Initialize default logger
    this.createLogger('default');
    
    // Start buffer flushing
    this.startBufferFlushing();
    
    // Setup process event handlers
    this.setupProcessHandlers();
    
    console.log('📝 Logging system initialized');
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  createLogger(category = 'default') {
    if (this.loggers.has(category)) {
      return this.loggers.get(category);
    }
    
    const transports = this.createTransports(category);
    
    const logger = winston.createLogger({
      level: this.config.logLevel,
      format: this.createLogFormat(),
      transports,
      exitOnError: false
    });
    
    // Wrap logger methods for performance tracking
    const wrappedLogger = this.wrapLoggerMethods(logger, category);
    
    this.loggers.set(category, wrappedLogger);
    return wrappedLogger;
  }

  createTransports(category) {
    const transports = [];
    
    // Console transport
    if (this.config.outputs.console) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
    
    // File transports
    if (this.config.outputs.file) {
      // General log file
      transports.push(new DailyRotateFile({
        filename: path.join(this.config.logDir, `${category}-%DATE%.log`),
        datePattern: this.config.rotation.datePattern,
        maxSize: this.config.rotation.maxSize,
        maxFiles: this.config.rotation.maxFiles,
        compress: this.config.rotation.compress,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
      
      // Error log file
      transports.push(new DailyRotateFile({
        filename: path.join(this.config.logDir, `${category}-error-%DATE%.log`),
        datePattern: this.config.rotation.datePattern,
        maxSize: this.config.rotation.maxSize,
        maxFiles: this.config.rotation.maxFiles,
        compress: this.config.rotation.compress,
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }
    
    // Elasticsearch transport
    if (this.config.outputs.elasticsearch) {
      transports.push(new ElasticsearchTransport({
        level: 'info',
        clientOpts: { node: this.config.elasticsearch.node },
        index: this.config.elasticsearch.index,
        pipeline: this.config.elasticsearch.pipeline,
        transformer: (logData) => this.transformForElasticsearch(logData)
      }));
    }
    
    return transports;
  }

  createLogFormat() {
    return winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: this.config.enrichment.includeStackTrace }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'category']
      }),
      winston.format.printf(info => {
        const { timestamp, level, message, category, ...meta } = info;
        
        // Mask sensitive data
        const maskedMessage = this.maskSensitiveData(message);
        const maskedMeta = this.maskSensitiveData(JSON.stringify(meta));
        
        return JSON.stringify({
          timestamp,
          level,
          category,
          message: maskedMessage,
          metadata: JSON.parse(maskedMeta),
          host: this.config.enrichment.includeHostInfo ? this.hostInfo : undefined
        });
      })
    );
  }

  wrapLoggerMethods(logger, category) {
    const wrapped = {
      category,
      _logger: logger
    };
    
    // Wrap each log level method
    ['error', 'warn', 'info', 'debug', 'verbose', 'silly'].forEach(level => {
      wrapped[level] = (message, meta = {}) => {
        const start = performance.now();
        
        // Enrich metadata
        const enrichedMeta = this.enrichMetadata(meta, level, category);
        
        // Log the message
        logger[level](message, enrichedMeta);
        
        // Track performance
        const duration = performance.now() - start;
        if (this.config.performanceTracking && duration > this.config.slowLogThreshold) {
          this.metrics.slowLogs++;
          logger.warn('Slow log detected', {
            duration,
            level,
            category,
            message: message.substring(0, 100)
          });
        }
        
        // Update metrics
        this.updateMetrics(level, category);
        
        // Add to buffer for batch processing
        if (this.config.outputs.database) {
          this.addToBuffer({
            timestamp: new Date(),
            level,
            category,
            message,
            metadata: enrichedMeta
          });
        }
      };
    });
    
    // Add utility methods
    wrapped.child = (childMeta) => {
      const childCategory = `${category}:${childMeta.component || 'child'}`;
      return this.createLogger(childCategory);
    };
    
    wrapped.startTimer = () => {
      return {
        startTime: performance.now(),
        done: (message, meta = {}) => {
          const duration = performance.now() - this.startTime;
          wrapped.info(message, { ...meta, duration });
        }
      };
    };
    
    wrapped.profile = async (id, fn) => {
      const start = performance.now();
      try {
        const result = await fn();
        const duration = performance.now() - start;
        wrapped.info(`Profile: ${id}`, { duration, status: 'success' });
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        wrapped.error(`Profile: ${id}`, { duration, status: 'error', error: error.message });
        throw error;
      }
    };
    
    return wrapped;
  }

  enrichMetadata(meta, level, category) {
    const enriched = { ...meta };
    
    // Add process information
    if (this.config.enrichment.includeProcessInfo) {
      enriched.process = {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
    }
    
    // Add timestamp with nanosecond precision
    if (this.config.enrichment.includeTimestamp) {
      enriched.timestampNano = process.hrtime.bigint().toString();
    }
    
    // Add trace ID if available
    if (global.traceId) {
      enriched.traceId = global.traceId;
    }
    
    // Add session ID if available
    if (global.sessionId) {
      enriched.sessionId = global.sessionId;
    }
    
    return enriched;
  }

  maskSensitiveData(text) {
    if (!this.config.masking.enabled || !text) return text;
    
    let masked = text;
    
    this.config.masking.patterns.forEach(pattern => {
      masked = masked.replace(pattern, this.config.masking.replacement);
    });
    
    return masked;
  }

  gatherHostInfo() {
    const os = require('os');
    
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      nodeVersion: process.version
    };
  }

  updateMetrics(level, category) {
    this.metrics.totalLogs++;
    
    this.metrics.logsByLevel[level] = (this.metrics.logsByLevel[level] || 0) + 1;
    this.metrics.logsByCategory[category] = (this.metrics.logsByCategory[category] || 0) + 1;
    
    if (level === 'error') {
      this.metrics.errors++;
    }
  }

  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);
    
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  startBufferFlushing() {
    this.flushTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushBuffer();
      }
    }, this.config.flushInterval);
  }

  async flushBuffer() {
    if (this.logBuffer.length === 0) return;
    
    const logs = this.logBuffer.splice(0, this.bufferSize);
    
    try {
      // In production, this would write to database
      // For now, we'll emit an event
      this.emit('logs_batch', logs);
      
      // You can also write to a database here
      // await this.databaseManager.saveLogs(logs);
      
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
      // Re-add logs to buffer
      this.logBuffer.unshift(...logs);
    }
  }

  setupProcessHandlers() {
    // Graceful shutdown
    const shutdown = async (signal) => {
      const logger = this.getLogger('system');
      logger.info(`Received ${signal}, shutting down logging system`);
      
      // Flush remaining logs
      await this.flushBuffer();
      
      // Close transports
      this.loggers.forEach(logger => {
        logger._logger.close();
      });
      
      clearInterval(this.flushTimer);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      const logger = this.getLogger('system');
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      
      // Give time for logs to flush
      setTimeout(() => process.exit(1), 1000);
    });
    
    // Unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      const logger = this.getLogger('system');
      logger.error('Unhandled rejection', {
        reason,
        promise
      });
    });
  }

  transformForElasticsearch(logData) {
    return {
      '@timestamp': logData.timestamp,
      level: logData.level,
      category: logData.category,
      message: logData.message,
      metadata: logData.metadata,
      host: this.hostInfo,
      application: 'stealth-collection'
    };
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getLogger(category = 'default') {
    if (!this.loggers.has(category)) {
      return this.createLogger(category);
    }
    return this.loggers.get(category);
  }

  async queryLogs(options = {}) {
    const {
      startTime = Date.now() - 3600000, // 1 hour ago
      endTime = Date.now(),
      level,
      category,
      search,
      limit = 100
    } = options;
    
    // In production, this would query from database or Elasticsearch
    // For now, read from files
    const logs = [];
    
    try {
      const files = await fs.readdir(this.config.logDir);
      const logFiles = files.filter(f => f.endsWith('.log'));
      
      for (const file of logFiles.slice(-5)) { // Last 5 files
        const content = await fs.readFile(path.join(this.config.logDir, file), 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            
            // Apply filters
            if (log.timestamp) {
              const logTime = new Date(log.timestamp).getTime();
              if (logTime < startTime || logTime > endTime) continue;
            }
            
            if (level && log.level !== level) continue;
            if (category && log.category !== category) continue;
            if (search && !JSON.stringify(log).includes(search)) continue;
            
            logs.push(log);
            
            if (logs.length >= limit) break;
          } catch (e) {
            // Skip invalid lines
          }
        }
        
        if (logs.length >= limit) break;
      }
    } catch (error) {
      console.error('Failed to query logs:', error);
    }
    
    return logs.slice(0, limit);
  }

  async analyzeLogs(timeRange = '1h') {
    const logs = await this.queryLogs({
      startTime: this.getTimeRangeStart(timeRange)
    });
    
    const analysis = {
      totalLogs: logs.length,
      byLevel: {},
      byCategory: {},
      errorPatterns: {},
      timeline: [],
      topMessages: []
    };
    
    // Analyze log distribution
    logs.forEach(log => {
      // By level
      analysis.byLevel[log.level] = (analysis.byLevel[log.level] || 0) + 1;
      
      // By category
      analysis.byCategory[log.category] = (analysis.byCategory[log.category] || 0) + 1;
      
      // Error patterns
      if (log.level === 'error') {
        const pattern = this.extractErrorPattern(log.message);
        analysis.errorPatterns[pattern] = (analysis.errorPatterns[pattern] || 0) + 1;
      }
    });
    
    // Create timeline
    const buckets = this.createTimeBuckets(logs, timeRange);
    analysis.timeline = buckets;
    
    // Top messages
    const messageFreq = {};
    logs.forEach(log => {
      const msg = log.message.substring(0, 50);
      messageFreq[msg] = (messageFreq[msg] || 0) + 1;
    });
    
    analysis.topMessages = Object.entries(messageFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));
    
    return analysis;
  }

  extractErrorPattern(message) {
    // Extract error type from message
    const patterns = [
      /Error:\s*([^:]+)/,
      /Exception:\s*([^:]+)/,
      /Failed to\s+([^:]+)/,
      /Cannot\s+([^:]+)/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return message.substring(0, 30);
  }

  createTimeBuckets(logs, timeRange) {
    const bucketSize = this.getBucketSize(timeRange);
    const buckets = new Map();
    
    logs.forEach(log => {
      const time = new Date(log.timestamp).getTime();
      const bucketKey = Math.floor(time / bucketSize) * bucketSize;
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          timestamp: bucketKey,
          count: 0,
          errors: 0,
          warnings: 0
        });
      }
      
      const bucket = buckets.get(bucketKey);
      bucket.count++;
      
      if (log.level === 'error') bucket.errors++;
      if (log.level === 'warn') bucket.warnings++;
    });
    
    return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  getTimeRangeStart(range) {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    return now - (ranges[range] || ranges['1h']);
  }

  getBucketSize(range) {
    const buckets = {
      '1h': 5 * 60 * 1000,      // 5 minutes
      '6h': 30 * 60 * 1000,     // 30 minutes
      '24h': 60 * 60 * 1000,    // 1 hour
      '7d': 6 * 60 * 60 * 1000  // 6 hours
    };
    
    return buckets[range] || buckets['1h'];
  }

  getMetrics() {
    return {
      ...this.metrics,
      bufferedLogs: this.logBuffer.length,
      loggers: this.loggers.size
    };
  }

  setLogLevel(level, category = null) {
    if (category) {
      const logger = this.loggers.get(category);
      if (logger) {
        logger._logger.level = level;
      }
    } else {
      // Set for all loggers
      this.config.logLevel = level;
      this.loggers.forEach(logger => {
        logger._logger.level = level;
      });
    }
  }

  // Context management for distributed tracing
  createContext(traceId = null) {
    return {
      traceId: traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      startTime: Date.now()
    };
  }

  generateTraceId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  generateSpanId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Log rotation management
  async rotateLogs() {
    const logger = this.getLogger('system');
    logger.info('Starting log rotation');
    
    // Force rotation on all file transports
    this.loggers.forEach((logger, category) => {
      logger._logger.transports.forEach(transport => {
        if (transport.rotate) {
          transport.rotate();
        }
      });
    });
  }

  // Export logs for analysis
  async exportLogs(format = 'json', options = {}) {
    const logs = await this.queryLogs(options);
    
    switch (format) {
      case 'csv':
        return this.exportAsCSV(logs);
      case 'json':
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  exportAsCSV(logs) {
    if (logs.length === 0) return '';
    
    const headers = ['timestamp', 'level', 'category', 'message'];
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      log.category,
      log.message.replace(/"/g, '""') // Escape quotes
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
}

// Make LoggerSystem an EventEmitter
const EventEmitter = require('events');
Object.setPrototypeOf(LoggerSystem.prototype, EventEmitter.prototype);
Object.setPrototypeOf(LoggerSystem, EventEmitter);

module.exports = LoggerSystem;