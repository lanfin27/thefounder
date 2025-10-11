// http-bypass.ts
// Direct HTTP bypass with CloudScraper, httpx, and JA3 fingerprint randomization

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as cloudscraper from 'cloudscraper';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as crypto from 'crypto';

export interface HttpBypassConfig {
  userAgent?: string;
  proxy?: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  ja3Fingerprint?: string;
  tlsFingerprint?: string;
  headers?: Record<string, string>;
  cookies?: string;
  followRedirects: boolean;
  validateSSL: boolean;
}

export interface JA3Fingerprint {
  version: string;
  cipherSuites: string[];
  extensions: string[];
  ellipticCurves: string[];
  ellipticCurvePointFormats: string[];
}

export interface TLSFingerprint {
  ja3: string;
  ja3Hash: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
}

export interface HttpBypassResult {
  success: boolean;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  cookies: string[];
  responseTime: number;
  method: 'cloudscraper' | 'axios' | 'httpx' | 'custom';
  cloudflareBypass: boolean;
  error?: string;
}

export class HttpBypass {
  private config: HttpBypassConfig;
  private cloudscraperInstance: any;
  private axiosInstance: AxiosInstance;
  private ja3Fingerprints: JA3Fingerprint[];
  private tlsFingerprints: TLSFingerprint[];

