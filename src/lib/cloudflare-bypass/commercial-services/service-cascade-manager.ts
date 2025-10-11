// service-cascade-manager.ts
// Intelligent cascading system for commercial scraping services

import { EventEmitter } from 'events';
import ScrapingBeeClient, { ScrapingBeeResponse } from './scrapingbee-client';
import ScrapflyClient, { ScrapflyResponse } from './scrapfly-client';
import FlareSolverrClient from '../flaresolverr-client';
import crypto from 'crypto';

export interface ServiceConfig {
    priority: number;
    enabled: boolean;
    costPerRequest: number;
    successRate: number;
    avgResponseTime: number;
    maxRetries: number;
    timeout: number;
}

export interface CascadeConfig {
    services: {
        flaresolverr?: {
            endpoint: string;
            config?: ServiceConfig;
        };
        scrapingbee?: {
            apiKey: string;
            config?: ServiceConfig;
        };
        scrapfly?: {
            apiKey: string;
            config?: ServiceConfig;
        };
    };
    
    costOptimization: {
        maxCostPerRequest: number;
        monthlyBudget: number;
        cacheEnabled: boolean;
        cacheTTL: number;
        deduplicationWindow: number;
    };
    
    performance: {
        timeout: number;
        retryDelay: number;
        circuitBreakerThreshold: number;
        circuitBreakerTimeout: number;
    };
}

export interface CascadeRequest {
    url: string;
    method?: 'GET' | 'POST';
    data?: any;
    headers?: Record<string, string>;
    options?: {
        forceService?: 'flaresolverr' | 'scrapingbee' | 'scrapfly';
        bypassCache?: boolean;
        priority?: 'low' | 'normal' | 'high';
        maxCost?: number;
    };
}

export interface CascadeResponse {
    success: boolean;
    service: string;
    url: string;
    statusCode: number;
    content: string;
    headers: Record<string, string>;
    cookies: any[];
    cost: number;
    responseTime: number;
    cached: boolean;
    attempts: Array<{
        service: string;
        success: boolean;
        statusCode: number;
        error?: string;
        cost: number;
        duration: number;
    }>;
}

interface CacheEntry {
    key: string;
    response: CascadeResponse;
    timestamp: number;
    hits: number;
}

interface RequestDedup {
    hash: string;
    timestamp: number;
    promise: Promise<CascadeResponse>;
}

export class ServiceCascadeManager extends EventEmitter {
    private config: CascadeConfig;
    private services: Map<string, any> = new Map();
    private serviceStats: Map<string, ServiceConfig> = new Map();
    private cache: Map<string, CacheEntry> = new Map();
    private dedupMap: Map<string, RequestDedup> = new Map();
    private monthlySpend: number = 0;
    private monthStartDate: Date = new Date();

    constructor(config: CascadeConfig) {
        super();
        this.config = config;
        this.initializeServices();
        this.startMaintenanceTasks();
    }

    private initializeServices(): void {
        console.log('🚀 Initializing Service Cascade Manager...');

        // Initialize FlareSolverr (free tier)
        if (this.config.services.flaresolverr) {
            const client = new FlareSolverrClient({
                endpoint: this.config.services.flaresolverr.endpoint,
                timeout: 60000
            });
            this.services.set('flaresolverr', client);
            this.serviceStats.set('flaresolverr', {
                priority: 1,
                enabled: true,
                costPerRequest: 0, // Free
                successRate: 0.7,
                avgResponseTime: 5000,
                maxRetries: 2,
                timeout: 60000,
                ...this.config.services.flaresolverr.config
            });
        }

        // Initialize ScrapingBee (premium tier 1)
        if (this.config.services.scrapingbee) {
            const client = new ScrapingBeeClient({
                apiKey: this.config.services.scrapingbee.apiKey,
                premiumProxy: true,
                stealthMode: true,
                javascriptRendering: true
            });
            this.services.set('scrapingbee', client);
            this.serviceStats.set('scrapingbee', {
                priority: 2,
                enabled: true,
                costPerRequest: 0.025, // ~$0.025 per request with premium features
                successRate: 0.9,
                avgResponseTime: 8000,
                maxRetries: 3,
                timeout: 90000,
                ...this.config.services.scrapingbee.config
            });
        }

        // Initialize Scrapfly (premium tier 2)
        if (this.config.services.scrapfly) {
            const client = new ScrapflyClient({
                apiKey: this.config.services.scrapfly.apiKey,
                asp: true,
                renderJs: true,
                proxy: 'residential'
            });
            this.services.set('scrapfly', client);
            this.serviceStats.set('scrapfly', {
                priority: 3,
                enabled: true,
                costPerRequest: 0.05, // ~$0.05 per request with ASP
                successRate: 0.95,
                avgResponseTime: 10000,
                maxRetries: 3,
                timeout: 120000,
                ...this.config.services.scrapfly.config
            });
        }

        console.log(`✅ Initialized ${this.services.size} scraping services`);
    }

