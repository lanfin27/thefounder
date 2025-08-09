// scripts/high-performance-scraper/proxy-rotation-manager.js
// Sophisticated Proxy Rotation System with Residential IPs and Health Monitoring

const axios = require('axios');
const { performance } = require('perf_hooks');
const EventEmitter = require('events');

class ProxyRotationManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      providers: ['brightdata', 'smartproxy', 'oxylabs', 'residential'],
      minHealthScore: 0.7,
      rotationInterval: 30000, // 30 seconds
      healthCheckInterval: 10000, // 10 seconds
      geoTargeting: true,
      stickySession: true,
      sessionDuration: 300000, // 5 minutes
      maxRetries: 3,
      timeout: 10000,
      ...config
    };
    
    this.proxyPool = new Map();
    this.healthScores = new Map();
    this.geoDistribution = new Map();
    this.activeSessions = new Map();
    this.blockedProxies = new Set();
    this.usageStats = new Map();
    
    this.isInitialized = false;
    this.healthMonitor = null;
    this.rotationTimer = null;
  }

  async initialize() {
    console.log('🌐 Initializing Proxy Rotation System...');
    
    // Load proxy providers
    await this.loadProxyProviders();
    
    // Initialize health monitoring
    this.startHealthMonitoring();
    
    // Initialize rotation scheduler
    this.startRotationScheduler();
    
    // Initialize geo-distribution
    await this.initializeGeoDistribution();
    
    this.isInitialized = true;
    console.log(`✅ Proxy system initialized with ${this.proxyPool.size} proxies`);
    
    // Report initial statistics
    this.reportProxyStatistics();
  }

  async loadProxyProviders() {
    console.log('📡 Loading proxy providers...');
    
    // Simulated proxy pools - in production, these would come from actual providers
    const providers = {
      brightdata: this.generateResidentialProxies(100, 'brightdata'),
      smartproxy: this.generateResidentialProxies(80, 'smartproxy'),
      oxylabs: this.generateResidentialProxies(60, 'oxylabs'),
      residential: this.generateResidentialProxies(50, 'residential')
    };
    
    // Load proxies from each provider
    for (const [provider, proxies] of Object.entries(providers)) {
      console.log(`   Loading ${proxies.length} proxies from ${provider}`);
      
      for (const proxy of proxies) {
        const proxyId = `${provider}_${proxy.id}`;
        this.proxyPool.set(proxyId, {
          ...proxy,
          provider,
          addedAt: Date.now(),
          lastUsed: null,
          successCount: 0,
          failureCount: 0,
          avgResponseTime: 0,
          healthScore: 1.0,
          isResidential: true
        });
        
        // Initialize health score
        this.healthScores.set(proxyId, 1.0);
      }
    }
  }

  generateResidentialProxies(count, provider) {
    const proxies = [];
    const geoLocations = [
      { country: 'US', city: 'New York', lat: 40.7128, lon: -74.0060, weight: 0.2 },
      { country: 'US', city: 'Los Angeles', lat: 34.0522, lon: -118.2437, weight: 0.15 },
      { country: 'US', city: 'Chicago', lat: 41.8781, lon: -87.6298, weight: 0.1 },
      { country: 'UK', city: 'London', lat: 51.5074, lon: -0.1278, weight: 0.15 },
      { country: 'DE', city: 'Berlin', lat: 52.5200, lon: 13.4050, weight: 0.1 },
      { country: 'JP', city: 'Tokyo', lat: 35.6762, lon: 139.6503, weight: 0.1 },
      { country: 'AU', city: 'Sydney', lat: -33.8688, lon: 151.2093, weight: 0.1 },
      { country: 'CA', city: 'Toronto', lat: 43.6532, lon: -79.3832, weight: 0.1 }
    ];
    
    for (let i = 0; i < count; i++) {
      const geo = this.selectWeightedRandom(geoLocations);
      
      proxies.push({
        id: `${provider}_${i}`,
        host: `residential-${geo.country.toLowerCase()}-${i}.${provider}.com`,
        port: 8000 + i,
        username: `user_${provider}_${i}`,
        password: `pass_${Math.random().toString(36).substr(2, 9)}`,
        protocol: 'http',
        geo: {
          country: geo.country,
          city: geo.city,
          coordinates: { lat: geo.lat, lon: geo.lon },
          timezone: this.getTimezone(geo.country)
        },
        type: 'residential',
        isp: this.getRandomISP(geo.country),
        asn: Math.floor(Math.random() * 65000) + 1000,
        mobile: Math.random() < 0.3,
        connectionType: Math.random() < 0.7 ? 'fiber' : 'cable'
      });
    }
    
    return proxies;
  }

  selectWeightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item;
    }
    
    return items[0];
  }

  getTimezone(country) {
    const timezones = {
      US: ['America/New_York', 'America/Los_Angeles', 'America/Chicago'],
      UK: ['Europe/London'],
      DE: ['Europe/Berlin'],
      JP: ['Asia/Tokyo'],
      AU: ['Australia/Sydney'],
      CA: ['America/Toronto']
    };
    
    const countryTimezones = timezones[country] || ['UTC'];
    return countryTimezones[Math.floor(Math.random() * countryTimezones.length)];
  }

  getRandomISP(country) {
    const isps = {
      US: ['Comcast', 'AT&T', 'Verizon', 'Spectrum', 'Cox'],
      UK: ['BT', 'Virgin Media', 'Sky', 'TalkTalk', 'EE'],
      DE: ['Deutsche Telekom', 'Vodafone', 'O2', '1&1', 'Unitymedia'],
      JP: ['NTT', 'KDDI', 'SoftBank', 'J:COM', 'au'],
      AU: ['Telstra', 'Optus', 'TPG', 'iiNet', 'Vodafone'],
      CA: ['Rogers', 'Bell', 'Telus', 'Shaw', 'Videotron']
    };
    
    const countryISPs = isps[country] || ['Generic ISP'];
    return countryISPs[Math.floor(Math.random() * countryISPs.length)];
  }

  async initializeGeoDistribution() {
    console.log('🌍 Initializing geographic distribution...');
    
    // Group proxies by country and city
    for (const [proxyId, proxy] of this.proxyPool) {
      const country = proxy.geo.country;
      const city = proxy.geo.city;
      
      if (!this.geoDistribution.has(country)) {
        this.geoDistribution.set(country, new Map());
      }
      
      const countryMap = this.geoDistribution.get(country);
      if (!countryMap.has(city)) {
        countryMap.set(city, []);
      }
      
      countryMap.get(city).push(proxyId);
    }
    
    // Report distribution
    console.log('📍 Geographic distribution:');
    for (const [country, cities] of this.geoDistribution) {
      const totalProxies = Array.from(cities.values()).reduce((sum, proxies) => sum + proxies.length, 0);
      console.log(`   ${country}: ${totalProxies} proxies across ${cities.size} cities`);
    }
  }

  startHealthMonitoring() {
    console.log('🏥 Starting proxy health monitoring...');
    
    // Initial health check
    this.performHealthCheck();
    
    // Schedule regular health checks
    this.healthMonitor = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  async performHealthCheck() {
    const checkPromises = [];
    const batchSize = 50; // Check 50 proxies at a time
    
    const proxiesToCheck = Array.from(this.proxyPool.keys()).filter(
      proxyId => !this.blockedProxies.has(proxyId)
    );
    
    for (let i = 0; i < proxiesToCheck.length; i += batchSize) {
      const batch = proxiesToCheck.slice(i, i + batchSize);
      
      const batchPromises = batch.map(proxyId => 
        this.checkProxyHealth(proxyId).catch(err => ({ proxyId, error: err }))
      );
      
      checkPromises.push(...batchPromises);
    }
    
    const results = await Promise.all(checkPromises);
    
    // Update health scores
    let healthyCount = 0;
    let unhealthyCount = 0;
    
    for (const result of results) {
      if (result.error) {
        this.updateHealthScore(result.proxyId, 0);
        unhealthyCount++;
      } else if (result.success) {
        this.updateHealthScore(result.proxyId, result.score);
        if (result.score >= this.config.minHealthScore) {
          healthyCount++;
        } else {
          unhealthyCount++;
        }
      }
    }
    
    console.log(`🏥 Health check complete: ${healthyCount} healthy, ${unhealthyCount} unhealthy`);
    
    // Emit health report
    this.emit('health_report', {
      timestamp: Date.now(),
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      blocked: this.blockedProxies.size,
      total: this.proxyPool.size
    });
  }

  async checkProxyHealth(proxyId) {
    const proxy = this.proxyPool.get(proxyId);
    if (!proxy) return { proxyId, error: 'Proxy not found' };
    
    const startTime = performance.now();
    
    try {
      // Test proxy with a reliable endpoint
      const testUrl = 'http://httpbin.org/ip';
      const proxyUrl = `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
      
      const response = await axios.get(testUrl, {
        proxy: false,
        httpsAgent: new (require('https-proxy-agent'))(proxyUrl),
        httpAgent: new (require('http-proxy-agent'))(proxyUrl),
        timeout: this.config.timeout,
        validateStatus: status => status === 200
      });
      
      const responseTime = performance.now() - startTime;
      
      // Calculate health score based on multiple factors
      const speedScore = Math.max(0, 1 - (responseTime / this.config.timeout));
      const reliabilityScore = proxy.successCount / (proxy.successCount + proxy.failureCount + 1);
      const freshnessScore = Math.max(0, 1 - ((Date.now() - proxy.lastUsed) / (24 * 60 * 60 * 1000)));
      
      const healthScore = (speedScore * 0.4 + reliabilityScore * 0.4 + freshnessScore * 0.2);
      
      // Update proxy stats
      proxy.avgResponseTime = (proxy.avgResponseTime * proxy.successCount + responseTime) / (proxy.successCount + 1);
      proxy.successCount++;
      proxy.lastChecked = Date.now();
      
      return {
        proxyId,
        success: true,
        score: healthScore,
        responseTime,
        ip: response.data.origin
      };
      
    } catch (error) {
      proxy.failureCount++;
      proxy.lastChecked = Date.now();
      
      return {
        proxyId,
        success: false,
        score: 0,
        error: error.message
      };
    }
  }

  updateHealthScore(proxyId, newScore) {
    const currentScore = this.healthScores.get(proxyId) || 0;
    
    // Exponential moving average for smooth updates
    const alpha = 0.3;
    const updatedScore = alpha * newScore + (1 - alpha) * currentScore;
    
    this.healthScores.set(proxyId, updatedScore);
    
    const proxy = this.proxyPool.get(proxyId);
    if (proxy) {
      proxy.healthScore = updatedScore;
    }
    
    // Block proxy if health score is too low
    if (updatedScore < 0.3) {
      this.blockProxy(proxyId, 'Low health score');
    }
  }

  blockProxy(proxyId, reason) {
    console.log(`🚫 Blocking proxy ${proxyId}: ${reason}`);
    
    this.blockedProxies.add(proxyId);
    
    // Schedule unblock after cooldown period
    setTimeout(() => {
      this.unblockProxy(proxyId);
    }, 30 * 60 * 1000); // 30 minutes cooldown
    
    this.emit('proxy_blocked', { proxyId, reason, timestamp: Date.now() });
  }

  unblockProxy(proxyId) {
    if (this.blockedProxies.delete(proxyId)) {
      console.log(`✅ Unblocking proxy ${proxyId}`);
      
      // Reset health score for fresh start
      this.healthScores.set(proxyId, 0.5);
      
      const proxy = this.proxyPool.get(proxyId);
      if (proxy) {
        proxy.healthScore = 0.5;
        proxy.failureCount = Math.floor(proxy.failureCount / 2); // Forgive half the failures
      }
      
      this.emit('proxy_unblocked', { proxyId, timestamp: Date.now() });
    }
  }

  startRotationScheduler() {
    console.log('🔄 Starting automatic proxy rotation...');
    
    this.rotationTimer = setInterval(() => {
      this.rotateActiveSessions();
    }, this.config.rotationInterval);
  }

  rotateActiveSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    // Find expired sessions
    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.startTime > this.config.sessionDuration) {
        expiredSessions.push(sessionId);
      }
    }
    
    // Rotate expired sessions
    for (const sessionId of expiredSessions) {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        console.log(`🔄 Rotating session ${sessionId} (expired)`);
        
        // Get new proxy for the session
        const newProxy = this.selectOptimalProxy({
          targetGeo: session.targetGeo,
          excludeProxy: session.proxyId
        });
        
        if (newProxy) {
          session.proxyId = newProxy.id;
          session.startTime = now;
          session.rotationCount++;
          
          this.emit('session_rotated', {
            sessionId,
            oldProxy: session.proxyId,
            newProxy: newProxy.id,
            reason: 'expired'
          });
        }
      }
    }
    
    if (expiredSessions.length > 0) {
      console.log(`🔄 Rotated ${expiredSessions.length} expired sessions`);
    }
  }

  async getProxy(options = {}) {
    if (!this.isInitialized) {
      throw new Error('Proxy manager not initialized');
    }
    
    const {
      sessionId = null,
      targetUrl = null,
      targetGeo = null,
      preferredProvider = null,
      requireResidential = true,
      stickySession = this.config.stickySession
    } = options;
    
    // Check for existing session
    if (sessionId && stickySession && this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      const proxy = this.proxyPool.get(session.proxyId);
      
      if (proxy && proxy.healthScore >= this.config.minHealthScore) {
        return this.formatProxyResponse(proxy);
      }
    }
    
    // Select optimal proxy
    const selectedProxy = this.selectOptimalProxy({
      targetGeo,
      targetUrl,
      preferredProvider,
      requireResidential
    });
    
    if (!selectedProxy) {
      throw new Error('No healthy proxies available');
    }
    
    // Create or update session
    if (sessionId && stickySession) {
      this.activeSessions.set(sessionId, {
        sessionId,
        proxyId: selectedProxy.id,
        startTime: Date.now(),
        targetGeo,
        targetUrl,
        rotationCount: 0
      });
    }
    
    // Update usage stats
    this.updateUsageStats(selectedProxy.id);
    
    return this.formatProxyResponse(selectedProxy);
  }

  selectOptimalProxy(criteria = {}) {
    const {
      targetGeo = null,
      targetUrl = null,
      preferredProvider = null,
      requireResidential = true,
      excludeProxy = null
    } = criteria;
    
    // Filter available proxies
    let availableProxies = Array.from(this.proxyPool.entries())
      .filter(([proxyId, proxy]) => {
        if (this.blockedProxies.has(proxyId)) return false;
        if (proxy.healthScore < this.config.minHealthScore) return false;
        if (requireResidential && !proxy.isResidential) return false;
        if (preferredProvider && proxy.provider !== preferredProvider) return false;
        if (excludeProxy && proxyId === excludeProxy) return false;
        return true;
      });
    
    // Apply geo-targeting
    if (targetGeo && this.config.geoTargeting) {
      const geoProxies = availableProxies.filter(([_, proxy]) => {
        if (targetGeo.country && proxy.geo.country !== targetGeo.country) return false;
        if (targetGeo.city && proxy.geo.city !== targetGeo.city) return false;
        return true;
      });
      
      if (geoProxies.length > 0) {
        availableProxies = geoProxies;
      }
    }
    
    if (availableProxies.length === 0) {
      return null;
    }
    
    // Score and sort proxies
    const scoredProxies = availableProxies.map(([proxyId, proxy]) => {
      let score = proxy.healthScore;
      
      // Boost score for less recently used proxies
      const timeSinceLastUse = Date.now() - (proxy.lastUsed || 0);
      score += Math.min(0.2, timeSinceLastUse / (60 * 60 * 1000)); // Up to 0.2 bonus for 1 hour
      
      // Boost score for proxies with good success rate
      const successRate = proxy.successCount / (proxy.successCount + proxy.failureCount + 1);
      score += successRate * 0.1;
      
      // Penalty for slow proxies
      if (proxy.avgResponseTime > 1000) {
        score -= Math.min(0.2, (proxy.avgResponseTime - 1000) / 5000);
      }
      
      return { proxyId, proxy, score };
    });
    
    // Sort by score and select best
    scoredProxies.sort((a, b) => b.score - a.score);
    
    // Add some randomization to top proxies to distribute load
    const topProxies = scoredProxies.slice(0, Math.min(5, scoredProxies.length));
    const selected = topProxies[Math.floor(Math.random() * topProxies.length)];
    
    if (selected) {
      const proxy = this.proxyPool.get(selected.proxyId);
      proxy.lastUsed = Date.now();
      return { id: selected.proxyId, ...proxy };
    }
    
    return null;
  }

  formatProxyResponse(proxy) {
    return {
      id: proxy.id,
      url: `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
      protocol: proxy.protocol,
      provider: proxy.provider,
      geo: proxy.geo,
      type: proxy.type,
      isp: proxy.isp,
      healthScore: proxy.healthScore,
      avgResponseTime: proxy.avgResponseTime,
      isResidential: proxy.isResidential,
      mobile: proxy.mobile,
      connectionType: proxy.connectionType
    };
  }

  updateUsageStats(proxyId) {
    const stats = this.usageStats.get(proxyId) || {
      totalRequests: 0,
      lastHourRequests: [],
      dailyRequests: 0,
      lastReset: Date.now()
    };
    
    stats.totalRequests++;
    stats.lastHourRequests.push(Date.now());
    stats.dailyRequests++;
    
    // Clean up old hourly data
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    stats.lastHourRequests = stats.lastHourRequests.filter(time => time > oneHourAgo);
    
    // Reset daily counter
    if (Date.now() - stats.lastReset > 24 * 60 * 60 * 1000) {
      stats.dailyRequests = 1;
      stats.lastReset = Date.now();
    }
    
    this.usageStats.set(proxyId, stats);
  }

  reportProxyStatistics() {
    const stats = {
      total: this.proxyPool.size,
      healthy: 0,
      unhealthy: 0,
      blocked: this.blockedProxies.size,
      byProvider: {},
      byCountry: {},
      avgHealthScore: 0,
      activeSessions: this.activeSessions.size
    };
    
    let totalHealthScore = 0;
    
    for (const [proxyId, proxy] of this.proxyPool) {
      if (this.blockedProxies.has(proxyId)) continue;
      
      if (proxy.healthScore >= this.config.minHealthScore) {
        stats.healthy++;
      } else {
        stats.unhealthy++;
      }
      
      totalHealthScore += proxy.healthScore;
      
      // By provider
      stats.byProvider[proxy.provider] = (stats.byProvider[proxy.provider] || 0) + 1;
      
      // By country
      stats.byCountry[proxy.geo.country] = (stats.byCountry[proxy.geo.country] || 0) + 1;
    }
    
    stats.avgHealthScore = totalHealthScore / (this.proxyPool.size - this.blockedProxies.size);
    
    console.log('\n📊 Proxy Pool Statistics:');
    console.log('========================');
    console.log(`Total Proxies: ${stats.total}`);
    console.log(`Healthy: ${stats.healthy} (${(stats.healthy / stats.total * 100).toFixed(1)}%)`);
    console.log(`Unhealthy: ${stats.unhealthy}`);
    console.log(`Blocked: ${stats.blocked}`);
    console.log(`Active Sessions: ${stats.activeSessions}`);
    console.log(`Avg Health Score: ${stats.avgHealthScore.toFixed(2)}`);
    
    console.log('\nBy Provider:');
    for (const [provider, count] of Object.entries(stats.byProvider)) {
      console.log(`  ${provider}: ${count}`);
    }
    
    console.log('\nBy Country:');
    for (const [country, count] of Object.entries(stats.byCountry)) {
      console.log(`  ${country}: ${count}`);
    }
    
    return stats;
  }

  async testProxyPerformance(sampleSize = 10) {
    console.log(`\n🧪 Testing proxy performance (${sampleSize} samples)...`);
    
    const results = [];
    const testUrl = 'https://www.example.com';
    
    for (let i = 0; i < sampleSize; i++) {
      try {
        const proxy = await this.getProxy({ requireResidential: true });
        const startTime = performance.now();
        
        const response = await axios.get(testUrl, {
          proxy: false,
          httpsAgent: new (require('https-proxy-agent'))(proxy.url),
          timeout: this.config.timeout,
          validateStatus: status => status === 200
        });
        
        const responseTime = performance.now() - startTime;
        
        results.push({
          proxyId: proxy.id,
          provider: proxy.provider,
          country: proxy.geo.country,
          responseTime,
          success: true
        });
        
        console.log(`  ✅ ${proxy.provider} (${proxy.geo.country}): ${responseTime.toFixed(0)}ms`);
        
      } catch (error) {
        results.push({
          error: error.message,
          success: false
        });
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
    
    // Calculate statistics
    const successful = results.filter(r => r.success);
    const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
    
    console.log('\n📊 Performance Test Results:');
    console.log(`  Success Rate: ${(successful.length / sampleSize * 100).toFixed(1)}%`);
    console.log(`  Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
    
    return results;
  }

  async shutdown() {
    console.log('🛑 Shutting down proxy rotation system...');
    
    if (this.healthMonitor) clearInterval(this.healthMonitor);
    if (this.rotationTimer) clearInterval(this.rotationTimer);
    
    // Save statistics
    const finalStats = this.reportProxyStatistics();
    
    this.emit('shutdown', { stats: finalStats, timestamp: Date.now() });
    
    console.log('✅ Proxy system shutdown complete');
  }
}

module.exports = ProxyRotationManager;