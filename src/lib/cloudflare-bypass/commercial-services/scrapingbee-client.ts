// scrapingbee-client.ts
// ScrapingBee premium API client with advanced Cloudflare bypass

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export interface ScrapingBeeConfig {
    apiKey: string;
    endpoint?: string;
    premiumProxy?: boolean;
    javascriptRendering?: boolean;
    stealthMode?: boolean;
    blockResources?: boolean;
    blockAds?: boolean;
    screenshot?: boolean;
    returnPageSource?: boolean;
    waitForSelector?: string;
    waitForTimeout?: number;
    customGoogle?: boolean;
    countryCode?: string;
    device?: 'desktop' | 'mobile';
    cookies?: string;
    headers?: Record<string, string>;
}

export interface ScrapingBeeRequest {
    url: string;
    method?: 'GET' | 'POST';
    data?: any;
    config?: Partial<ScrapingBeeConfig>;
}

export interface ScrapingBeeResponse {
    success: boolean;
    statusCode: number;
    headers: Record<string, string>;
    content: string;
    screenshot?: string;
    cost: number;
    resolvedUrl: string;
    cookies: any[];
    renderTime: number;
    error?: string;
}

export interface UsageStats {
    creditsUsed: number;
    creditsRemaining: number;
    requestsToday: number;
    requestsThisMonth: number;
    successRate: number;
}

export class ScrapingBeeClient {
    private config: ScrapingBeeConfig;
    private client: AxiosInstance;
    private usageStats: UsageStats = {
        creditsUsed: 0,
        creditsRemaining: 0,
        requestsToday: 0,
        requestsThisMonth: 0,
        successRate: 100
    };

    constructor(config: ScrapingBeeConfig) {
        this.config = {
            endpoint: 'https://app.scrapingbee.com/api/v1',
            premiumProxy: true,
            javascriptRendering: true,
            stealthMode: true,
            blockResources: false,
            blockAds: true,
            screenshot: false,
            returnPageSource: true,
            waitForTimeout: 10000,
            device: 'desktop',
            ...config
        };

        this.client = axios.create({
            baseURL: this.config.endpoint,
            timeout: 120000, // 2 minutes timeout for complex pages
            headers: {
                'User-Agent': 'ScrapingBee-Client/1.0'
            }
        });

        // Add response interceptor for usage tracking
        this.client.interceptors.response.use(
            response => {
                this.updateUsageStats(response.headers);
                return response;
            },
            error => {
                if (error.response) {
                    this.updateUsageStats(error.response.headers);
                }
                return Promise.reject(error);
            }
        );
    }

    private updateUsageStats(headers: any): void {
        if (headers['spb-cost']) {
            this.usageStats.creditsUsed += parseInt(headers['spb-cost']);
        }
        if (headers['spb-credits-remaining']) {
            this.usageStats.creditsRemaining = parseInt(headers['spb-credits-remaining']);
        }
        if (headers['spb-requests-today']) {
            this.usageStats.requestsToday = parseInt(headers['spb-requests-today']);
        }
        if (headers['spb-requests-month']) {
            this.usageStats.requestsThisMonth = parseInt(headers['spb-requests-month']);
        }
    }

    async scrape(request: ScrapingBeeRequest): Promise<ScrapingBeeResponse> {
        console.log(`🐝 ScrapingBee: Scraping ${request.url}`);
        const startTime = Date.now();

        try {
            const params = this.buildRequestParams(request);
            
            // Log cost estimate
            const estimatedCost = this.estimateCost(params);
            console.log(`💰 Estimated cost: ${estimatedCost} credits`);

            const response = await this.client.get('/', {
                params,
                responseType: params.screenshot ? 'arraybuffer' : 'text'
            });

            const renderTime = Date.now() - startTime;
            const actualCost = parseInt(response.headers['spb-cost'] || '0');

            console.log(`✅ ScrapingBee success in ${renderTime}ms (Cost: ${actualCost} credits)`);
            console.log(`💳 Credits remaining: ${this.usageStats.creditsRemaining}`);

            return {
                success: true,
                statusCode: response.status,
                headers: this.extractHeaders(response.headers),
                content: params.screenshot ? 
                    Buffer.from(response.data).toString('base64') : 
                    response.data,
                screenshot: params.screenshot ? response.data : undefined,
                cost: actualCost,
                resolvedUrl: response.headers['spb-resolved-url'] || request.url,
                cookies: this.extractCookies(response.headers),
                renderTime
            };

        } catch (error) {
            const renderTime = Date.now() - startTime;
            console.error(`❌ ScrapingBee error after ${renderTime}ms:`, error.message);

            if (error.response) {
                const status = error.response.status;
                const errorMessage = this.getErrorMessage(status, error.response.data);
                
                return {
                    success: false,
                    statusCode: status,
                    headers: {},
                    content: '',
                    cost: parseInt(error.response.headers['spb-cost'] || '0'),
                    resolvedUrl: request.url,
                    cookies: [],
                    renderTime,
                    error: errorMessage
                };
            }

            throw error;
        }
    }

