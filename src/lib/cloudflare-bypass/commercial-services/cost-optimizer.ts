// cost-optimizer.ts
// Advanced cost optimization with smart caching and request deduplication

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

export interface OptimizationConfig {
    cache: {
        maxSize: number;
        ttl: number;
        maxAge: number;
        updateAgeOnGet: boolean;
        allowStale: boolean;
        staleWhileRevalidate: number;
    };
    
    deduplication: {
        windowMs: number;
        maxConcurrent: number;
        queueSize: number;
    };
    
    rateLimiting: {
        tokensPerInterval: number;
        interval: number;
        maxBurst: number;
    };
    
    costTracking: {
        budgets: {
            hourly: number;
            daily: number;
            monthly: number;
        };
        alerts: {
            thresholds: number[]; // Percentage thresholds for alerts
            webhookUrl?: string;
        };
    };
}

export interface CostMetrics {
    current: {
        hour: number;
        day: number;
        month: number;
    };
    projected: {
        day: number;
        month: number;
    };
    savings: {
        fromCache: number;
        fromDedup: number;
        total: number;
    };
}

interface RequestSignature {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
}

interface DedupEntry {
    promise: Promise<any>;
    timestamp: number;
    requestCount: number;
    signatures: Set<string>;
}

export class CostOptimizer extends EventEmitter {
    private config: OptimizationConfig;
    private cache: LRUCache<string, any>;
    private dedupMap: Map<string, DedupEntry> = new Map();
    private costMetrics: CostMetrics = {
        current: { hour: 0, day: 0, month: 0 },
        projected: { day: 0, month: 0 },
        savings: { fromCache: 0, fromDedup: 0, total: 0 }
    };
    private requestTimestamps: number[] = [];
    private rateLimit: {
        tokens: number;
        lastRefill: number;
    };

    constructor(config: OptimizationConfig) {
        super();
        this.config = config;
        
        // Initialize LRU cache with advanced options
        this.cache = new LRUCache({
            max: config.cache.maxSize,
            ttl: config.cache.ttl,
            maxAge: config.cache.maxAge,
            updateAgeOnGet: config.cache.updateAgeOnGet,
            allowStale: config.cache.allowStale,
            staleWhileRevalidate: config.cache.staleWhileRevalidate,
            
            // Size calculation based on content length
            sizeCalculation: (value) => {
                if (value.content) {
                    return value.content.length;
                }
                return 1;
            },
            
            // Disposal method for cleanup
            dispose: (value, key) => {
                this.emit('cacheEvict', { key, size: value.content?.length || 0 });
            },
            
            // Fetch method for stale-while-revalidate
            fetchMethod: async (key, staleValue) => {
                this.emit('cacheMiss', { key, stale: !!staleValue });
                return null; // Let the caller handle fetching
            }
        });

        // Initialize rate limiter
        this.rateLimit = {
            tokens: config.rateLimiting.tokensPerInterval,
            lastRefill: Date.now()
        };

        this.startMaintenanceTasks();
    }

    private startMaintenanceTasks(): void {
        // Reset hourly metrics
        setInterval(() => this.resetHourlyMetrics(), 3600000);
        
        // Reset daily metrics
        setInterval(() => this.resetDailyMetrics(), 86400000);
        
        // Clean old dedup entries
        setInterval(() => this.cleanDedupMap(), 60000);
        
        // Update projections
        setInterval(() => this.updateProjections(), 300000); // Every 5 minutes
    }

    async optimizeRequest<T>(
        signature: RequestSignature,
        costPerRequest: number,
        fetcher: () => Promise<T>
    ): Promise<{ result: T; cached: boolean; deduped: boolean; cost: number }> {
        const key = this.generateCacheKey(signature);
        
        // Check rate limits
        if (!await this.checkRateLimit()) {
            throw new Error('Rate limit exceeded - request throttled');
        }

        // Check budget limits
        if (!this.checkBudgetLimit(costPerRequest)) {
            throw new Error('Budget limit exceeded - request blocked');
        }

        // Try cache first
        const cached = this.cache.get(key);
        if (cached && !this.isStale(cached)) {
            this.recordCacheSaving(costPerRequest);
            this.emit('cacheHit', { key, savedCost: costPerRequest });
            return {
                result: cached.data,
                cached: true,
                deduped: false,
                cost: 0
            };
        }

        // Check for in-flight duplicate requests
        const dedupKey = this.generateDedupKey(signature);
        const existing = this.dedupMap.get(dedupKey);
        
        if (existing && this.isWithinDedupWindow(existing)) {
            existing.requestCount++;
            existing.signatures.add(key);
            
            this.recordDedupSaving(costPerRequest);
            this.emit('requestDeduped', { key: dedupKey, count: existing.requestCount });
            
            const result = await existing.promise;
            return {
                result,
                cached: false,
                deduped: true,
                cost: 0
            };
        }

        // Create new request
        const requestPromise = this.executeRequest(fetcher, costPerRequest);
        
        this.dedupMap.set(dedupKey, {
            promise: requestPromise,
            timestamp: Date.now(),
            requestCount: 1,
            signatures: new Set([key])
        });

        try {
            const result = await requestPromise;
            
            // Cache successful result
            this.cache.set(key, {
                data: result,
                timestamp: Date.now(),
                cost: costPerRequest
            });

            return {
                result,
                cached: false,
                deduped: false,
                cost: costPerRequest
            };

        } finally {
            // Clean up dedup entry after a delay
            setTimeout(() => {
                this.dedupMap.delete(dedupKey);
            }, this.config.deduplication.windowMs);
        }
    }