    private startMaintenanceTasks(): void {
        // Clean up old cache entries every hour
        setInterval(() => this.cleanCache(), 3600000);
        
        // Clean up dedup map every minute
        setInterval(() => this.cleanDedupMap(), 60000);
        
        // Reset monthly spend at the start of each month
        setInterval(() => this.checkMonthlyReset(), 86400000); // Daily check
    }

    async scrape(request: CascadeRequest): Promise<CascadeResponse> {
        const startTime = Date.now();
        const requestId = crypto.randomUUID();
        
        console.log(`\n🎯 [${requestId}] Starting cascade scrape for: ${request.url}`);

        // Check cache first
        if (!request.options?.bypassCache && this.config.costOptimization.cacheEnabled) {
            const cached = this.getFromCache(request);
            if (cached) {
                console.log(`💾 [${requestId}] Cache hit! Saved ${this.calculateSavedCost(cached.service)} credits`);
                this.emit('cacheHit', { url: request.url, savedCost: this.calculateSavedCost(cached.service) });
                return cached;
            }
        }

        // Check for duplicate requests
        const dedupKey = this.generateRequestHash(request);
        const existing = this.dedupMap.get(dedupKey);
        if (existing && Date.now() - existing.timestamp < this.config.costOptimization.deduplicationWindow) {
            console.log(`🔄 [${requestId}] Deduplication: waiting for existing request`);
            return await existing.promise;
        }

        // Create dedup entry
        const dedupPromise = this.performCascadeScrape(request, requestId);
        this.dedupMap.set(dedupKey, {
            hash: dedupKey,
            timestamp: Date.now(),
            promise: dedupPromise
        });

        try {
            const response = await dedupPromise;
            
            // Cache successful responses
            if (response.success && this.config.costOptimization.cacheEnabled) {
                this.addToCache(request, response);
            }

            // Update monthly spend
            this.monthlySpend += response.cost;
            this.emit('requestComplete', {
                url: request.url,
                service: response.service,
                cost: response.cost,
                monthlySpend: this.monthlySpend
            });

            return response;

        } finally {
            // Remove from dedup map after completion
            this.dedupMap.delete(dedupKey);
        }
    }

