// proxy-manager.ts
// Advanced proxy rotation system with residential proxy support

import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import axios, { AxiosInstance } from 'axios';

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  country?: string;
  city?: string;
  isp?: string;
  type: 'datacenter' | 'residential' | 'mobile';
  sticky?: boolean; // Session-based rotation
  sessionId?: string;
}

export interface ProxyProvider {
  name: string;
  endpoint: string;
  authentication: {
    username: string;
    password: string;
  };
  rotate(): Promise<ProxyConfig>;
  getProxies(count?: number): Promise<ProxyConfig[]>;
  validateProxy(proxy: ProxyConfig): Promise<boolean>;
}

export interface ProxyTestResult {
  proxy: ProxyConfig;
  success: boolean;
  responseTime: number;
  ip: string;
  country: string;
  error?: string;
}

export class ProxyManager {
  private providers: Map<string, ProxyProvider> = new Map();
  private activeProxies: ProxyConfig[] = [];
  private blacklistedProxies: Set<string> = new Set();
  private currentProxyIndex: number = 0;
  private testClient: AxiosInstance;

  constructor() {
    this.testClient = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  // Add Bright Data provider
  addBrightDataProvider(config: {
    username: string;
    password: string;
    endpoint?: string;
    zone?: string;
  }): void {
    const provider: ProxyProvider = {
      name: 'BrightData',
      endpoint: config.endpoint || 'brd.superproxy.io:22225',
      authentication: {
        username: config.username,
        password: config.password
      },
      
      async rotate(): Promise<ProxyConfig> {
        // Bright Data session-based rotation
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const [host, port] = this.endpoint.split(':');
        
        return {
          host,
          port: parseInt(port),
          username: `${this.authentication.username}-session-${sessionId}`,
          password: this.authentication.password,
          protocol: 'http',
          type: 'residential',
          sticky: true,
          sessionId
        };
      },

      async getProxies(count = 10): Promise<ProxyConfig[]> {
        const proxies: ProxyConfig[] = [];
        for (let i = 0; i < count; i++) {
          proxies.push(await this.rotate());
        }
        return proxies;
      },

      async validateProxy(proxy: ProxyConfig): Promise<boolean> {
        return true; // Bright Data proxies are generally reliable
      }
    };

    this.providers.set('brightdata', provider);
    console.log('✅ Bright Data provider added');
  }

  // Add Oxylabs provider
  addOxylabsProvider(config: {
    username: string;
    password: string;
    endpoint?: string;
  }): void {
    const provider: ProxyProvider = {
      name: 'Oxylabs',
      endpoint: config.endpoint || 'pr.oxylabs.io:7777',
      authentication: {
        username: config.username,
        password: config.password
      },

      async rotate(): Promise<ProxyConfig> {
        const [host, port] = this.endpoint.split(':');
        const sessionId = `session_${Date.now()}`;
        
        return {
          host,
          port: parseInt(port),
          username: `${this.authentication.username}-session-${sessionId}`,
          password: this.authentication.password,
          protocol: 'http',
          type: 'residential',
          sticky: true,
          sessionId
        };
      },

      async getProxies(count = 10): Promise<ProxyConfig[]> {
        const proxies: ProxyConfig[] = [];
        for (let i = 0; i < count; i++) {
          proxies.push(await this.rotate());
        }
        return proxies;
      },

      async validateProxy(proxy: ProxyConfig): Promise<boolean> {
        return true; // Oxylabs proxies are generally reliable
      }
    };

    this.providers.set('oxylabs', provider);
    console.log('✅ Oxylabs provider added');
  }

  // Add SmartProxy provider
  addSmartProxyProvider(config: {
    username: string;
    password: string;
    endpoint?: string;
  }): void {
    const provider: ProxyProvider = {
      name: 'SmartProxy',
      endpoint: config.endpoint || 'gate.smartproxy.com:7000',
      authentication: {
        username: config.username,
        password: config.password
      },

      async rotate(): Promise<ProxyConfig> {
        const [host, port] = this.endpoint.split(':');
        
        return {
          host,
          port: parseInt(port),
          username: this.authentication.username,
          password: this.authentication.password,
          protocol: 'http',
          type: 'residential',
          sticky: false
        };
      },

      async getProxies(count = 10): Promise<ProxyConfig[]> {
        const proxies: ProxyConfig[] = [];
        const baseProxy = await this.rotate();
        
        for (let i = 0; i < count; i++) {
          proxies.push({ ...baseProxy });
        }
        return proxies;
      },

      async validateProxy(proxy: ProxyConfig): Promise<boolean> {
        return true;
      }
    };

    this.providers.set('smartproxy', provider);
    console.log('✅ SmartProxy provider added');
  }

  // Add free proxy list
  addFreeProxies(proxies: ProxyConfig[]): void {
    this.activeProxies.push(...proxies);
    console.log(`✅ Added ${proxies.length} free proxies`);
  }

  // Initialize proxy rotation
  async initializeProxies(count: number = 20): Promise<void> {
    console.log('🔄 Initializing proxy rotation...');
    
    const allProxies: ProxyConfig[] = [];
    
    for (const provider of this.providers.values()) {
      try {
        const proxies = await provider.getProxies(Math.ceil(count / this.providers.size));
        allProxies.push(...proxies);
        console.log(`✅ Got ${proxies.length} proxies from ${provider.name}`);
      } catch (error) {
        console.error(`❌ Failed to get proxies from ${provider.name}:`, error.message);
      }
    }

    // Test proxies in parallel
    console.log('🧪 Testing proxy connectivity...');
    const testResults = await this.testProxies(allProxies);
    
    // Keep only working proxies
    this.activeProxies = testResults
      .filter(result => result.success)
      .map(result => result.proxy);

    console.log(`✅ Initialized ${this.activeProxies.length} working proxies`);
    
    if (this.activeProxies.length === 0) {
      console.warn('⚠️ No working proxies found! Consider using direct connection.');
    }
  }

  // Get next proxy in rotation
  getNextProxy(): ProxyConfig | null {
    if (this.activeProxies.length === 0) {
      return null;
    }

    // Skip blacklisted proxies
    let attempts = 0;
    let proxy: ProxyConfig;
    
    do {
      proxy = this.activeProxies[this.currentProxyIndex];
      this.currentProxyIndex = (this.currentProxyIndex + 1) % this.activeProxies.length;
      attempts++;
      
      if (attempts > this.activeProxies.length) {
        // All proxies are blacklisted, clear blacklist
        console.log('🔄 All proxies blacklisted, clearing blacklist...');
        this.blacklistedProxies.clear();
        break;
      }
    } while (this.isBlacklisted(proxy));

    return proxy;
  }

  // Get fresh proxy from provider
  async getFreshProxy(providerName?: string): Promise<ProxyConfig | null> {
    if (providerName && this.providers.has(providerName)) {
      const provider = this.providers.get(providerName)!;
      try {
        return await provider.rotate();
      } catch (error) {
        console.error(`❌ Failed to get fresh proxy from ${providerName}:`, error.message);
        return null;
      }
    }

    // Get from any available provider
    for (const provider of this.providers.values()) {
      try {
        return await provider.rotate();
      } catch (error) {
        console.warn(`⚠️ Provider ${provider.name} failed:`, error.message);
        continue;
      }
    }

    return null;
  }

  // Test proxy connectivity
  async testProxy(proxy: ProxyConfig, testUrl: string = 'https://httpbin.org/ip'): Promise<ProxyTestResult> {
    const proxyUrl = this.buildProxyUrl(proxy);
    const startTime = Date.now();

    try {
      let agent;
      
      if (proxy.protocol.startsWith('socks')) {
        agent = new SocksProxyAgent(proxyUrl);
      } else {
        agent = new HttpsProxyAgent(proxyUrl);
      }

      const response = await this.testClient.get(testUrl, {
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;
      const data = response.data;

      return {
        proxy,
        success: true,
        responseTime,
        ip: data.origin || 'unknown',
        country: data.country || 'unknown'
      };

    } catch (error) {
      return {
        proxy,
        success: false,
        responseTime: Date.now() - startTime,
        ip: 'failed',
        country: 'unknown',
        error: error.message
      };
    }
  }

  // Test multiple proxies in parallel
  async testProxies(proxies: ProxyConfig[], concurrency: number = 10): Promise<ProxyTestResult[]> {
    const results: ProxyTestResult[] = [];
    
    for (let i = 0; i < proxies.length; i += concurrency) {
      const batch = proxies.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(proxy => this.testProxy(proxy))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }

      // Progress logging
      const progress = Math.min(i + concurrency, proxies.length);
      console.log(`📊 Tested ${progress}/${proxies.length} proxies`);
    }

    return results;
  }

  // Blacklist proxy
  blacklistProxy(proxy: ProxyConfig, reason?: string): void {
    const proxyKey = `${proxy.host}:${proxy.port}`;
    this.blacklistedProxies.add(proxyKey);
    console.log(`🚫 Blacklisted proxy ${proxyKey}: ${reason || 'unknown reason'}`);
  }

  // Check if proxy is blacklisted
  isBlacklisted(proxy: ProxyConfig): boolean {
    const proxyKey = `${proxy.host}:${proxy.port}`;
    return this.blacklistedProxies.has(proxyKey);
  }

  // Build proxy URL
  buildProxyUrl(proxy: ProxyConfig): string {
    const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
    return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
  }

  // Create axios instance with proxy
  createProxyClient(proxy?: ProxyConfig): AxiosInstance {
    if (!proxy) {
      proxy = this.getNextProxy();
    }

    if (!proxy) {
      return axios.create(); // No proxy available
    }

    const proxyUrl = this.buildProxyUrl(proxy);
    let agent;

    if (proxy.protocol.startsWith('socks')) {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }

    return axios.create({
      httpsAgent: agent,
      httpAgent: agent,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
  }

  // Get proxy statistics
  getStatistics(): {
    totalProxies: number;
    activeProxies: number;
    blacklistedProxies: number;
    providers: string[];
  } {
    return {
      totalProxies: this.activeProxies.length,
      activeProxies: this.activeProxies.length - this.blacklistedProxies.size,
      blacklistedProxies: this.blacklistedProxies.size,
      providers: Array.from(this.providers.keys())
    };
  }

  // Refresh proxy list
  async refresh(): Promise<void> {
    console.log('🔄 Refreshing proxy list...');
    this.blacklistedProxies.clear();
    this.activeProxies = [];
    await this.initializeProxies();
  }

  // Clean up resources
  cleanup(): void {
    this.activeProxies = [];
    this.blacklistedProxies.clear();
    this.providers.clear();
    console.log('🧹 Proxy manager cleaned up');
  }
}

export default ProxyManager;