// advanced-bypass-manager.ts
// Enhanced Cloudflare bypass manager with FlareSolverr integration and intelligent routing

import axios, { AxiosInstance } from 'axios';
import * as cloudscraper from 'cloudscraper';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface AdvancedBypassConfig {
    // FlareSolverr settings
    flareSolverrEndpoint: string;
    flareSolverrTimeout: number;
    flareSolverrEnabled: boolean;
    
    // Proxy settings
    proxies: ProxyConfig[];
    proxyRotation: boolean;
    proxyFailoverEnabled: boolean;
    
    // Browser settings
    browserPoolSize: number;
    browserTimeout: number;
    headless: boolean;
    
    // Request routing
    methodPriority: ('flaresolverr' | 'cloudscraper' | 'browser' | 'direct')[];
    adaptiveRouting: boolean;
    successRateThreshold: number;
    
    // Retry settings
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
}

export interface ProxyConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    protocol: 'http' | 'https' | 'socks4' | 'socks5';
    country?: string;
    successRate: number;
    lastUsed: number;
    failures: number;
}

export interface BypassResult {
    success: boolean;
    method: string;
    url: string;
    statusCode: number;
    headers: Record<string, string>;
    content: string;
    cookies: any[];
    responseTime: number;
    proxyUsed?: ProxyConfig;
    cloudflareDetected: boolean;
    error?: string;
    retryCount: number;
}

export interface MethodStats {
    name: string;
    attempts: number;
    successes: number;
    failures: number;
    avgResponseTime: number;
    successRate: number;
    lastUsed: number;
}

export class AdvancedBypassManager {
    private config: AdvancedBypassConfig;
    private methodStats: Map<string, MethodStats> = new Map();
    private proxyIndex: number = 0;
    private browserPool: Browser[] = [];
    private flareSolverrClient: AxiosInstance;
    private cloudscraperInstance: any;

    constructor(config: Partial<AdvancedBypassConfig> = {}) {
        this.config = {
            flareSolverrEndpoint: 'http://localhost:8191/v1',
            flareSolverrTimeout: 60000,
            flareSolverrEnabled: true,
            proxies: [],
            proxyRotation: true,
            proxyFailoverEnabled: true,
            browserPoolSize: 3,
            browserTimeout: 45000,
            headless: true,
            methodPriority: ['flaresolverr', 'cloudscraper', 'browser', 'direct'],
            adaptiveRouting: true,
            successRateThreshold: 0.7,
            maxRetries: 3,
            retryDelay: 5000,
            exponentialBackoff: true,
            ...config
        };

        this.initializeClients();
        this.initializeMethodStats();
    }