    private async executeRequest<T>(fetcher: () => Promise<T>, cost: number): Promise<T> {
        const startTime = Date.now();
        
        try {
            const result = await fetcher();
            
            // Record successful request
            this.recordCost(cost);
            this.requestTimestamps.push(startTime);
            
            // Clean old timestamps
            const cutoff = startTime - 3600000; // Keep last hour
            this.requestTimestamps = this.requestTimestamps.filter(ts => ts > cutoff);
            
            return result;
            
        } catch (error) {
            // Don't charge for failed requests
            this.emit('requestFailed', { error: error.message, cost: 0 });
            throw error;
        }
    }

    private generateCacheKey(signature: RequestSignature): string {
        const normalized = {
            url: signature.url.toLowerCase(),
            method: signature.method.toUpperCase(),
            headers: this.normalizeHeaders(signature.headers),
            body: signature.body ? JSON.stringify(signature.body) : ''
        };

        return crypto
            .createHash('sha256')
            .update(JSON.stringify(normalized))
            .digest('hex');
    }

    private generateDedupKey(signature: RequestSignature): string {
        // Simpler key for deduplication (ignores some headers)
        const normalized = {
            url: signature.url.toLowerCase(),
            method: signature.method.toUpperCase(),
            body: signature.body ? JSON.stringify(signature.body) : ''
        };

        return crypto
            .createHash('md5')
            .update(JSON.stringify(normalized))
            .digest('hex');
    }

    private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
        const normalized: Record<string, string> = {};
        
        // Only include significant headers for caching
        const significantHeaders = [
            'authorization',
            'content-type',
            'accept',
            'user-agent',
            'referer'
        ];

