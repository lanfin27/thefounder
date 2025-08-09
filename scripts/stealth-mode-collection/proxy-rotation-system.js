// proxy-rotation-system.js
// Multi-layer proxy rotation with residential IPs and geographic distribution

const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const geoip = require('geoip-lite');
const crypto = require('crypto');

class ProxyRotationSystem {
  constructor(config = {}) {
    this.config = {
      providers: ['luminati', 'smartproxy', 'oxylabs', 'geosurf'],
      minProxies: 100,
      rotationInterval: 50, // requests per proxy
      healthCheckInterval: 300000, // 5 minutes
      geoDistribution: {
        'US': 0.45,
        'CA': 0.10,
        'GB': 0.15,
        'AU': 0.10,
        'DE': 0.05,
        'FR': 0.05,
        'JP': 0.05,
        'OTHER': 0.05
      },
      ...config
    };

    // Proxy pools by type and location
    this.proxyPools = {
      residential: new Map(),
      datacenter: new Map(),
      mobile: new Map()
    };

    // Proxy health tracking
    this.proxyHealth = new Map();
    
    // Usage statistics
    this.usageStats = new Map();
    
    // Blocked proxies temporary storage
    this.blockedProxies = new Map();
    
    // Geographic targeting
    this.geoTargeting = {
      enabled: true,
      matchUserDemographics: true,
      cityLevel: false
    };

    // Initialize proxy pools
    this.initializeProxyPools();
  }

  async initializeProxyPools() {
    console.log('🌐 Initializing multi-layer proxy system...');
    
    // Load proxies from providers
    for (const provider of this.config.providers) {
      await this.loadProxiesFromProvider(provider);
    }
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log(`✅ Proxy system initialized:`);
    console.log(`   Residential: ${this.proxyPools.residential.size} proxies`);
    console.log(`   Datacenter: ${this.proxyPools.datacenter.size} proxies`);
    console.log(`   Mobile: ${this.proxyPools.mobile.size} proxies`);
  }

  async loadProxiesFromProvider(provider) {
    const proxies = await this.fetchProviderProxies(provider);
    
    for (const proxy of proxies) {
      // Validate and categorize proxy
      const validated = await this.validateProxy(proxy);
      if (!validated) continue;
      
      // Add to appropriate pool
      const pool = this.proxyPools[proxy.type];
      const country = proxy.country || 'OTHER';
      
      if (!pool.has(country)) {
        pool.set(country, []);
      }
      
      pool.get(country).push({
        ...proxy,
        provider,
        addedAt: Date.now(),
        lastUsed: null,
        requestCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        bandwidthUsed: 0
      });
      
      // Initialize health tracking
      this.proxyHealth.set(proxy.id, {
        status: 'healthy',
        lastCheck: Date.now(),
        latency: 0,
        successRate: 100,
        blocked: false
      });
    }
  }

  async fetchProviderProxies(provider) {
    // Provider-specific API integration
    const providers = {
      luminati: async () => {
        // Simulated Luminati API response
        return this.generateResidentialProxies('luminati', 50);
      },
      
      smartproxy: async () => {
        // Simulated SmartProxy API response
        return this.generateResidentialProxies('smartproxy', 40);
      },
      
      oxylabs: async () => {
        // Simulated Oxylabs API response
        return this.generateMixedProxies('oxylabs', 35);
      },
      
      geosurf: async () => {
        // Simulated GeoSurf API response
        return this.generateResidentialProxies('geosurf', 25);
      }
    };
    
    const fetchFunction = providers[provider];
    if (!fetchFunction) {
      console.error(`Unknown provider: ${provider}`);
      return [];
    }
    
    try {
      return await fetchFunction();
    } catch (error) {
      console.error(`Failed to fetch proxies from ${provider}:`, error.message);
      return [];
    }
  }

