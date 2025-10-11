// scrapfly-client.ts
// Scrapfly premium API client with advanced anti-bot bypass

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export interface ScrapflyConfig {
    apiKey: string;
    endpoint?: string;
    asp?: boolean; // Anti-Scraping Protection
    renderJs?: boolean;
    country?: string;
    proxy?: 'residential' | 'datacenter';
    screenshots?: boolean;
    screenshotFlags?: string[];
    sessionId?: string;
    tags?: string[];
    debug?: boolean;
    correlationId?: string;
    webhookUrl?: string;
    timeout?: number;
    retryCount?: number;
    cache?: boolean;
    cacheTtl?: number;
    cacheClear?: boolean;
    dns?: boolean;
    ssl?: boolean;
    headers?: Record<string, string>;
}

export interface ScrapflyRequest {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    config?: Partial<ScrapflyConfig>;
}

export interface ScrapflyResponse {
    success: boolean;
    statusCode: number;
    headers: Record<string, string>;
    content: string;
    screenshot?: {
        url: string;
        base64?: string;
    };
    cost: {
        total: number;
        asp: number;
        renderJs: number;
        proxy: number;
        screenshot: number;
    };
    result: {
        url: string;
        status: number;
        reason: string;
        content: string;
        responseHeaders: Record<string, string>;
        responseTime: number;
        format: string;
    };
    config: {
        asp: {
            enabled: boolean;
            status: string;
            strategies: string[];
        };
        cache: {
            status: string;
            ttl: number;
        };
    };
    context: {
        asp: {
            cookiesDetected: boolean;
            javascriptDetected: boolean;
            solveDuration: number;
        };
        sessionId?: string;
        proxyType?: string;
        country?: string;
    };
    error?: string;
}

export interface ScrapflyStats {
    account: {
        subscription: string;
        creditsRemaining: number;
        creditsUsed: number;
        concurrentRequests: number;
    };
    usage: {
        last24h: number;
        last7d: number;
        last30d: number;
    };
}

export class ScrapflyClient {
    private config: ScrapflyConfig;
    private client: AxiosInstance;
    private stats: ScrapflyStats = {
        account: {
            subscription: 'unknown',
            creditsRemaining: 0,
            creditsUsed: 0,
            concurrentRequests: 0
        },
        usage: {
            last24h: 0,
            last7d: 0,
            last30d: 0
        }
    };

    constructor(config: ScrapflyConfig) {
        this.config = {
            endpoint: 'https://api.scrapfly.io/scrape',
            asp: true, // Enable Anti-Scraping Protection by default
            renderJs: true,
            proxy: 'residential',
            timeout: 60000,
            retryCount: 3,
            cache: false,
            cacheTtl: 3600,
            dns: true,
            ssl: true,
            ...config
        };

        this.client = axios.create({
            timeout: 120000, // 2 minutes
            headers: {
                'User-Agent': 'Scrapfly-Client/1.0'
            }
        });
    }

    async scrape(request: ScrapflyRequest): Promise<ScrapflyResponse> {
        console.log(`🪰 Scrapfly: Scraping ${request.url}`);
        const startTime = Date.now();

        try {
            const params = this.buildRequestParams(request);
            
            // Log configuration
            console.log(`⚙️ Config: ASP=${params.asp}, JS=${params.render_js}, Proxy=${params.proxy_pool}`);
            const estimatedCost = this.estimateCost(params);
            console.log(`💰 Estimated cost: ${estimatedCost} credits`);

            const response = await this.client.get(this.config.endpoint, { params });
            const data = response.data;
            const renderTime = Date.now() - startTime;

            // Update stats
            if (data.context?.account) {
                this.stats.account = data.context.account;
            }

            console.log(`✅ Scrapfly success in ${renderTime}ms`);
            console.log(`🛡️ ASP Status: ${data.config?.asp?.status || 'N/A'}`);
            console.log(`💳 Cost: ${data.cost?.total || 0} credits`);
            console.log(`📊 Credits remaining: ${this.stats.account.creditsRemaining}`);

            return this.formatResponse(data, renderTime);

        } catch (error) {
            const renderTime = Date.now() - startTime;
            console.error(`❌ Scrapfly error after ${renderTime}ms:`, error.message);

            if (error.response?.data) {
                return this.formatErrorResponse(error.response.data, renderTime);
            }

            throw error;
        }
    }

    private buildRequestParams(request: ScrapflyRequest): any {
        const config = { ...this.config, ...request.config };
        
        const params: any = {
            key: config.apiKey,
            url: request.url,
            asp: config.asp,
            render_js: config.renderJs,
            proxy_pool: config.proxy,
            country: config.country,
            timeout: Math.floor(config.timeout! / 1000), // Convert to seconds
            retry: config.retryCount,
            cache: config.cache,
            cache_ttl: config.cacheTtl,
            cache_clear: config.cacheClear,
            dns: config.dns,
            ssl: config.ssl,
            format: 'json'
        };

        // Add optional parameters
        if (config.screenshots) {
            params.screenshots = config.screenshotFlags?.join(',') || 'fullpage';
        }
        if (config.sessionId) {
            params.session = config.sessionId;
        }
        if (config.tags) {
            params.tags = config.tags.join(',');
        }
        if (config.debug) {
            params.debug = true;
        }
        if (config.correlationId) {
            params.correlation_id = config.correlationId;
        }
        if (config.webhookUrl) {
            params.webhook = config.webhookUrl;
        }
        if (config.headers) {
            params.headers = btoa(JSON.stringify(config.headers));
        }

        // Handle different HTTP methods
        if (request.method && request.method !== 'GET') {
            params.method = request.method;
            if (request.body) {
                params.body = btoa(
                    typeof request.body === 'string' ? 
                    request.body : 
                    JSON.stringify(request.body)
                );
            }
        }

        return params;
    }