        Object.entries(headers).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            if (significantHeaders.includes(lowerKey)) {
                normalized[lowerKey] = value;
            }
        });

        return normalized;
    }

    private isStale(cached: any): boolean {
        if (!cached.timestamp) return true;
        
        const age = Date.now() - cached.timestamp;
        return age > this.config.cache.maxAge;
    }

    private isWithinDedupWindow(entry: DedupEntry): boolean {
        const age = Date.now() - entry.timestamp;
        return age < this.config.deduplication.windowMs;
    }

    private async checkRateLimit(): Promise<boolean> {
        const now = Date.now();
        const elapsed = now - this.rateLimit.lastRefill;
        
        // Refill tokens
        const tokensToAdd = Math.floor(elapsed / this.config.rateLimiting.interval) * 
                          this.config.rateLimiting.tokensPerInterval;
        
        if (tokensToAdd > 0) {
            this.rateLimit.tokens = Math.min(
                this.config.rateLimiting.maxBurst,
                this.rateLimit.tokens + tokensToAdd
            );
            this.rateLimit.lastRefill = now;
        }

        // Check if we have tokens
        if (this.rateLimit.tokens > 0) {
            this.rateLimit.tokens--;
            return true;
        }

        this.emit('rateLimited', { 
            tokensRemaining: 0, 
            nextRefill: this.rateLimit.lastRefill + this.config.rateLimiting.interval 
        });
        
        return false;
    }

    private checkBudgetLimit(cost: number): boolean {
        const budgets = this.config.costTracking.budgets;
        
        // Check hourly budget
        if (this.costMetrics.current.hour + cost > budgets.hourly) {
            this.emit('budgetExceeded', { period: 'hourly', limit: budgets.hourly });
            return false;
        }

        // Check daily budget
        if (this.costMetrics.current.day + cost > budgets.daily) {
            this.emit('budgetExceeded', { period: 'daily', limit: budgets.daily });
            return false;
        }

        // Check monthly budget
        if (this.costMetrics.current.month + cost > budgets.monthly) {
            this.emit('budgetExceeded', { period: 'monthly', limit: budgets.monthly });
            return false;
        }

        // Check alert thresholds
        this.checkAlertThresholds(cost);

        return true;
    }

    private checkAlertThresholds(additionalCost: number): void {
        const thresholds = this.config.costTracking.alerts.thresholds;
        const monthlyBudget = this.config.costTracking.budgets.monthly;
        
        const currentPercent = (this.costMetrics.current.month / monthlyBudget) * 100;
        const newPercent = ((this.costMetrics.current.month + additionalCost) / monthlyBudget) * 100;

        for (const threshold of thresholds) {
            if (currentPercent < threshold && newPercent >= threshold) {
                this.emit('budgetAlert', {
                    threshold,
                    current: this.costMetrics.current.month,
                    budget: monthlyBudget,
                    percent: newPercent
                });

                // Send webhook if configured
                if (this.config.costTracking.alerts.webhookUrl) {
                    this.sendWebhookAlert(threshold, newPercent);
                }
            }
        }
    }

    private async sendWebhookAlert(threshold: number, percent: number): Promise<void> {
        // Implementation would send actual webhook
        console.log(`🚨 Budget alert: ${percent.toFixed(1)}% of monthly budget used (threshold: ${threshold}%)`);
    }

    private recordCost(cost: number): void {
        this.costMetrics.current.hour += cost;
        this.costMetrics.current.day += cost;
        this.costMetrics.current.month += cost;
        
        this.emit('costRecorded', { cost, metrics: { ...this.costMetrics.current } });
    }

    private recordCacheSaving(savedCost: number): void {
        this.costMetrics.savings.fromCache += savedCost;
        this.costMetrics.savings.total += savedCost;
    }

    private recordDedupSaving(savedCost: number): void {
        this.costMetrics.savings.fromDedup += savedCost;
        this.costMetrics.savings.total += savedCost;
    }

    private updateProjections(): void {
        const now = Date.now();
        const hourStart = now - 3600000;
        const dayStart = now - 86400000;

        // Calculate request rates
        const hourlyRequests = this.requestTimestamps.filter(ts => ts > hourStart).length;
        const dailyRequests = this.requestTimestamps.filter(ts => ts > dayStart).length;

        // Calculate average cost per request
        const avgCostPerRequest = hourlyRequests > 0 ? 
            this.costMetrics.current.hour / hourlyRequests : 0;

        // Project daily cost
        const hoursRemaining = 24 - new Date().getHours();
        const projectedDailyRequests = dailyRequests + (hourlyRequests * hoursRemaining);
        this.costMetrics.projected.day = projectedDailyRequests * avgCostPerRequest;

        // Project monthly cost
        const daysRemaining = 30 - new Date().getDate();
        const projectedMonthlyRequests = dailyRequests * 30;
        this.costMetrics.projected.month = projectedMonthlyRequests * avgCostPerRequest;

        this.emit('projectionsUpdated', { ...this.costMetrics.projected });
    }

    private resetHourlyMetrics(): void {
        this.costMetrics.current.hour = 0;
        this.emit('metricsReset', { period: 'hourly' });
    }

    private resetDailyMetrics(): void {
        this.costMetrics.current.day = 0;
        
        // Check if new month
        if (new Date().getDate() === 1) {
            this.resetMonthlyMetrics();
        }
        
        this.emit('metricsReset', { period: 'daily' });
    }

    private resetMonthlyMetrics(): void {
        this.costMetrics.current.month = 0;
        this.costMetrics.savings = { fromCache: 0, fromDedup: 0, total: 0 };
        this.emit('metricsReset', { period: 'monthly' });
    }

    private cleanDedupMap(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.dedupMap.entries()) {
            if (now - entry.timestamp > this.config.deduplication.windowMs * 2) {
                this.dedupMap.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.emit('dedupCleaned', { count: cleaned });
        }
    }

    getCacheStats(): {
        size: number;
        hitRate: number;
        evictions: number;
        memoryUsage: number;
    } {
        const info = this.cache.info();
        return {
            size: this.cache.size,
            hitRate: info.hits / (info.hits + info.misses) || 0,
            evictions: info.evictions || 0,
            memoryUsage: info.size || 0
        };
    }

    getMetrics(): CostMetrics {
        return JSON.parse(JSON.stringify(this.costMetrics));
    }

    clearCache(): void {
        this.cache.clear();
        this.emit('cacheCleared');
    }

    cleanup(): void {
        this.cache.clear();
        this.dedupMap.clear();
        this.removeAllListeners();
    }
}

export default CostOptimizer;