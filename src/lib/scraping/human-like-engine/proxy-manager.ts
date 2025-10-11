// proxy-manager.ts
// Residential Proxy Rotation System with Intelligent Selection

export interface ProxyConfig {
  provider: 'residential' | 'datacenter' | 'mobile';
  rotation: 'sticky' | 'rotating' | 'intelligent';
  countries?: string[];
  cities?: string[];
  asn?: string[];
  poolSize?: number;
}

export interface Proxy {
  id: string;
  type: 'residential' | 'datacenter' | 'mobile';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country: string;
  city?: string;
  asn?: string;
  lastUsed?: Date;
  successRate: number;
  responseTime: number;
  failures: number;
  status: 'active' | 'cooling' | 'blacklisted';
}

export class ProxyManager {
  private proxies: Map<string, Proxy> = new Map();
  private config: ProxyConfig;
  private currentProxy: Proxy | null = null;
  private blacklist: Set<string> = new Set();
  private cooldownMap: Map<string, number> = new Map();
  
  // Performance tracking
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };

  constructor(config: ProxyConfig) {
    this.config = config;
    this.initializeProxyPool();
  }

  private initializeProxyPool() {
    // In production, this would connect to actual proxy providers
    // For now, we'll simulate with mock data
    const mockProxies: Proxy[] = [
      {
        id: 'resi-1',
        type: 'residential',
        host: 'proxy1.residential.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
        country: 'US',
        city: 'New York',
        asn: 'AS7922',
        successRate: 98,
        responseTime: 450,
        failures: 0,
        status: 'active'
      },
      {
        id: 'resi-2',
        type: 'residential',
        host: 'proxy2.residential.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
        country: 'US',
        city: 'Los Angeles',
        asn: 'AS701',
        successRate: 96,
        responseTime: 520,
        failures: 0,
        status: 'active'
      },
      {
        id: 'resi-3',
        type: 'residential',
        host: 'proxy3.residential.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
        country: 'US',
        city: 'Chicago',
        asn: 'AS209',
        successRate: 97,
        responseTime: 480,
        failures: 0,
        status: 'active'
      }
    ];

    // Add more proxies based on pool size
    const poolSize = this.config.poolSize || 10;
    for (let i = mockProxies.length; i < poolSize; i++) {
      mockProxies.push(this.generateMockProxy(i));
    }

    // Initialize proxy map
    mockProxies.forEach(proxy => {
      this.proxies.set(proxy.id, proxy);
    });

    console.log(`Initialized proxy pool with ${this.proxies.size} proxies`);
  }

  private generateMockProxy(index: number): Proxy {
    const cities = ['Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin'];
    const asns = ['AS7922', 'AS701', 'AS209', 'AS3356', 'AS1239'];
    
    return {
      id: `resi-${index + 1}`,
      type: 'residential',
      host: `proxy${index + 1}.residential.example.com`,
      port: 8080,
      username: 'user',
      password: 'pass',
      country: 'US',
      city: cities[index % cities.length],
      asn: asns[index % asns.length],
      successRate: Math.floor(Math.random() * 5) + 95,
      responseTime: Math.floor(Math.random() * 200) + 400,
      failures: 0,
      status: 'active'
    };
  }

  // Get next proxy based on rotation strategy
  async getNextProxy(): Promise<Proxy> {
    this.updateCooldowns();
    
    switch (this.config.rotation) {
      case 'sticky':
        return this.getStickyProxy();
      case 'rotating':
        return this.getRotatingProxy();
      case 'intelligent':
      default:
        return this.getIntelligentProxy();
    }
  }

  // Sticky session - use same proxy
  private async getStickyProxy(): Promise<Proxy> {
    if (this.currentProxy && this.currentProxy.status === 'active') {
      return this.currentProxy;
    }
    
    // Need new proxy
    return this.getIntelligentProxy();
  }

  // Simple rotation
  private async getRotatingProxy(): Promise<Proxy> {
    const activeProxies = Array.from(this.proxies.values())
      .filter(p => p.status === 'active' && !this.blacklist.has(p.id));
    
    if (activeProxies.length === 0) {
      throw new Error('No active proxies available');
    }
    
    // Round-robin selection
    const proxy = activeProxies[Math.floor(Math.random() * activeProxies.length)];
    this.currentProxy = proxy;
    proxy.lastUsed = new Date();
    
    return proxy;
  }

  // Intelligent selection based on performance
  private async getIntelligentProxy(): Promise<Proxy> {
    const activeProxies = Array.from(this.proxies.values())
      .filter(p => {
        // Filter criteria
        if (p.status !== 'active') return false;
        if (this.blacklist.has(p.id)) return false;
        if (p.failures > 3) return false;
        if (p.successRate < 90) return false;
        
        // Country filter
        if (this.config.countries && !this.config.countries.includes(p.country)) {
          return false;
        }
        
        // City filter
        if (this.config.cities && p.city && !this.config.cities.includes(p.city)) {
          return false;
        }
        
        return true;
      });
    
    if (activeProxies.length === 0) {
      // Fallback to any active proxy
      const fallback = Array.from(this.proxies.values())
        .find(p => p.status === 'active' && !this.blacklist.has(p.id));
      
      if (!fallback) {
        throw new Error('No proxies available');
      }
      
      return fallback;
    }
    
    // Score and sort proxies
    const scoredProxies = activeProxies.map(proxy => {
      let score = 0;
      
      // Success rate weight: 40%
      score += (proxy.successRate / 100) * 40;
      
      // Response time weight: 30% (lower is better)
      const normalizedResponseTime = Math.max(0, 100 - (proxy.responseTime / 10));
      score += (normalizedResponseTime / 100) * 30;
      
      // Freshness weight: 20% (prefer less recently used)
      const minutesSinceLastUse = proxy.lastUsed 
        ? (Date.now() - proxy.lastUsed.getTime()) / 60000 
        : 60;
      const freshness = Math.min(100, minutesSinceLastUse * 2);
      score += (freshness / 100) * 20;
      
      // Failure penalty: -10% per failure
      score -= proxy.failures * 10;
      
      // Bonus for matching location preferences
      if (this.config.cities && proxy.city && this.config.cities.includes(proxy.city)) {
        score += 10;
      }
      
      return { proxy, score: Math.max(0, score) };
    });
    
    // Sort by score (highest first)
    scoredProxies.sort((a, b) => b.score - a.score);
    
    // Select from top performers with some randomization
    const topCount = Math.min(3, scoredProxies.length);
    const selected = scoredProxies[Math.floor(Math.random() * topCount)];
    
    this.currentProxy = selected.proxy;
    selected.proxy.lastUsed = new Date();
    
    return selected.proxy;
  }

  // Report proxy performance
  async reportProxyPerformance(proxyId: string, success: boolean, responseTime?: number) {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return;
    
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
      
      // Update proxy metrics
      const oldSuccessRate = proxy.successRate;
      const totalRequests = Math.floor(100 / (100 - oldSuccessRate));
      const newSuccessRate = ((oldSuccessRate * totalRequests + 100) / (totalRequests + 1));
      proxy.successRate = Math.round(newSuccessRate);
      
      if (responseTime) {
        const oldAvgTime = proxy.responseTime;
        proxy.responseTime = Math.round((oldAvgTime * 0.7 + responseTime * 0.3));
      }
      
      // Reset failures on success
      if (proxy.failures > 0) {
        proxy.failures = Math.max(0, proxy.failures - 1);
      }
    } else {
      this.metrics.failedRequests++;
      proxy.failures++;
      
      // Update success rate
      const oldSuccessRate = proxy.successRate;
      const totalRequests = Math.floor(100 / (100 - oldSuccessRate));
      const newSuccessRate = ((oldSuccessRate * totalRequests) / (totalRequests + 1));
      proxy.successRate = Math.round(newSuccessRate);
      
      // Handle failures
      if (proxy.failures >= 5) {
        this.blacklistProxy(proxyId, 3600000); // 1 hour
      } else if (proxy.failures >= 3) {
        this.cooldownProxy(proxyId, 300000); // 5 minutes
      }
    }
    
    // Update global metrics
    this.updateGlobalMetrics();
  }

  // Blacklist a proxy
  private blacklistProxy(proxyId: string, duration?: number) {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return;
    
    proxy.status = 'blacklisted';
    this.blacklist.add(proxyId);
    
    if (duration) {
      setTimeout(() => {
        this.blacklist.delete(proxyId);
        if (proxy.status === 'blacklisted') {
          proxy.status = 'active';
          proxy.failures = 0;
        }
      }, duration);
    }
    
    console.log(`Proxy ${proxyId} blacklisted for ${duration ? duration / 1000 + 's' : 'indefinitely'}`);
  }

  // Cooldown a proxy
  private cooldownProxy(proxyId: string, duration: number) {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return;
    
    proxy.status = 'cooling';
    this.cooldownMap.set(proxyId, Date.now() + duration);
    
    console.log(`Proxy ${proxyId} on cooldown for ${duration / 1000}s`);
  }

  // Update cooldown statuses
  private updateCooldowns() {
    const now = Date.now();
    
    for (const [proxyId, cooldownEnd] of this.cooldownMap.entries()) {
      if (now >= cooldownEnd) {
        const proxy = this.proxies.get(proxyId);
        if (proxy && proxy.status === 'cooling') {
          proxy.status = 'active';
          proxy.failures = Math.max(0, proxy.failures - 1);
        }
        this.cooldownMap.delete(proxyId);
      }
    }
  }

  // Update global metrics
  private updateGlobalMetrics() {
    const successRate = this.metrics.totalRequests > 0
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
      : 0;
    
    // Calculate average response time from all proxies
    const activeProxies = Array.from(this.proxies.values())
      .filter(p => p.status === 'active' && p.responseTime > 0);
    
    if (activeProxies.length > 0) {
      this.metrics.averageResponseTime = Math.round(
        activeProxies.reduce((sum, p) => sum + p.responseTime, 0) / activeProxies.length
      );
    }
  }

  // Get proxy configuration for Playwright
  getPlaywrightProxy(proxy: Proxy): any {
    return {
      server: `${proxy.type}://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password
    };
  }

  // Get proxy statistics
  getStatistics() {
    const activeCount = Array.from(this.proxies.values())
      .filter(p => p.status === 'active').length;
    
    const blacklistedCount = this.blacklist.size;
    const coolingCount = Array.from(this.proxies.values())
      .filter(p => p.status === 'cooling').length;
    
    return {
      total: this.proxies.size,
      active: activeCount,
      blacklisted: blacklistedCount,
      cooling: coolingCount,
      metrics: this.metrics,
      topPerformers: Array.from(this.proxies.values())
        .filter(p => p.status === 'active')
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          country: p.country,
          city: p.city,
          successRate: p.successRate,
          responseTime: p.responseTime
        }))
    };
  }

  // Reset all proxies
  resetProxies() {
    this.blacklist.clear();
    this.cooldownMap.clear();
    
    for (const proxy of this.proxies.values()) {
      proxy.status = 'active';
      proxy.failures = 0;
      proxy.successRate = 95;
      proxy.lastUsed = undefined;
    }
    
    console.log('All proxies reset');
  }
}

export default ProxyManager;