    private async performCascadeScrape(request: CascadeRequest, requestId: string): Promise<CascadeResponse> {
        const attempts: any[] = [];
        const startTime = Date.now();

        // Get service order based on priority and constraints
        const serviceOrder = this.getServiceOrder(request);
        console.log(`📋 [${requestId}] Service order: ${serviceOrder.join(' → ')}`);

        for (const serviceName of serviceOrder) {
            const serviceConfig = this.serviceStats.get(serviceName)!;
            const service = this.services.get(serviceName);

            if (!serviceConfig.enabled) continue;

            // Check cost constraints
            if (this.monthlySpend + serviceConfig.costPerRequest > this.config.costOptimization.monthlyBudget) {
                console.log(`💸 [${requestId}] Skipping ${serviceName} - would exceed monthly budget`);
                continue;
            }

            if (request.options?.maxCost && serviceConfig.costPerRequest > request.options.maxCost) {
                console.log(`💰 [${requestId}] Skipping ${serviceName} - exceeds max cost constraint`);
                continue;
            }

            const attemptStartTime = Date.now();
            console.log(`🔄 [${requestId}] Trying ${serviceName} (cost: $${serviceConfig.costPerRequest})...`);

            try {
                const response = await this.executeServiceRequest(serviceName, service, request);
                const attemptDuration = Date.now() - attemptStartTime;

                if (response.success) {
                    console.log(`✅ [${requestId}] ${serviceName} succeeded in ${attemptDuration}ms`);
                    
                    attempts.push({
                        service: serviceName,
                        success: true,
                        statusCode: response.statusCode,
                        cost: response.cost || serviceConfig.costPerRequest,
                        duration: attemptDuration
                    });

                    // Update service stats
                    this.updateServiceStats(serviceName, true, attemptDuration);

                    return {
                        success: true,
                        service: serviceName,
                        url: response.url || request.url,
                        statusCode: response.statusCode,
                        content: response.content,
                        headers: response.headers,
                        cookies: response.cookies || [],
                        cost: response.cost || serviceConfig.costPerRequest,
                        responseTime: Date.now() - startTime,
                        cached: false,
                        attempts
                    };
                } else {
                    console.log(`⚠️ [${requestId}] ${serviceName} returned non-success status: ${response.statusCode}`);
                    attempts.push({
                        service: serviceName,
                        success: false,
                        statusCode: response.statusCode,
                        error: response.error || 'Non-200 status',
                        cost: response.cost || 0,
                        duration: attemptDuration
                    });
                }

            } catch (error) {
                const attemptDuration = Date.now() - attemptStartTime;
                console.log(`❌ [${requestId}] ${serviceName} failed: ${error.message}`);
                
                attempts.push({
                    service: serviceName,
                    success: false,
                    statusCode: 0,
                    error: error.message,
                    cost: 0,
                    duration: attemptDuration
                });

                // Update service stats
                this.updateServiceStats(serviceName, false, attemptDuration);
            }

            // Add delay between services
            if (serviceName !== serviceOrder[serviceOrder.length - 1]) {
                await new Promise(resolve => setTimeout(resolve, this.config.performance.retryDelay));
            }
        }

        // All services failed
        console.log(`❌ [${requestId}] All services failed after ${attempts.length} attempts`);
        
        return {
            success: false,
            service: 'none',
            url: request.url,
            statusCode: 0,
            content: '',
            headers: {},
            cookies: [],
            cost: attempts.reduce((sum, a) => sum + a.cost, 0),
            responseTime: Date.now() - startTime,
            cached: false,
            attempts
        };
    }

    private async executeServiceRequest(serviceName: string, service: any, request: CascadeRequest): Promise<any> {
        switch (serviceName) {
            case 'flaresolverr':
                return await this.executeFlareSolverr(service, request);
            
            case 'scrapingbee':
                return await this.executeScrapingBee(service, request);
            
            case 'scrapfly':
                return await this.executeScrapfly(service, request);
            
            default:
                throw new Error(`Unknown service: ${serviceName}`);
        }
    }

    private async executeFlareSolverr(client: FlareSolverrClient, request: CascadeRequest): Promise<any> {
        const result = await client.solveCloudflare(request.url, undefined, {
            method: request.method,
            headers: request.headers,
            postData: request.data ? JSON.stringify(request.data) : undefined,
            maxTimeout: 60000
        });

        return {
            success: result.status < 400,
            statusCode: result.status,
            url: result.url,
            content: result.html,
            headers: result.headers,
            cookies: result.cookies,
            cost: 0 // Free service
        };
    }

    private async executeScrapingBee(client: ScrapingBeeClient, request: CascadeRequest): Promise<any> {
        const response = await client.scrape({
            url: request.url,
            method: request.method,
            data: request.data,
            config: {
                headers: request.headers,
                waitForTimeout: 15000
            }
        });

        return {
            success: response.success,
            statusCode: response.statusCode,
            url: response.resolvedUrl,
            content: response.content,
            headers: response.headers,
            cookies: response.cookies,
            cost: response.cost / 1000 // Convert credits to dollars
        };
    }

    private async executeScrapfly(client: ScrapflyClient, request: CascadeRequest): Promise<any> {
        const response = await client.scrape({
            url: request.url,
            method: request.method,
            body: request.data,
            config: {
                headers: request.headers
            }
        });

        return {
            success: response.success,
            statusCode: response.statusCode,
            url: response.result.url,
            content: response.content,
            headers: response.headers,
            cookies: [], // Scrapfly handles cookies differently
            cost: response.cost.total / 1000 // Convert credits to dollars
        };
    }