    private initializeClients(): void {
        // Initialize FlareSolverr client
        this.flareSolverrClient = axios.create({
            baseURL: this.config.flareSolverrEndpoint,
            timeout: this.config.flareSolverrTimeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Initialize CloudScraper
        this.cloudscraperInstance = cloudscraper.defaults({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 30000,
            followAllRedirects: true,
            gzip: true,
            jar: true
        });
    }

    private initializeMethodStats(): void {
        for (const method of this.config.methodPriority) {
            this.methodStats.set(method, {
                name: method,
                attempts: 0,
                successes: 0,
                failures: 0,
                avgResponseTime: 0,
                successRate: 1.0,
                lastUsed: 0
            });
        }
    }

    async initialize(): Promise<void> {
        console.log('🚀 Initializing Advanced Bypass Manager...');

        // Test FlareSolverr connection if enabled
        if (this.config.flareSolverrEnabled) {
            await this.testFlareSolverrConnection();
        }

        // Initialize browser pool
        await this.initializeBrowserPool();

        // Test proxies
        await this.testProxies();

        console.log('✅ Advanced Bypass Manager initialized');
    }

    private async testFlareSolverrConnection(): Promise<void> {
        try {
            const response = await this.flareSolverrClient.get('');
            if (response.data && response.data.msg) {
                console.log('✅ FlareSolverr connection successful');
            }
        } catch (error) {
            console.warn('⚠️ FlareSolverr connection failed:', error.message);
            console.log('🔧 Starting FlareSolverr Alternative...');
            
            // Start our alternative FlareSolverr service
            try {
                const FlareSolverrAlternative = require('../../../scripts/setup-flaresolverr-alternative.js');
                const service = new FlareSolverrAlternative();
                await service.start();
                console.log('✅ FlareSolverr Alternative started');
            } catch (altError) {
                console.warn('⚠️ Could not start FlareSolverr Alternative:', altError.message);
                this.config.flareSolverrEnabled = false;
            }
        }
    }

    private async initializeBrowserPool(): Promise<void> {
        console.log(`🌐 Initializing browser pool (${this.config.browserPoolSize} browsers)...`);

        for (let i = 0; i < this.config.browserPoolSize; i++) {
            try {
                const browser = await chromium.launch({
                    headless: this.config.headless,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled',
                        '--disable-features=VizDisplayCompositor'
                    ]
                });
                this.browserPool.push(browser);
            } catch (error) {
                console.warn(`⚠️ Failed to initialize browser ${i + 1}:`, error.message);
            }
        }

        console.log(`✅ Browser pool initialized with ${this.browserPool.length} browsers`);
    }

    private async testProxies(): Promise<void> {
        if (this.config.proxies.length === 0) {
            console.log('ℹ️ No proxies configured');
            return;
        }

        console.log(`🔍 Testing ${this.config.proxies.length} proxies...`);

        const testPromises = this.config.proxies.map(async (proxy, index) => {
            try {
                const proxyUrl = this.buildProxyUrl(proxy);
                const agent = proxy.protocol.startsWith('socks') 
                    ? new SocksProxyAgent(proxyUrl)
                    : new HttpsProxyAgent(proxyUrl);

                const startTime = Date.now();
                const response = await axios.get('https://httpbin.org/ip', {
                    httpsAgent: agent,
                    httpAgent: agent,
                    timeout: 10000
                });

                const responseTime = Date.now() - startTime;
                proxy.successRate = 1.0;
                proxy.lastUsed = Date.now();
                proxy.failures = 0;

                console.log(`✅ Proxy ${index + 1}: ${proxy.host}:${proxy.port} (${responseTime}ms)`);
                return true;

            } catch (error) {
                proxy.successRate = 0.0;
                proxy.failures = 1;
                console.log(`❌ Proxy ${index + 1}: ${proxy.host}:${proxy.port} - ${error.message}`);
                return false;
            }
        });

        const results = await Promise.allSettled(testPromises);
        const workingProxies = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        console.log(`📊 Proxy test complete: ${workingProxies}/${this.config.proxies.length} working`);
    }

    private buildProxyUrl(proxy: ProxyConfig): string {
        const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
        return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
    }

    private getNextProxy(): ProxyConfig | null {
        if (this.config.proxies.length === 0) return null;

        // Sort proxies by success rate and last used time
        const availableProxies = this.config.proxies
            .filter(p => p.successRate > 0.3) // Only use proxies with >30% success rate
            .sort((a, b) => {
                const aScore = a.successRate - (Date.now() - a.lastUsed) / 1000000;
                const bScore = b.successRate - (Date.now() - b.lastUsed) / 1000000;
                return bScore - aScore;
            });

        if (availableProxies.length === 0) {
            // Reset all proxy success rates if none are available
            this.config.proxies.forEach(p => {
                p.successRate = 0.5;
                p.failures = 0;
            });
            return this.config.proxies[0];
        }

        const proxy = availableProxies[0];
        proxy.lastUsed = Date.now();
        return proxy;
    }

    private getOptimalMethod(): string {
        if (!this.config.adaptiveRouting) {
            return this.config.methodPriority[0];
        }

        // Sort methods by success rate and response time
        const sortedMethods = Array.from(this.methodStats.values())
            .filter(stats => stats.attempts > 0)
            .sort((a, b) => {
                const aScore = a.successRate - (a.avgResponseTime / 10000);
                const bScore = b.successRate - (b.avgResponseTime / 10000);
                return bScore - aScore;
            });

        if (sortedMethods.length === 0 || sortedMethods[0].successRate < this.config.successRateThreshold) {
            return this.config.methodPriority[0];
        }

        return sortedMethods[0].name;
    }

    private updateMethodStats(method: string, success: boolean, responseTime: number): void {
        const stats = this.methodStats.get(method);
        if (!stats) return;

        stats.attempts++;
        stats.lastUsed = Date.now();

        if (success) {
            stats.successes++;
        } else {
            stats.failures++;
        }

        stats.successRate = stats.successes / stats.attempts;
        stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
    }

    async bypassCloudflare(url: string, options: {
        method?: 'GET' | 'POST';
        data?: any;
        headers?: Record<string, string>;
        forceMethod?: string;
        useProxy?: boolean;
    } = {}): Promise<BypassResult> {
        console.log(`🎯 Starting advanced Cloudflare bypass for: ${url}`);

        const methods = options.forceMethod 
            ? [options.forceMethod]
            : this.config.adaptiveRouting 
                ? [this.getOptimalMethod()] 
                : this.config.methodPriority;

        let lastError: Error | null = null;
        let retryCount = 0;

        while (retryCount < this.config.maxRetries) {
            for (const method of methods) {
                try {
                    console.log(`🔄 Attempt ${retryCount + 1}/${this.config.maxRetries} using method: ${method}`);
                    
                    const result = await this.attemptBypass(url, method, options);
                    
                    if (result.success) {
                        this.updateMethodStats(method, true, result.responseTime);
                        console.log(`✅ Bypass successful with ${method}`);
                        return { ...result, retryCount };
                    } else {
                        this.updateMethodStats(method, false, result.responseTime);
                    }

                } catch (error) {
                    console.log(`❌ Method ${method} failed:`, error.message);
                    this.updateMethodStats(method, false, 0);
                    lastError = error;
                }
            }

            retryCount++;
            if (retryCount < this.config.maxRetries) {
                const delay = this.config.exponentialBackoff 
                    ? this.config.retryDelay * Math.pow(2, retryCount - 1)
                    : this.config.retryDelay;
                
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError || new Error('All bypass methods failed');
    }

    private async attemptBypass(
        url: string, 
        method: string, 
        options: any
    ): Promise<BypassResult> {
        const startTime = Date.now();
        const proxy = options.useProxy !== false ? this.getNextProxy() : null;

        switch (method) {
            case 'flaresolverr':
                return await this.flareSolverrBypass(url, options, proxy, startTime);
            
            case 'cloudscraper':
                return await this.cloudscraperBypass(url, options, proxy, startTime);
            
            case 'browser':
                return await this.browserBypass(url, options, proxy, startTime);
            
            case 'direct':
                return await this.directBypass(url, options, proxy, startTime);
            
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    private async flareSolverrBypass(
        url: string, 
        options: any, 
        proxy: ProxyConfig | null, 
        startTime: number
    ): Promise<BypassResult> {
        if (!this.config.flareSolverrEnabled) {
            throw new Error('FlareSolverr is disabled');
        }

        // Create session
        const sessionId = `session_${Date.now()}`;
        await this.flareSolverrClient.post('', {
            cmd: 'sessions.create',
            session: sessionId
        });

        try {
            const requestData = {
                cmd: options.method === 'POST' ? 'request.post' : 'request.get',
                session: sessionId,
                url,
                maxTimeout: this.config.flareSolverrTimeout,
                ...(options.headers && { headers: options.headers }),
                ...(options.data && { postData: JSON.stringify(options.data) }),
                ...(proxy && { proxy: { url: this.buildProxyUrl(proxy) } })
            };

            const response = await this.flareSolverrClient.post('', requestData);
            const result = response.data;

            if (result.status === 'error') {
                throw new Error(`FlareSolverr error: ${result.message}`);
            }

            const solution = result.solution;
            return {
                success: solution.status < 400,
                method: 'flaresolverr',
                url: solution.url,
                statusCode: solution.status,
                headers: solution.headers,
                content: solution.response,
                cookies: solution.cookies,
                responseTime: Date.now() - startTime,
                proxyUsed: proxy,
                cloudflareDetected: !this.isValidBypassResult(solution.response),
                retryCount: 0
            };

        } finally {
            // Cleanup session
            try {
                await this.flareSolverrClient.post('', {
                    cmd: 'sessions.destroy',
                    session: sessionId
                });
            } catch (error) {
                console.warn('Failed to cleanup FlareSolverr session:', error.message);
            }
        }
    }

    private async cloudscraperBypass(
        url: string, 
        options: any, 
        proxy: ProxyConfig | null, 
        startTime: number
    ): Promise<BypassResult> {
        const requestOptions = {
            uri: url,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...options.headers
            },
            ...(options.data && { form: options.data }),
            ...(proxy && { proxy: this.buildProxyUrl(proxy) })
        };

        return new Promise((resolve, reject) => {
            this.cloudscraperInstance(requestOptions, (error: any, response: any, body: any) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve({
                    success: response.statusCode < 400,
                    method: 'cloudscraper',
                    url: response.request.href,
                    statusCode: response.statusCode,
                    headers: response.headers,
                    content: body,
                    cookies: this.extractCookies(response.headers),
                    responseTime: Date.now() - startTime,
                    proxyUsed: proxy,
                    cloudflareDetected: !this.isValidBypassResult(body),
                    retryCount: 0
                });
            });
        });
    }

    private async browserBypass(
        url: string, 
        options: any, 
        proxy: ProxyConfig | null, 
        startTime: number
    ): Promise<BypassResult> {
        if (this.browserPool.length === 0) {
            throw new Error('No browsers available');
        }

        const browser = this.browserPool[Math.floor(Math.random() * this.browserPool.length)];
        const contextOptions: any = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1366, height: 768 },
            ignoreHTTPSErrors: true
        };

        if (proxy) {
            contextOptions.proxy = {
                server: this.buildProxyUrl(proxy)
            };
        }

        const context = await browser.newContext(contextOptions);
        const page = await context.newPage();

        try {
            // Apply stealth measures
            await this.applyStealthMeasures(page);

            const response = await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: this.config.browserTimeout
            });

            // Handle Cloudflare challenge
            await this.handleCloudflareChallenge(page);

            const content = await page.content();
            const cookies = await context.cookies();

            return {
                success: true,
                method: 'browser',
                url: page.url(),
                statusCode: response?.status() || 200,
                headers: {},
                content,
                cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
                responseTime: Date.now() - startTime,
                proxyUsed: proxy,
                cloudflareDetected: !this.isValidBypassResult(content),
                retryCount: 0
            };

        } finally {
            await context.close();
        }
    }

    private async directBypass(
        url: string, 
        options: any, 
        proxy: ProxyConfig | null, 
        startTime: number
    ): Promise<BypassResult> {
        const axiosConfig: any = {
            method: options.method || 'GET',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...options.headers
            },
            timeout: 30000,
            ...(options.data && { data: options.data })
        };

        if (proxy) {
            const agent = proxy.protocol.startsWith('socks')
                ? new SocksProxyAgent(this.buildProxyUrl(proxy))
                : new HttpsProxyAgent(this.buildProxyUrl(proxy));
            
            axiosConfig.httpsAgent = agent;
            axiosConfig.httpAgent = agent;
        }

        const response = await axios.request(axiosConfig);

        return {
            success: response.status < 400,
            method: 'direct',
            url: response.config.url || url,
            statusCode: response.status,
            headers: response.headers,
            content: response.data,
            cookies: this.extractCookies(response.headers),
            responseTime: Date.now() - startTime,
            proxyUsed: proxy,
            cloudflareDetected: !this.isValidBypassResult(response.data),
            retryCount: 0
        };
    }

    private async applyStealthMeasures(page: Page): Promise<void> {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        });

        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        });
    }

    private async handleCloudflareChallenge(page: Page): Promise<void> {
        const maxWaitTime = 30000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            try {
                const isChallengePage = await page.evaluate(() => {
                    return document.title.includes('Just a moment') ||
                           document.body.innerHTML.includes('Checking your browser') ||
                           document.body.innerHTML.includes('Please wait while we verify');
                });

                if (!isChallengePage) {
                    return;
                }

                console.log('⏳ Cloudflare challenge detected, waiting...');
                await page.waitForTimeout(3000);

            } catch (error) {
                console.warn('⚠️ Error during challenge handling:', error.message);
                break;
            }
        }
    }

    private isValidBypassResult(content: string): boolean {
        const challengeIndicators = [
            'Just a moment',
            'Checking your browser',
            'Please wait while we verify',
            'Ray ID',
            'cf-browser-verification'
        ];

        return !challengeIndicators.some(indicator => 
            content.toLowerCase().includes(indicator.toLowerCase())
        );
    }

    private extractCookies(headers: any): any[] {
        const cookies: any[] = [];
        if (headers['set-cookie']) {
            if (Array.isArray(headers['set-cookie'])) {
                cookies.push(...headers['set-cookie']);
            } else {
                cookies.push(headers['set-cookie']);
            }
        }
        return cookies;
    }

    getStatistics(): {
        methodStats: MethodStats[];
        proxyStats: {
            total: number;
            working: number;
            avgSuccessRate: number;
        };
        browserPoolSize: number;
    } {
        const methodStats = Array.from(this.methodStats.values());
        const workingProxies = this.config.proxies.filter(p => p.successRate > 0.3);
        const avgSuccessRate = this.config.proxies.length > 0
            ? this.config.proxies.reduce((sum, p) => sum + p.successRate, 0) / this.config.proxies.length
            : 0;

        return {
            methodStats,
            proxyStats: {
                total: this.config.proxies.length,
                working: workingProxies.length,
                avgSuccessRate
            },
            browserPoolSize: this.browserPool.length
        };
    }

    async cleanup(): Promise<void> {
        console.log('🧹 Cleaning up Advanced Bypass Manager...');

        // Close browser pool
        for (const browser of this.browserPool) {
            try {
                await browser.close();
            } catch (error) {
                console.warn('Error closing browser:', error.message);
            }
        }
        this.browserPool = [];

        console.log('✅ Advanced Bypass Manager cleaned up');
    }
}

export default AdvancedBypassManager;