  generateResidentialProxies(provider, count) {
    const proxies = [];
    const countries = Object.keys(this.config.geoDistribution);
    
    for (let i = 0; i < count; i++) {
      const country = this.selectCountryByDistribution();
      const city = this.selectCityForCountry(country);
      
      proxies.push({
        id: `${provider}_res_${crypto.randomBytes(8).toString('hex')}`,
        type: 'residential',
        protocol: Math.random() > 0.3 ? 'http' : 'socks5',
        host: this.generateResidentialIP(country),
        port: this.generatePort(),
        username: `user_${crypto.randomBytes(4).toString('hex')}`,
        password: crypto.randomBytes(16).toString('hex'),
        country: country,
        city: city,
        isp: this.selectISP(country),
        asn: this.generateASN(country),
        mobile: false,
        rotating: Math.random() > 0.5,
        sticky: Math.random() > 0.7 ? 300 : null // Sticky session in seconds
      });
    }
    
    return proxies;
  }

  generateMixedProxies(provider, count) {
    const proxies = [];
    const types = ['residential', 'datacenter', 'mobile'];
    const typeDistribution = [0.6, 0.3, 0.1]; // 60% residential, 30% datacenter, 10% mobile
    
    for (let i = 0; i < count; i++) {
      const type = this.weightedRandom(types, typeDistribution);
      const country = this.selectCountryByDistribution();
      
      proxies.push({
        id: `${provider}_${type}_${crypto.randomBytes(8).toString('hex')}`,
        type: type,
        protocol: type === 'datacenter' ? 'http' : (Math.random() > 0.3 ? 'http' : 'socks5'),
        host: this.generateIPForType(type, country),
        port: this.generatePort(),
        username: `user_${crypto.randomBytes(4).toString('hex')}`,
        password: crypto.randomBytes(16).toString('hex'),
        country: country,
        city: this.selectCityForCountry(country),
        isp: type === 'datacenter' ? this.selectDatacenterProvider() : this.selectISP(country),
        asn: this.generateASN(country),
        mobile: type === 'mobile',
        rotating: type !== 'datacenter' && Math.random() > 0.5,
        bandwidth: type === 'datacenter' ? 'unlimited' : '100GB'
      });
    }
    
    return proxies;
  }

  selectCountryByDistribution() {
    const countries = Object.keys(this.config.geoDistribution);
    const weights = Object.values(this.config.geoDistribution);
    return this.weightedRandom(countries, weights);
  }

  selectCityForCountry(country) {
    const cities = {
      'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'],
      'CA': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa'],
      'GB': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds'],
      'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
      'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'],
      'FR': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice'],
      'JP': ['Tokyo', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka']
    };
    