    private buildRequestParams(request: ScrapingBeeRequest): any {
        const config = { ...this.config, ...request.config };
        
        const params: any = {
            api_key: config.apiKey,
            url: request.url,
            render_js: config.javascriptRendering,
            premium_proxy: config.premiumProxy,
            stealth_proxy: config.stealthMode,
            block_resources: config.blockResources,
            block_ads: config.blockAds,
            screenshot: config.screenshot,
            return_page_source: config.returnPageSource,
            device: config.device
        };

        // Add optional parameters
        if (config.waitForSelector) {
            params.wait_for = config.waitForSelector;
        }
        if (config.waitForTimeout) {
            params.wait = config.waitForTimeout;
        }
        if (config.countryCode) {
            params.country_code = config.countryCode;
        }
        if (config.customGoogle) {
            params.custom_google = true;
        }
        if (config.cookies) {
            params.cookies = config.cookies;
        }
        if (config.headers) {
            params.forward_headers = true;
            Object.entries(config.headers).forEach(([key, value]) => {
                params[`forward_headers_${key.toLowerCase()}`] = value;
            });
        }

        // Handle POST requests
        if (request.method === 'POST' && request.data) {
            params.method = 'POST';
            params.data = typeof request.data === 'string' ? 
                request.data : 
                JSON.stringify(request.data);
        }

        return params;
    }

    private estimateCost(params: any): number {
        let cost = 1; // Base cost

        if (params.render_js) cost += 5;
        if (params.premium_proxy) cost += 10;
        if (params.stealth_proxy) cost += 15;
        if (params.screenshot) cost += 5;
        if (params.custom_google) cost += 20;

        return cost;
    }

    private extractHeaders(responseHeaders: any): Record<string, string> {
        const headers: Record<string, string> = {};
        
        // Extract forwarded headers
        Object.entries(responseHeaders).forEach(([key, value]) => {
            if (key.startsWith('spb-original-')) {
                const originalKey = key.replace('spb-original-', '');
                headers[originalKey] = value as string;
            }
        });

        return headers;
    }

    private extractCookies(headers: any): any[] {
        const cookies: any[] = [];
        
        if (headers['spb-cookies']) {
            try {
                const cookieData = JSON.parse(headers['spb-cookies']);
                cookies.push(...cookieData);
            } catch (error) {
                console.warn('Failed to parse cookies:', error);
            }
        }

        return cookies;
    }

    private getErrorMessage(status: number, data: any): string {
        const errorMap: Record<number, string> = {
            400: 'Bad request - Invalid parameters',
            401: 'Unauthorized - Invalid API key',
            402: 'Payment required - Insufficient credits',
            403: 'Forbidden - Access denied',
            404: 'Not found - Invalid endpoint',
            429: 'Rate limit exceeded',
            500: 'ScrapingBee server error',
            502: 'Bad gateway - Target site unreachable',
            503: 'Service unavailable',
            504: 'Gateway timeout - Target site too slow'
        };

        return errorMap[status] || `Unknown error (${status}): ${data}`;
    }

    async scrapeFliipa(path: string = ''): Promise<ScrapingBeeResponse> {
        const url = `https://flippa.com${path}`;
        
        console.log(`🎯 ScrapingBee: Targeting Flippa - ${url}`);
        
        return await this.scrape({
            url,
            config: {
                premiumProxy: true,
                stealthMode: true,
                javascriptRendering: true,
                blockAds: true,
                waitForTimeout: 15000,
                device: 'desktop',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1'
                }
            }
        });
    }

    async searchFlippaListings(query: string, filters?: {
        type?: string;
        minPrice?: number;
        maxPrice?: number;
        sortBy?: string;
    }): Promise<ScrapingBeeResponse> {
        const params = new URLSearchParams({ q: query });
        
        if (filters) {
            if (filters.type) params.append('type', filters.type);
            if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
            if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
            if (filters.sortBy) params.append('sort', filters.sortBy);
        }

        const searchUrl = `https://flippa.com/search?${params.toString()}`;
        
        return await this.scrape({
            url: searchUrl,
            config: {
                premiumProxy: true,
                stealthMode: true,
                javascriptRendering: true,
                waitForSelector: '.search-results, .listing-card, [data-testid*="listing"]',
                waitForTimeout: 20000
            }
        });
    }

    async getUsageStats(): Promise<UsageStats> {
        // Make a lightweight request to update stats
        try {
            await this.client.get('/', {
                params: {
                    api_key: this.config.apiKey,
                    url: 'https://httpbin.org/ip',
                    render_js: false
                }
            });
        } catch (error) {
            // Ignore errors, we just want the stats
        }

        return { ...this.usageStats };
    }

    async checkCredits(): Promise<number> {
        const stats = await this.getUsageStats();
        return stats.creditsRemaining;
    }

    getConfig(): ScrapingBeeConfig {
        return { ...this.config };
    }
}

export default ScrapingBeeClient;