    private formatResponse(data: any, renderTime: number): ScrapflyResponse {
        return {
            success: data.result?.status === 200,
            statusCode: data.result?.status || 0,
            headers: data.result?.response_headers || {},
            content: data.result?.content || '',
            screenshot: data.screenshot ? {
                url: data.screenshot,
                base64: data.screenshot_base64
            } : undefined,
            cost: {
                total: data.cost?.total || 0,
                asp: data.cost?.asp || 0,
                renderJs: data.cost?.render_js || 0,
                proxy: data.cost?.proxy_pool || 0,
                screenshot: data.cost?.screenshot || 0
            },
            result: {
                url: data.result?.url || '',
                status: data.result?.status || 0,
                reason: data.result?.reason || '',
                content: data.result?.content || '',
                responseHeaders: data.result?.response_headers || {},
                responseTime: renderTime,
                format: data.result?.format || 'html'
            },
            config: {
                asp: {
                    enabled: data.config?.asp || false,
                    status: data.config?.asp_status || 'disabled',
                    strategies: data.config?.asp_strategies || []
                },
                cache: {
                    status: data.config?.cache_status || 'miss',
                    ttl: data.config?.cache_ttl || 0
                }
            },
            context: {
                asp: {
                    cookiesDetected: data.context?.asp?.cookies_detected || false,
                    javascriptDetected: data.context?.asp?.javascript_detected || false,
                    solveDuration: data.context?.asp?.solve_duration || 0
                },
                sessionId: data.context?.session_id,
                proxyType: data.context?.proxy_type,
                country: data.context?.country
            }
        };
    }

    private formatErrorResponse(error: any, renderTime: number): ScrapflyResponse {
        return {
            success: false,
            statusCode: error.status || 0,
            headers: {},
            content: '',
            cost: {
                total: error.cost || 0,
                asp: 0,
                renderJs: 0,
                proxy: 0,
                screenshot: 0
            },
            result: {
                url: error.url || '',
                status: error.status || 0,
                reason: error.reason || 'Unknown error',
                content: '',
                responseHeaders: {},
                responseTime: renderTime,
                format: 'error'
            },
            config: {
                asp: { enabled: false, status: 'error', strategies: [] },
                cache: { status: 'miss', ttl: 0 }
            },
            context: {
                asp: {
                    cookiesDetected: false,
                    javascriptDetected: false,
                    solveDuration: 0
                }
            },
            error: error.message || error.error || 'Unknown error'
        };
    }

    private estimateCost(params: any): number {
        let cost = 1; // Base cost

        if (params.asp) cost += 10;
        if (params.render_js) cost += 5;
        if (params.proxy_pool === 'residential') cost += 25;
        if (params.screenshots) cost += 5;

        return cost;
    }

    async scrapeFliipa(path: string = '', options?: {
        waitForSelector?: string;
        sessionSticky?: boolean;
    }): Promise<ScrapflyResponse> {
        const url = `https://flippa.com${path}`;
        
        console.log(`🎯 Scrapfly: Targeting Flippa - ${url}`);
        
        // Generate session ID for sticky sessions
        const sessionId = options?.sessionSticky ? 
            `flippa_${crypto.randomBytes(8).toString('hex')}` : 
            undefined;

        return await this.scrape({
            url,
            config: {
                asp: true, // Maximum anti-bot protection
                renderJs: true,
                proxy: 'residential',
                country: 'US',
                sessionId,
                timeout: 90000, // 90 seconds for complex pages
                retryCount: 3,
                tags: ['flippa', 'marketplace'],
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            }
        });
    }

    async searchFlippaListings(query: string, options?: {
        page?: number;
        perPage?: number;
        filters?: Record<string, any>;
    }): Promise<ScrapflyResponse> {
        const params = new URLSearchParams({ q: query });
        
        if (options) {
            if (options.page) params.append('page', options.page.toString());
            if (options.perPage) params.append('per_page', options.perPage.toString());
            if (options.filters) {
                Object.entries(options.filters).forEach(([key, value]) => {
                    params.append(key, value.toString());
                });
            }
        }

        const searchUrl = `https://flippa.com/search?${params.toString()}`;
        
        return await this.scrape({
            url: searchUrl,
            config: {
                asp: true,
                renderJs: true,
                proxy: 'residential',
                screenshots: true,
                screenshotFlags: ['fullpage'],
                cache: true,
                cacheTtl: 300 // Cache for 5 minutes
            }
        });
    }

    async getAccountStats(): Promise<ScrapflyStats> {
        try {
            const response = await this.client.get('https://api.scrapfly.io/account', {
                params: { key: this.config.apiKey }
            });

            if (response.data) {
                this.stats = {
                    account: response.data.account || this.stats.account,
                    usage: response.data.usage || this.stats.usage
                };
            }
        } catch (error) {
            console.warn('Failed to fetch account stats:', error.message);
        }

        return { ...this.stats };
    }

    async checkCredits(): Promise<number> {
        const stats = await this.getAccountStats();
        return stats.account.creditsRemaining;
    }

    getConfig(): ScrapflyConfig {
        return { ...this.config };
    }

    // Create a sticky session for multiple related requests
    createSession(prefix: string = 'session'): string {
        return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
    }
}

export default ScrapflyClient;