    const countryCities = cities[country] || ['Capital City'];
    return countryCities[Math.floor(Math.random() * countryCities.length)];
  }

  generateResidentialIP(country) {
    // Generate realistic residential IP ranges by country
    const ipRanges = {
      'US': ['72.', '98.', '174.', '24.', '71.', '76.', '108.'],
      'CA': ['99.', '70.', '174.', '206.', '184.'],
      'GB': ['81.', '86.', '82.', '90.', '92.'],
      'AU': ['1.', '49.', '101.', '110.', '203.'],
      'DE': ['84.', '87.', '91.', '79.', '217.'],
      'FR': ['82.', '88.', '90.', '109.', '212.'],
      'JP': ['114.', '119.', '121.', '126.', '220.']
    };
    
    const countryRanges = ipRanges[country] || ['192.'];
    const prefix = countryRanges[Math.floor(Math.random() * countryRanges.length)];
    
    return prefix + 
      Math.floor(Math.random() * 255) + '.' +
      Math.floor(Math.random() * 255) + '.' +
      Math.floor(Math.random() * 255);
  }

  generateIPForType(type, country) {
    if (type === 'residential' || type === 'mobile') {
      return this.generateResidentialIP(country);
    }
    
    // Datacenter IPs
    const datacenterRanges = ['104.', '107.', '185.', '45.', '195.', '5.'];
    const prefix = datacenterRanges[Math.floor(Math.random() * datacenterRanges.length)];
    
    return prefix +
      Math.floor(Math.random() * 255) + '.' +
      Math.floor(Math.random() * 255) + '.' +
      Math.floor(Math.random() * 255);
  }

  generatePort() {
    // Common proxy ports
    const ports = [8080, 8888, 3128, 1080, 9050, 8118, 8123, 3129, 10000, 1081];
    return ports[Math.floor(Math.random() * ports.length)];
  }

  selectISP(country) {
    const isps = {
      'US': ['Comcast', 'Charter', 'AT&T', 'Verizon', 'Cox', 'Spectrum', 'Xfinity'],
      'CA': ['Bell', 'Rogers', 'Telus', 'Shaw', 'Videotron'],
      'GB': ['BT', 'Virgin Media', 'Sky', 'TalkTalk', 'EE'],
      'AU': ['Telstra', 'Optus', 'TPG', 'iiNet', 'Vodafone'],
      'DE': ['Deutsche Telekom', 'Vodafone', 'O2', '1&1', 'Unitymedia'],
      'FR': ['Orange', 'SFR', 'Bouygues', 'Free', 'Numericable'],
      'JP': ['NTT', 'SoftBank', 'KDDI', 'Rakuten', 'IIJ']
    };
    
    const countryISPs = isps[country] || ['Local ISP'];
    return countryISPs[Math.floor(Math.random() * countryISPs.length)];
  }

  selectDatacenterProvider() {
    const providers = ['Amazon AWS', 'Google Cloud', 'Microsoft Azure', 'DigitalOcean', 'Linode', 'OVH', 'Hetzner'];
    return providers[Math.floor(Math.random() * providers.length)];
  }

  generateASN(country) {
    // Realistic ASN ranges by country
    const asnRanges = {
      'US': [7922, 701, 7018, 20001, 22773, 11351],
      'CA': [577, 6327, 852, 15290, 803],
      'GB': [2856, 5089, 5462, 8468, 12576],
      'AU': [1221, 4804, 7545, 9443, 10084],
      'DE': [3320, 6724, 8881, 13184, 24940],
      'FR': [3215, 5410, 8228, 12876, 16276],
      'JP': [2497, 2516, 4713, 7506, 17676]
    };
    
    const countryASNs = asnRanges[country] || [13335]; // Cloudflare as default
    return 'AS' + countryASNs[Math.floor(Math.random() * countryASNs.length)];
  }

  async validateProxy(proxy) {
    try {
      const agent = this.createProxyAgent(proxy);
      const testUrl = 'http://httpbin.org/ip';
      
      const startTime = Date.now();
      const response = await axios.get(testUrl, {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      
      // Verify IP matches
      const returnedIP = response.data.origin;
      if (!returnedIP.includes(proxy.host.split('.')[0])) {
        console.warn(`Proxy ${proxy.id} returned different IP: ${returnedIP}`);
      }
      
      // Update proxy health
      this.updateProxyHealth(proxy.id, {
        latency: responseTime,
        status: 'healthy',
        lastCheck: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error(`Proxy validation failed for ${proxy.id}:`, error.message);
      return false;
    }
  }

  createProxyAgent(proxy) {
    const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
    const proxyUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
    
    if (proxy.protocol === 'socks5' || proxy.protocol === 'socks4') {
      return new SocksProxyAgent(proxyUrl);
    } else {
      return new HttpsProxyAgent(proxyUrl);
    }
  }

  async getNextProxy(options = {}) {
    const {
      type = 'residential',
      country = null,
      city = null,
      excludeBlocked = true,
      preferSticky = false,
      requireHTTPS = false
    } = options;
    
    // Select country based on distribution if not specified
    const targetCountry = country || this.selectCountryByDistribution();
    
    // Get proxy pool
    const pool = this.proxyPools[type];
    if (!pool || !pool.has(targetCountry)) {
      // Fallback to any country
      const availableCountries = Array.from(pool.keys());
      if (availableCountries.length === 0) {
        throw new Error(`No ${type} proxies available`);
      }
      const fallbackCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)];
      return this.selectProxyFromCountry(pool.get(fallbackCountry), options);
    }
    
    // Get country-specific proxies
    let countryProxies = pool.get(targetCountry);
    
    // Filter by city if specified
    if (city) {
      countryProxies = countryProxies.filter(p => p.city === city);
    }
    
    // Filter blocked proxies
    if (excludeBlocked) {
      countryProxies = countryProxies.filter(p => {
        const health = this.proxyHealth.get(p.id);
        return health && !health.blocked && health.status === 'healthy';
      });
    }
    
    // Filter by protocol if HTTPS required
    if (requireHTTPS) {
      countryProxies = countryProxies.filter(p => p.protocol === 'http' || p.protocol === 'https');
    }
    
    // Prefer sticky sessions if requested
    if (preferSticky) {
      const stickyProxies = countryProxies.filter(p => p.sticky);
      if (stickyProxies.length > 0) {
        countryProxies = stickyProxies;
      }
    }
    
    if (countryProxies.length === 0) {
      throw new Error(`No suitable ${type} proxies available for ${targetCountry}`);
    }
    
    // Select proxy with rotation logic
    return this.selectProxyFromCountry(countryProxies, options);
  }

  selectProxyFromCountry(proxies, options) {
    // Sort by usage (least used first)
    const sorted = proxies.sort((a, b) => {
      const aUsage = a.requestCount / (Date.now() - a.addedAt);
      const bUsage = b.requestCount / (Date.now() - b.addedAt);
      return aUsage - bUsage;
    });
    
    // Select from top candidates with some randomness
    const candidates = sorted.slice(0, Math.min(5, sorted.length));
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Update usage
    selected.lastUsed = Date.now();
    selected.requestCount++;
    
    // Update usage stats
    this.updateUsageStats(selected);
    
    // Create proxy configuration
    return {
      ...selected,
      agent: this.createProxyAgent(selected),
      rotateAfter: this.config.rotationInterval
    };
  }

  updateUsageStats(proxy) {
    const key = `${proxy.provider}_${proxy.type}_${proxy.country}`;
    
    if (!this.usageStats.has(key)) {
      this.usageStats.set(key, {
        requests: 0,
        bandwidth: 0,
        failures: 0,
        avgResponseTime: 0
      });
    }
    
    const stats = this.usageStats.get(key);
    stats.requests++;
  }

  async rotateProxy(currentProxy, reason = 'scheduled') {
    console.log(`🔄 Rotating proxy ${currentProxy.id} (${reason})`);
    
    // Mark current proxy for cooldown
    if (reason === 'blocked' || reason === 'failed') {
      this.blockProxy(currentProxy.id, reason === 'blocked' ? 3600000 : 300000); // 1 hour or 5 minutes
    }
    
    // Get new proxy with same characteristics
    const newProxy = await this.getNextProxy({
      type: currentProxy.type,
      country: currentProxy.country,
      excludeBlocked: true
    });
    
    return newProxy;
  }

  blockProxy(proxyId, duration) {
    const health = this.proxyHealth.get(proxyId);
    if (health) {
      health.blocked = true;
      health.blockedUntil = Date.now() + duration;
      health.status = 'blocked';
    }
    
    this.blockedProxies.set(proxyId, {
      blockedAt: Date.now(),
      unblockAt: Date.now() + duration,
      reason: 'detection'
    });
    
    // Schedule unblock
    setTimeout(() => this.unblockProxy(proxyId), duration);
  }

  unblockProxy(proxyId) {
    const health = this.proxyHealth.get(proxyId);
    if (health) {
      health.blocked = false;
      health.status = 'healthy';
      delete health.blockedUntil;
    }
    
    this.blockedProxies.delete(proxyId);
    console.log(`✅ Proxy ${proxyId} unblocked`);
  }

  updateProxyHealth(proxyId, updates) {
    const health = this.proxyHealth.get(proxyId) || {};
    this.proxyHealth.set(proxyId, { ...health, ...updates });
  }

  async testProxySpeed(proxy) {
    const urls = [
      'http://www.google.com',
      'http://www.amazon.com',
      'http://www.facebook.com'
    ];
    
    const speeds = [];
    
    for (const url of urls) {
      try {
        const startTime = Date.now();
        await axios.get(url, {
          httpAgent: proxy.agent,
          httpsAgent: proxy.agent,
          timeout: 10000
        });
        speeds.push(Date.now() - startTime);
      } catch (error) {
        speeds.push(10000); // Timeout as max speed
      }
    }
    
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    
    this.updateProxyHealth(proxy.id, {
      latency: avgSpeed,
      lastSpeedTest: Date.now()
    });
    
    return avgSpeed;
  }

  startHealthMonitoring() {
    setInterval(async () => {
      console.log('🏥 Running proxy health check...');
      
      const proxiesToCheck = [];
      
      // Collect proxies needing health check
      for (const [type, pool] of Object.entries(this.proxyPools)) {
        for (const [country, proxies] of pool) {
          for (const proxy of proxies) {
            const health = this.proxyHealth.get(proxy.id);
            if (!health || Date.now() - health.lastCheck > this.config.healthCheckInterval) {
              proxiesToCheck.push(proxy);
            }
          }
        }
      }
      
      // Check health in batches
      const batchSize = 10;
      for (let i = 0; i < proxiesToCheck.length; i += batchSize) {
        const batch = proxiesToCheck.slice(i, i + batchSize);
        await Promise.all(batch.map(proxy => this.checkProxyHealth(proxy)));
      }
      
      // Clean up blocked proxies
      for (const [proxyId, blockInfo] of this.blockedProxies) {
        if (Date.now() > blockInfo.unblockAt) {
          this.unblockProxy(proxyId);
        }
      }
      
      console.log(`✅ Health check complete. Healthy: ${this.getHealthyProxyCount()}`);
    }, this.config.healthCheckInterval);
  }

  async checkProxyHealth(proxy) {
    try {
      const speed = await this.testProxySpeed(proxy);
      
      // Calculate success rate
      const failureRate = proxy.failureCount / Math.max(1, proxy.requestCount);
      const successRate = (1 - failureRate) * 100;
      
      this.updateProxyHealth(proxy.id, {
        status: speed < 5000 && successRate > 80 ? 'healthy' : 'degraded',
        latency: speed,
        successRate: successRate,
        lastCheck: Date.now()
      });
      
    } catch (error) {
      this.updateProxyHealth(proxy.id, {
        status: 'unhealthy',
        lastCheck: Date.now(),
        lastError: error.message
      });
    }
  }

  getHealthyProxyCount() {
    let count = 0;
    for (const [id, health] of this.proxyHealth) {
      if (health.status === 'healthy' && !health.blocked) {
        count++;
      }
    }
    return count;
  }

  async handleProxyFailure(proxy, error) {
    proxy.failureCount++;
    
    // Update health
    const health = this.proxyHealth.get(proxy.id);
    if (health) {
      health.successRate = ((proxy.requestCount - proxy.failureCount) / proxy.requestCount) * 100;
      
      // Block if failure rate too high
      if (proxy.failureCount > 5 && health.successRate < 50) {
        this.blockProxy(proxy.id, 1800000); // 30 minutes
      }
    }
    
    // Log failure pattern
    console.error(`Proxy ${proxy.id} failed: ${error.message}`);
    
    // Rotate to new proxy
    return await this.rotateProxy(proxy, 'failed');
  }

  getProxyStats() {
    const stats = {
      total: 0,
      healthy: 0,
      blocked: 0,
      byType: {},
      byCountry: {},
      byProvider: {}
    };
    
    for (const [type, pool] of Object.entries(this.proxyPools)) {
      stats.byType[type] = 0;
      
      for (const [country, proxies] of pool) {
        stats.byCountry[country] = (stats.byCountry[country] || 0) + proxies.length;
        stats.total += proxies.length;
        stats.byType[type] += proxies.length;
        
        for (const proxy of proxies) {
          stats.byProvider[proxy.provider] = (stats.byProvider[proxy.provider] || 0) + 1;
          
          const health = this.proxyHealth.get(proxy.id);
          if (health) {
            if (health.status === 'healthy' && !health.blocked) {
              stats.healthy++;
            } else if (health.blocked) {
              stats.blocked++;
            }
          }
        }
      }
    }
    
    return stats;
  }

  weightedRandom(items, weights) {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }

  // Export proxy configuration for browser
  exportProxyConfig(proxy) {
    return {
      server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password,
      bypass: ['localhost', '127.0.0.1', '*.local']
    };
  }
}

module.exports = ProxyRotationSystem;