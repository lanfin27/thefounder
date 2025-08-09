// database-manager.js
// Robust database manager with connection pooling and optimization

const { Pool } = require('pg');
const Redis = require('redis');
const { promisify } = require('util');
const crypto = require('crypto');

class DatabaseManager {
  constructor(config = {}) {
    this.config = {
      // PostgreSQL configuration
      postgres: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'stealth_collection',
        user: process.env.DB_USER || 'stealth_app',
        password: process.env.DB_PASSWORD,
        max: 20, // Maximum pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        schema: 'stealth_collection'
      },
      
      // Redis configuration for caching
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      },
      
      // Cache settings
      cache: {
        enabled: true,
        ttl: 300, // 5 minutes default
        keyPrefix: 'stealth:',
        compression: true
      },
      
      // Batch settings
      batch: {
        size: 1000,
        flushInterval: 5000 // 5 seconds
      },
      
      ...config
    };

    // Connection pools
    this.pgPool = null;
    this.redisClient = null;
    
    // Batch queues
    this.batchQueues = {
      collectedData: [],
      errors: [],
      metrics: []
    };
    
    // Prepared statements cache
    this.preparedStatements = new Map();
    
    // Performance metrics
    this.metrics = {
      queries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchWrites: 0,
      avgQueryTime: 0
    };
    
    // Initialize connections
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize PostgreSQL
      await this.initializePostgres();
      
      // Initialize Redis
      await this.initializeRedis();
      
      // Start batch processing
      this.startBatchProcessing();
      
      // Setup cleanup handlers
      this.setupCleanupHandlers();
      
      console.log('✅ Database manager initialized');
    } catch (error) {
      console.error('Failed to initialize database manager:', error);
      throw error;
    }
  }

  async initializePostgres() {
    this.pgPool = new Pool(this.config.postgres);
    
    // Test connection
    const client = await this.pgPool.connect();
    try {
      await client.query(`SET search_path TO ${this.config.postgres.schema}, public`);
      await client.query('SELECT NOW()');
      console.log('✅ PostgreSQL connected');
    } finally {
      client.release();
    }
    
    // Setup error handling
    this.pgPool.on('error', (err, client) => {
      console.error('Unexpected PostgreSQL error:', err);
    });
  }

  async initializeRedis() {
    if (!this.config.cache.enabled) return;
    
    this.redisClient = Redis.createClient(this.config.redis);
    
    // Promisify Redis methods
    this.redis = {
      get: promisify(this.redisClient.get).bind(this.redisClient),
      set: promisify(this.redisClient.set).bind(this.redisClient),
      setex: promisify(this.redisClient.setex).bind(this.redisClient),
      del: promisify(this.redisClient.del).bind(this.redisClient),
      exists: promisify(this.redisClient.exists).bind(this.redisClient),
      expire: promisify(this.redisClient.expire).bind(this.redisClient),
      mget: promisify(this.redisClient.mget).bind(this.redisClient),
      mset: promisify(this.redisClient.mset).bind(this.redisClient)
    };
    
    this.redisClient.on('ready', () => {
      console.log('✅ Redis connected');
    });
    
    this.redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  startBatchProcessing() {
    // Flush batches periodically
    setInterval(() => {
      this.flushBatches();
    }, this.config.batch.flushInterval);
  }

  setupCleanupHandlers() {
    const cleanup = async () => {
      console.log('🧹 Cleaning up database connections...');
      
      // Flush remaining batches
      await this.flushBatches();
      
      // Close connections
      if (this.pgPool) {
        await this.pgPool.end();
      }
      
      if (this.redisClient) {
        this.redisClient.quit();
      }
      
      console.log('✅ Database cleanup complete');
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  async createSession(sessionData) {
    const query = `
      INSERT INTO sessions (
        session_key, status, strategy_name, proxy_type, 
        proxy_country, browser_fingerprint, behavior_profile
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      sessionData.sessionKey,
      'active',
      sessionData.strategyName,
      sessionData.proxyType,
      sessionData.proxyCountry,
      JSON.stringify(sessionData.browserFingerprint),
      sessionData.behaviorProfile
    ];
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async updateSession(sessionId, updates) {
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      updateFields.push(`${this.camelToSnake(key)} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });
    
    values.push(sessionId);
    
    const query = `
      UPDATE sessions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await this.query(query, values);
    
    // Invalidate cache
    await this.invalidateCache(`session:${sessionId}`);
    
    return result.rows[0];
  }

  async endSession(sessionId) {
    const query = `
      UPDATE sessions 
      SET status = 'completed', 
          end_time = NOW(),
          duration_ms = EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
          success_rate = (
            SELECT CASE 
              WHEN COUNT(*) > 0 THEN 
                SUM(CASE WHEN confidence_score > 0.5 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)
              ELSE 1.0
            END
            FROM collected_data
            WHERE session_id = $1
          )
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.query(query, [sessionId]);
    return result.rows[0];
  }

  // =====================================================
  // DATA COLLECTION
  // =====================================================

  async saveCollectedData(sessionId, dataArray) {
    // Add to batch queue
    dataArray.forEach(data => {
      this.batchQueues.collectedData.push({
        sessionId,
        sourceUrl: data.url,
        pageType: data.pageType,
        extractionPattern: data.pattern,
        data: data.extractedData,
        confidenceScore: data.confidence,
        completenessScore: data.completeness
      });
    });
    
    // Flush if batch is full
    if (this.batchQueues.collectedData.length >= this.config.batch.size) {
      await this.flushCollectedData();
    }
  }

  async flushCollectedData() {
    if (this.batchQueues.collectedData.length === 0) return;
    
    const batch = this.batchQueues.collectedData.splice(0, this.config.batch.size);
    
    // Build bulk insert query
    const values = [];
    const placeholders = [];
    let paramIndex = 1;
    
    batch.forEach(item => {
      placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
      
      values.push(
        item.sessionId,
        item.sourceUrl,
        item.pageType,
        item.extractionPattern,
        JSON.stringify(item.data),
        item.confidenceScore,
        item.completenessScore
      );
      
      paramIndex += 7;
    });
    
    const query = `
      INSERT INTO collected_data (
        session_id, source_url, page_type, extraction_pattern,
        data, confidence_score, completeness_score
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;
    
    try {
      await this.query(query, values);
      this.metrics.batchWrites++;
      
      // Process listings from collected data
      await this.processListingsFromBatch(batch);
      
    } catch (error) {
      console.error('Failed to flush collected data:', error);
      // Re-queue failed items
      this.batchQueues.collectedData.unshift(...batch);
    }
  }

  async processListingsFromBatch(batch) {
    const listings = batch
      .filter(item => item.data.external_id)
      .map(item => ({
        external_id: item.data.external_id,
        title: item.data.title,
        description: item.data.description,
        category: item.data.category,
        price: item.data.price,
        revenue_monthly: item.data.revenue,
        profit_monthly: item.data.profit,
        age_months: item.data.age_months,
        traffic_monthly: item.data.traffic,
        raw_data: item.data
      }));
    
    if (listings.length === 0) return;
    
    // Upsert listings
    const query = `
      INSERT INTO listings (
        external_id, title, description, category,
        price, revenue_monthly, profit_monthly,
        age_months, traffic_monthly, raw_data
      ) VALUES ${listings.map((_, i) => `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10})`).join(', ')}
      ON CONFLICT (external_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        revenue_monthly = EXCLUDED.revenue_monthly,
        profit_monthly = EXCLUDED.profit_monthly,
        last_seen = NOW(),
        update_count = listings.update_count + 1,
        raw_data = EXCLUDED.raw_data
    `;
    
    const values = listings.flatMap(listing => [
      listing.external_id,
      listing.title,
      listing.description,
      listing.category,
      listing.price,
      listing.revenue_monthly,
      listing.profit_monthly,
      listing.age_months,
      listing.traffic_monthly,
      JSON.stringify(listing.raw_data)
    ]);
    
    await this.query(query, values);
  }

  // =====================================================
  // ERROR TRACKING
  // =====================================================

  async logError(sessionId, error) {
    this.batchQueues.errors.push({
      sessionId,
      errorType: error.type || 'unknown',
      errorCategory: error.category,
      errorCode: error.code,
      message: error.message,
      stackTrace: error.stack,
      context: error.context,
      recoveryAttempted: error.recoveryAttempted || false,
      recoveryStrategy: error.recoveryStrategy,
      recoverySuccessful: error.recoverySuccessful
    });
    
    if (this.batchQueues.errors.length >= this.config.batch.size) {
      await this.flushErrors();
    }
  }

  async flushErrors() {
    if (this.batchQueues.errors.length === 0) return;
    
    const batch = this.batchQueues.errors.splice(0, this.config.batch.size);
    
    const placeholders = [];
    const values = [];
    let paramIndex = 1;
    
    batch.forEach(error => {
      placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`);
      
      values.push(
        error.sessionId,
        error.errorType,
        error.errorCategory,
        error.errorCode,
        error.message,
        error.stackTrace,
        JSON.stringify(error.context),
        error.recoveryAttempted,
        error.recoveryStrategy,
        error.recoverySuccessful
      );
      
      paramIndex += 10;
    });
    
    const query = `
      INSERT INTO errors (
        session_id, error_type, error_category, error_code,
        message, stack_trace, context, recovery_attempted,
        recovery_strategy, recovery_successful
      ) VALUES ${placeholders.join(', ')}
    `;
    
    try {
      await this.query(query, values);
      this.metrics.batchWrites++;
    } catch (error) {
      console.error('Failed to flush errors:', error);
      this.batchQueues.errors.unshift(...batch);
    }
  }

  // =====================================================
  // PROXY MANAGEMENT
  // =====================================================

  async getHealthyProxy(options = {}) {
    const { type = 'residential', country = null } = options;
    
    const query = `
      SELECT * FROM proxies
      WHERE status = 'healthy'
        AND type = $1
        ${country ? 'AND country = $2' : ''}
        AND (blocked_until IS NULL OR blocked_until < NOW())
      ORDER BY 
        CASE WHEN last_used IS NULL THEN 0 ELSE 1 END,
        last_used ASC NULLS FIRST,
        success_rate DESC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    
    const values = country ? [type, country] : [type];
    const result = await this.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`No healthy ${type} proxy available${country ? ` for ${country}` : ''}`);
    }
    
    const proxy = result.rows[0];
    
    // Mark as used
    await this.query(
      'UPDATE proxies SET last_used = NOW() WHERE id = $1',
      [proxy.id]
    );
    
    return proxy;
  }

  async updateProxyHealth(proxyId, metrics) {
    const query = `
      UPDATE proxies
      SET 
        latency_ms = $2,
        success_rate = (
          (success_rate * total_requests + $3) / (total_requests + 1)
        ),
        total_requests = total_requests + 1,
        failed_requests = failed_requests + $4,
        status = CASE
          WHEN (
            (success_rate * total_requests + $3) / (total_requests + 1)
          ) < 0.5 THEN 'unhealthy'
          WHEN (
            (success_rate * total_requests + $3) / (total_requests + 1)
          ) < 0.8 THEN 'degraded'
          ELSE 'healthy'
        END,
        last_checked = NOW()
      WHERE id = $1
    `;
    
    const values = [
      proxyId,
      metrics.latency,
      metrics.success ? 1 : 0,
      metrics.success ? 0 : 1
    ];
    
    await this.query(query, values);
  }

  async blockProxy(proxyId, duration = 3600) {
    const query = `
      UPDATE proxies
      SET 
        status = 'blocked',
        blocked_until = NOW() + INTERVAL '${duration} seconds'
      WHERE id = $1
    `;
    
    await this.query(query, [proxyId]);
  }

  // =====================================================
  // LEARNING AND ADAPTATION
  // =====================================================

  async recordLearningPattern(pattern) {
    const query = `
      INSERT INTO learning_patterns (
        pattern_type, pattern_key, pattern_data,
        confidence_score
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (pattern_type, pattern_key) DO UPDATE SET
        pattern_data = EXCLUDED.pattern_data,
        occurrences = learning_patterns.occurrences + 1,
        last_seen = NOW(),
        confidence_score = (
          learning_patterns.confidence_score * 0.9 + 
          EXCLUDED.confidence_score * 0.1
        )
    `;
    
    const values = [
      pattern.type,
      pattern.key,
      JSON.stringify(pattern.data),
      pattern.confidence || 0.5
    ];
    
    await this.query(query, values);
  }

  async getStrategyPerformance(strategyName, context = {}) {
    const cacheKey = `strategy:${strategyName}:${JSON.stringify(context)}`;
    
    // Check cache
    const cached = await this.getCached(cacheKey);
    if (cached) return cached;
    
    const query = `
      SELECT 
        strategy_name,
        SUM(executions) as total_executions,
        SUM(successes) as total_successes,
        AVG(avg_duration_ms) as avg_duration,
        AVG(avg_data_quality) as avg_quality,
        MAX(updated_at) as last_used
      FROM strategy_performance
      WHERE strategy_name = $1
        ${context.hour !== undefined ? 'AND hour_of_day = $2' : ''}
        ${context.day !== undefined ? 'AND day_of_week = $3' : ''}
      GROUP BY strategy_name
    `;
    
    const values = [strategyName];
    if (context.hour !== undefined) values.push(context.hour);
    if (context.day !== undefined) values.push(context.day);
    
    const result = await this.query(query, values);
    
    const performance = result.rows[0] || {
      strategy_name: strategyName,
      total_executions: 0,
      total_successes: 0,
      avg_duration: 0,
      avg_quality: 0
    };
    
    // Calculate success rate
    performance.success_rate = performance.total_executions > 0
      ? performance.total_successes / performance.total_executions
      : 0;
    
    // Cache result
    await this.setCached(cacheKey, performance, 300); // 5 minutes
    
    return performance;
  }

  // =====================================================
  // ANALYTICS AND REPORTING
  // =====================================================

  async recordMetricsSnapshot(metrics) {
    const query = `
      INSERT INTO metrics_snapshots (
        interval_type, active_sessions, total_requests,
        successful_requests, failed_requests,
        avg_response_time_ms, p95_response_time_ms, p99_response_time_ms,
        data_extracted_count, data_quality_avg,
        cpu_usage_percent, memory_usage_mb, bandwidth_usage_mb,
        proxies_total, proxies_healthy, proxies_blocked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;
    
    const values = [
      'minute',
      metrics.activeSessions,
      metrics.totalRequests,
      metrics.successfulRequests,
      metrics.failedRequests,
      metrics.avgResponseTime,
      metrics.p95ResponseTime,
      metrics.p99ResponseTime,
      metrics.dataExtracted,
      metrics.dataQualityAvg,
      metrics.cpuUsage,
      metrics.memoryUsage,
      metrics.bandwidthUsage,
      metrics.proxiesTotal,
      metrics.proxiesHealthy,
      metrics.proxiesBlocked
    ];
    
    await this.query(query, values);
  }

  async getPerformanceTrends(period = '24h') {
    const intervals = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days'
    };
    
    const query = `
      SELECT * FROM v_performance_trends
      WHERE hour > NOW() - INTERVAL '${intervals[period] || intervals['24h']}'
      ORDER BY hour
    `;
    
    const result = await this.query(query);
    return result.rows;
  }

  async getSystemHealth() {
    const queries = {
      activeSessions: 'SELECT COUNT(*) FROM sessions WHERE status = \'active\'',
      healthyProxies: 'SELECT COUNT(*) FROM proxies WHERE status = \'healthy\'',
      recentErrors: 'SELECT COUNT(*) FROM errors WHERE occurred_at > NOW() - INTERVAL \'1 hour\'',
      dataQuality: 'SELECT AVG(confidence_score) FROM collected_data WHERE extracted_at > NOW() - INTERVAL \'1 hour\''
    };
    
    const results = await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        const result = await this.query(query);
        return { key, value: result.rows[0] };
      })
    );
    
    const health = {};
    results.forEach(({ key, value }) => {
      health[key] = Object.values(value)[0];
    });
    
    return health;
  }

  // =====================================================
  // QUERY EXECUTION AND CACHING
  // =====================================================

  async query(text, params = []) {
    const start = Date.now();
    
    try {
      const result = await this.pgPool.query(text, params);
      
      // Update metrics
      const duration = Date.now() - start;
      this.metrics.queries++;
      this.metrics.avgQueryTime = 
        (this.metrics.avgQueryTime * (this.metrics.queries - 1) + duration) / 
        this.metrics.queries;
      
      return result;
      
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async getCached(key) {
    if (!this.config.cache.enabled || !this.redis) return null;
    
    try {
      const cached = await this.redis.get(this.config.cache.keyPrefix + key);
      
      if (cached) {
        this.metrics.cacheHits++;
        return JSON.parse(cached);
      } else {
        this.metrics.cacheMisses++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setCached(key, value, ttl = null) {
    if (!this.config.cache.enabled || !this.redis) return;
    
    try {
      const serialized = JSON.stringify(value);
      const ttlSeconds = ttl || this.config.cache.ttl;
      
      await this.redis.setex(
        this.config.cache.keyPrefix + key,
        ttlSeconds,
        serialized
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidateCache(pattern) {
    if (!this.config.cache.enabled || !this.redis) return;
    
    try {
      // In production, use Redis SCAN for pattern matching
      await this.redis.del(this.config.cache.keyPrefix + pattern);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // =====================================================
  // BATCH OPERATIONS
  // =====================================================

  async flushBatches() {
    const flushPromises = [];
    
    if (this.batchQueues.collectedData.length > 0) {
      flushPromises.push(this.flushCollectedData());
    }
    
    if (this.batchQueues.errors.length > 0) {
      flushPromises.push(this.flushErrors());
    }
    
    if (this.batchQueues.metrics.length > 0) {
      flushPromises.push(this.flushMetrics());
    }
    
    await Promise.all(flushPromises);
  }

  async flushMetrics() {
    // Implementation for metrics batching
    this.batchQueues.metrics = [];
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  async transaction(callback) {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      poolStats: {
        total: this.pgPool.totalCount,
        idle: this.pgPool.idleCount,
        waiting: this.pgPool.waitingCount
      },
      batchQueues: {
        collectedData: this.batchQueues.collectedData.length,
        errors: this.batchQueues.errors.length,
        metrics: this.batchQueues.metrics.length
      }
    };
  }

  async cleanup() {
    await this.flushBatches();
    
    if (this.pgPool) {
      await this.pgPool.end();
    }
    
    if (this.redisClient) {
      this.redisClient.quit();
    }
  }
}

module.exports = DatabaseManager;