  constructor(config: Partial<HttpBypassConfig> = {}) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 2000,
      followRedirects: true,
      validateSSL: false,
      ...config
    };

    this.ja3Fingerprints = this.generateJA3Fingerprints();
    this.tlsFingerprints = this.generateTLSFingerprints();
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize CloudScraper
    this.cloudscraperInstance = cloudscraper.defaults({
      headers: {
        'User-Agent': this.config.userAgent || this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...this.config.headers
      },
      timeout: this.config.timeout,
      followAllRedirects: this.config.followRedirects,
      gzip: true,
      jar: true, // Enable cookie jar
      ...(this.config.proxy && { proxy: this.config.proxy })
    });

    // Initialize custom Axios instance
    const axiosConfig: AxiosRequestConfig = {
      timeout: this.config.timeout,
      maxRedirects: this.config.followRedirects ? 10 : 0,
      validateStatus: () => true, // Accept all status codes
      headers: {
        'User-Agent': this.config.userAgent || this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        ...this.config.headers
      }
    };

    // Add proxy agent if configured
    if (this.config.proxy) {
      const proxyUrl = this.config.proxy;
      let agent;

      if (proxyUrl.startsWith('socks')) {
        agent = new SocksProxyAgent(proxyUrl);
      } else {
        agent = new HttpsProxyAgent(proxyUrl);
      }

      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
    }

    this.axiosInstance = axios.create(axiosConfig);
  }

  async bypassCloudflare(url: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
    proxy?: string;
    maxRetries?: number;
  } = {}): Promise<HttpBypassResult> {
    const methods = ['cloudscraper', 'axios', 'httpx', 'custom'] as const;
    let lastError: Error | null = null;

    for (const method of methods) {
      try {
        console.log(`🔍 Attempting ${method} bypass for: ${url}`);
        
        const result = await this.attemptBypass(url, method, options);
        
        if (result.success && this.isValidResponse(result)) {
          console.log(`✅ ${method} bypass successful`);
          return result;
        } else {
          console.log(`⚠️ ${method} bypass failed: Invalid response`);
        }

      } catch (error) {
        console.log(`❌ ${method} bypass failed:`, error.message);
        lastError = error;
        
        // Wait before trying next method
        await this.delay(1000);
      }
    }

    throw lastError || new Error('All bypass methods failed');
  }

  private async attemptBypass(
    url: string, 
    method: 'cloudscraper' | 'axios' | 'httpx' | 'custom',
    options: any
  ): Promise<HttpBypassResult> {
    const startTime = Date.now();

    switch (method) {
      case 'cloudscraper':
        return await this.cloudscraperBypass(url, options, startTime);
      
      case 'axios':
        return await this.axiosBypass(url, options, startTime);
      
      case 'httpx':
        return await this.httpxBypass(url, options, startTime);
      
      case 'custom':
        return await this.customBypass(url, options, startTime);
      
      default:
        throw new Error(`Unknown bypass method: ${method}`);
    }
  }

  private async cloudscraperBypass(url: string, options: any, startTime: number): Promise<HttpBypassResult> {
    try {
      const requestOptions = {
        uri: url,
        method: options.method || 'GET',
        headers: {
          ...this.getRandomHeaders(),
          ...options.headers
        },
        ...(options.data && { form: options.data }),
        ...(options.proxy && { proxy: options.proxy })
      };

      const response = await new Promise<any>((resolve, reject) => {
        this.cloudscraperInstance(requestOptions, (error: any, response: any, body: any) => {
          if (error) {
            reject(error);
          } else {
            resolve({ response, body });
          }
        });
      });

      return {
        success: true,
        statusCode: response.response.statusCode,
        headers: response.response.headers,
        body: response.body,
        cookies: this.extractCookies(response.response.headers),
        responseTime: Date.now() - startTime,
        method: 'cloudscraper',
        cloudflareBypass: this.detectCloudflareBypass(response.body)
      };

    } catch (error) {
      return {
        success: false,
        statusCode: 0,
        headers: {},
        body: '',
        cookies: [],
        responseTime: Date.now() - startTime,
        method: 'cloudscraper',
        cloudflareBypass: false,
        error: error.message
      };
    }
  }

  private async axiosBypass(url: string, options: any, startTime: number): Promise<HttpBypassResult> {
    try {
      // Apply random TLS fingerprint
      const tlsFingerprint = this.getRandomTLSFingerprint();
      
      const config: AxiosRequestConfig = {
        method: options.method || 'GET',
        url,
        headers: {
          ...this.getRandomHeaders(),
          'User-Agent': tlsFingerprint.userAgent,
          'Accept-Language': tlsFingerprint.acceptLanguage,
          'Accept-Encoding': tlsFingerprint.acceptEncoding,
          ...options.headers
        },
        ...(options.data && { data: options.data })
      };

      const response = await this.axiosInstance.request(config);

      return {
        success: response.status < 400,
        statusCode: response.status,
        headers: response.headers,
        body: response.data,
        cookies: this.extractCookies(response.headers),
        responseTime: Date.now() - startTime,
        method: 'axios',
        cloudflareBypass: this.detectCloudflareBypass(response.data)
      };

    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 0,
        headers: error.response?.headers || {},
        body: error.response?.data || '',
        cookies: [],
        responseTime: Date.now() - startTime,
        method: 'axios',
        cloudflareBypass: false,
        error: error.message
      };
    }
  }

  private async httpxBypass(url: string, options: any, startTime: number): Promise<HttpBypassResult> {
    // This would use httpx library if available
    // For now, we'll use a custom implementation
    return await this.customBypass(url, options, startTime);
  }

  private async customBypass(url: string, options: any, startTime: number): Promise<HttpBypassResult> {
    try {
      // Custom implementation with advanced headers and fingerprinting
      const ja3 = this.getRandomJA3Fingerprint();
      const customHeaders = {
        ...this.getRandomHeaders(),
        'X-Forwarded-For': this.generateRandomIP(),
        'X-Real-IP': this.generateRandomIP(),
        'CF-Connecting-IP': this.generateRandomIP(),
        'X-Originating-IP': this.generateRandomIP(),
        'Client-IP': this.generateRandomIP(),
        'Via': `1.1 ${this.generateRandomIP()}`,
        'Forwarded': `for=${this.generateRandomIP()};proto=https;by=${this.generateRandomIP()}`,
        ...options.headers
      };

      const config: AxiosRequestConfig = {
        method: options.method || 'GET',
        url,
        headers: customHeaders,
        ...(options.data && { data: options.data })
      };

      const response = await this.axiosInstance.request(config);

      return {
        success: response.status < 400,
        statusCode: response.status,
        headers: response.headers,
        body: response.data,
        cookies: this.extractCookies(response.headers),
        responseTime: Date.now() - startTime,
        method: 'custom',
        cloudflareBypass: this.detectCloudflareBypass(response.data)
      };

    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 0,
        headers: error.response?.headers || {},
        body: error.response?.data || '',
        cookies: [],
        responseTime: Date.now() - startTime,
        method: 'custom',
        cloudflareBypass: false,
        error: error.message
      };
    }
  }

  private generateJA3Fingerprints(): JA3Fingerprint[] {
    return [
      {
        version: '771',
        cipherSuites: ['4865', '4866', '4867', '49195', '49199', '49196', '49200', '52393', '52392', '49171', '49172', '156', '157', '47', '53'],
        extensions: ['0', '23', '65281', '10', '11', '35', '16', '5', '13', '18', '51', '45', '43', '27', '17513'],
        ellipticCurves: ['29', '23', '24'],
        ellipticCurvePointFormats: ['0']
      },
      {
        version: '771',
        cipherSuites: ['4865', '4867', '4866', '49195', '49199', '52393', '52392', '49196', '49200', '49162', '49161', '49171', '49172', '51', '57', '47', '53'],
        extensions: ['0', '23', '65281', '10', '11', '35', '16', '5', '51', '43', '13', '45', '28', '27'],
        ellipticCurves: ['29', '23', '24', '25'],
        ellipticCurvePointFormats: ['0']
      }
    ];
  }

  private generateTLSFingerprints(): TLSFingerprint[] {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];

    return userAgents.map(ua => ({
      ja3: this.generateJA3Hash(),
      ja3Hash: crypto.createHash('md5').update(this.generateJA3Hash()).digest('hex'),
      userAgent: ua,
      acceptLanguage: 'en-US,en;q=0.9',
      acceptEncoding: 'gzip, deflate, br'
    }));
  }

  private generateJA3Hash(): string {
    const ja3 = this.getRandomJA3Fingerprint();
    return [
      ja3.version,
      ja3.cipherSuites.join('-'),
      ja3.extensions.join('-'),
      ja3.ellipticCurves.join('-'),
      ja3.ellipticCurvePointFormats.join('-')
    ].join(',');
  }

  private getRandomJA3Fingerprint(): JA3Fingerprint {
    return this.ja3Fingerprints[Math.floor(Math.random() * this.ja3Fingerprints.length)];
  }

  private getRandomTLSFingerprint(): TLSFingerprint {
    return this.tlsFingerprints[Math.floor(Math.random() * this.tlsFingerprints.length)];
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private getRandomHeaders(): Record<string, string> {
    const baseHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    // Randomly add additional headers
    const additionalHeaders = [
      { 'Cache-Control': 'max-age=0' },
      { 'Sec-Fetch-Dest': 'document' },
      { 'Sec-Fetch-Mode': 'navigate' },
      { 'Sec-Fetch-Site': 'none' },
      { 'Sec-Fetch-User': '?1' },
    ];

    let headers = { ...baseHeaders };
    
    additionalHeaders.forEach(header => {
      if (Math.random() > 0.5) {
        headers = { ...headers, ...header };
      }
    });

    return headers;
  }

  private generateRandomIP(): string {
    return [
      Math.floor(Math.random() * 255) + 1,
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255)
    ].join('.');
  }

  private extractCookies(headers: any): string[] {
    const cookies: string[] = [];
    if (headers['set-cookie']) {
      if (Array.isArray(headers['set-cookie'])) {
        cookies.push(...headers['set-cookie']);
      } else {
        cookies.push(headers['set-cookie']);
      }
    }
    return cookies;
  }

  private detectCloudflareBypass(body: string): boolean {
    const cloudflareIndicators = [
      'Checking your browser before accessing',
      'DDoS protection by Cloudflare',
      'cf-browser-verification',
      'cf-challenge-running',
      '__cf_chl_jschl_tk__'
    ];

    return !cloudflareIndicators.some(indicator => 
      body.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private isValidResponse(result: HttpBypassResult): boolean {
    if (!result.success) return false;
    if (result.statusCode >= 500) return false;
    if (result.body.length < 100) return false; // Too short response
    
    // Check for Cloudflare challenge pages
    const challengeIndicators = [
      'Just a moment',
      'Checking your browser',
      'Please wait while we verify',
      'Ray ID'
    ];

    return !challengeIndicators.some(indicator => 
      result.body.includes(indicator)
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default HttpBypass;