    private getServiceOrder(request: CascadeRequest): string[] {
        if (request.options?.forceService) {
            return [request.options.forceService];
        }

        // Get enabled services sorted by priority and cost
        const services = Array.from(this.serviceStats.entries())
            .filter(([_, config]) => config.enabled)
            .sort((a, b) => {
                // First sort by priority
                const priorityDiff = a[1].priority - b[1].priority;
                if (priorityDiff !== 0) return priorityDiff;
                
                // Then by cost (cheapest first)
                return a[1].costPerRequest - b[1].costPerRequest;
            })
            .map(([name, _]) => name);

        // Apply circuit breaker logic
        return services.filter(service => {
            const stats = this.serviceStats.get(service)!;
            return stats.successRate >= (1 - this.config.performance.circuitBreakerThreshold);
        });
    }

    private updateServiceStats(serviceName: string, success: boolean, responseTime: number): void {
        const stats = this.serviceStats.get(serviceName)!;
        
        // Update success rate (exponential moving average)
        const alpha = 0.1; // Smoothing factor
        stats.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * stats.successRate;
        
        // Update average response time
        if (success) {
            stats.avgResponseTime = alpha * responseTime + (1 - alpha) * stats.avgResponseTime;
        }

        this.emit('serviceStatsUpdate', { service: serviceName, stats });
    }

    private generateRequestHash(request: CascadeRequest): string {
        const data = {
            url: request.url,
            method: request.method || 'GET',
            headers: request.headers || {},
            data: request.data || null
        };
        
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    private getFromCache(request: CascadeRequest): CascadeResponse | null {
        const key = this.generateRequestHash(request);
        const entry = this.cache.get(key);

        if (!entry) return null;

        const age = Date.now() - entry.timestamp;
        if (age > this.config.costOptimization.cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        entry.hits++;
        return {
            ...entry.response,
            cached: true,
            responseTime: 0
        };
    }

    private addToCache(request: CascadeRequest, response: CascadeResponse): void {
        const key = this.generateRequestHash(request);
        
        this.cache.set(key, {
            key,
            response,
            timestamp: Date.now(),
            hits: 0
        });

        // Limit cache size
        if (this.cache.size > 1000) {
            // Remove oldest entries
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (let i = 0; i < 100; i++) {
                this.cache.delete(entries[i][0]);
            }
        }
    }

    private cleanCache(): void {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.config.costOptimization.cacheTTL) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`🧹 Cleaned ${removed} expired cache entries`);
        }
    }

    private cleanDedupMap(): void {
        const now = Date.now();
        
        for (const [key, entry] of this.dedupMap.entries()) {
            if (now - entry.timestamp > this.config.costOptimization.deduplicationWindow) {
                this.dedupMap.delete(key);
            }
        }
    }

    private checkMonthlyReset(): void {
        const now = new Date();
        if (now.getMonth() !== this.monthStartDate.getMonth()) {
            this.monthlySpend = 0;
            this.monthStartDate = now;
            console.log('📅 Monthly spend counter reset');
            this.emit('monthlyReset', { date: now });
        }
    }

    private calculateSavedCost(service: string): number {
        const stats = this.serviceStats.get(service);
        return stats ? stats.costPerRequest : 0;
    }

    async scrapeFliipa(path: string = '', options?: any): Promise<CascadeResponse> {
        return await this.scrape({
            url: `https://flippa.com${path}`,
            options: {
                priority: 'high',
                ...options
            }
        });
    }

    getStatistics(): {
        services: Record<string, ServiceConfig>;
        cache: {
            size: number;
            hitRate: number;
            savedCosts: number;
        };
        costs: {
            monthlySpend: number;
            monthlyBudget: number;
            percentUsed: number;
        };
    } {
        const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
        const savedCosts = Array.from(this.cache.values()).reduce((sum, entry) => {
            return sum + (entry.hits * this.calculateSavedCost(entry.response.service));
        }, 0);

        return {
            services: Object.fromEntries(this.serviceStats),
            cache: {
                size: this.cache.size,
                hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
                savedCosts
            },
            costs: {
                monthlySpend: this.monthlySpend,
                monthlyBudget: this.config.costOptimization.monthlyBudget,
                percentUsed: (this.monthlySpend / this.config.costOptimization.monthlyBudget) * 100
            }
        };
    }

    async cleanup(): void {
        console.log('🧹 Cleaning up Service Cascade Manager...');
        
        // Clear timers
        this.removeAllListeners();
        
        // Clear cache
        this.cache.clear();
        this.dedupMap.clear();
        
        console.log('✅ Service Cascade Manager cleaned up');
    }
}

export default ServiceCascadeManager;