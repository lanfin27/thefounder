// intelligent-router.ts
// Intelligent request routing system with adaptive method selection and failure recovery

import { EventEmitter } from 'events';

export interface RouteConfig {
    // Method configuration
    methods: RouteMethod[];
    
    // Routing strategy
    strategy: 'priority' | 'adaptive' | 'load_balance' | 'failover';
    
    // Adaptive settings
    adaptiveSettings: {
        minSampleSize: number;
        successRateThreshold: number;
        responseTimeThreshold: number;
        evaluationInterval: number;
    };
    
    // Retry settings
    retrySettings: {
        maxRetries: number;
        retryDelay: number;
        exponentialBackoff: boolean;
        circuitBreakerThreshold: number;
    };
    
    // Load balancing
    loadBalanceSettings: {
        algorithm: 'round_robin' | 'weighted' | 'least_connections' | 'response_time';
        weights?: Record<string, number>;
    };
}

export interface RouteMethod {
    name: string;
    enabled: boolean;
    priority: number;
    weight: number;
    timeout: number;
    maxConcurrency: number;
    prerequisites?: string[];
    fallbackMethods?: string[];
}

export interface RouteAttempt {
    method: string;
    startTime: number;
    endTime: number;
    success: boolean;
    responseTime: number;
    statusCode: number;
    error?: string;
    proxyUsed?: string;
    retryCount: number;
}

export interface MethodStats {
    name: string;
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    avgResponseTime: number;
    successRate: number;
    lastUsed: number;
    concurrentRequests: number;
    circuitBreakerOpen: boolean;
    circuitBreakerOpenTime?: number;
    recentAttempts: RouteAttempt[];
}

export interface RouteRequest {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    data?: any;
    options?: {
        forceMethod?: string;
        bypassCircuitBreaker?: boolean;
        timeout?: number;
        priority?: 'low' | 'normal' | 'high';
    };
}

export interface RouteResult {
    success: boolean;
    finalMethod: string;
    attempts: RouteAttempt[];
    totalTime: number;
    result?: any;
    error?: string;
}

export class IntelligentRouter extends EventEmitter {
    private config: RouteConfig;
    private methodStats: Map<string, MethodStats> = new Map();
    private roundRobinIndex: number = 0;
    private evaluationTimer?: NodeJS.Timeout;

    constructor(config: RouteConfig) {
        super();
        this.config = config;
        this.initializeMethodStats();
        this.startPeriodicEvaluation();
    }

    private initializeMethodStats(): void {
        for (const method of this.config.methods) {
            this.methodStats.set(method.name, {
                name: method.name,
                totalAttempts: 0,
                successfulAttempts: 0,
                failedAttempts: 0,
                avgResponseTime: 0,
                successRate: 1.0, // Start optimistic
                lastUsed: 0,
                concurrentRequests: 0,
                circuitBreakerOpen: false,
                recentAttempts: []
            });
        }
    }

    private startPeriodicEvaluation(): void {
        this.evaluationTimer = setInterval(() => {
            this.evaluateMethodPerformance();
            this.updateCircuitBreakers();
        }, this.config.adaptiveSettings.evaluationInterval);
    }

    private evaluateMethodPerformance(): void {
        const now = Date.now();
        const windowSize = this.config.adaptiveSettings.evaluationInterval * 2;

        for (const [methodName, stats] of this.methodStats) {
            // Filter recent attempts within evaluation window
            stats.recentAttempts = stats.recentAttempts.filter(
                attempt => now - attempt.startTime <= windowSize
            );

            // Recalculate metrics based on recent attempts
            if (stats.recentAttempts.length >= this.config.adaptiveSettings.minSampleSize) {
                const recentSuccesses = stats.recentAttempts.filter(a => a.success).length;
                const avgResponseTime = stats.recentAttempts.reduce((sum, a) => sum + a.responseTime, 0) / stats.recentAttempts.length;

                stats.successRate = recentSuccesses / stats.recentAttempts.length;
                stats.avgResponseTime = avgResponseTime;

                // Emit performance metrics
                this.emit('methodPerformanceUpdate', {
                    method: methodName,
                    successRate: stats.successRate,
                    avgResponseTime: stats.avgResponseTime,
                    sampleSize: stats.recentAttempts.length
                });
            }
        }
    }

    private updateCircuitBreakers(): void {
        const now = Date.now();
        const breakerTimeout = 60000; // 1 minute

        for (const [methodName, stats] of this.methodStats) {
            // Check if circuit breaker should open
            if (!stats.circuitBreakerOpen &&
                stats.totalAttempts >= this.config.adaptiveSettings.minSampleSize &&
                stats.successRate < (1 - this.config.retrySettings.circuitBreakerThreshold)) {
                
                stats.circuitBreakerOpen = true;
                stats.circuitBreakerOpenTime = now;
                
                console.log(`🔴 Circuit breaker OPENED for method: ${methodName} (success rate: ${(stats.successRate * 100).toFixed(1)}%)`);
                this.emit('circuitBreakerOpen', { method: methodName, successRate: stats.successRate });
            }

            // Check if circuit breaker should close
            if (stats.circuitBreakerOpen &&
                stats.circuitBreakerOpenTime &&
                now - stats.circuitBreakerOpenTime >= breakerTimeout) {
                
                stats.circuitBreakerOpen = false;
                stats.circuitBreakerOpenTime = undefined;
                
                console.log(`🟢 Circuit breaker CLOSED for method: ${methodName}`);
                this.emit('circuitBreakerClose', { method: methodName });
            }
        }
    }

    async route(request: RouteRequest, methodImplementations: Record<string, Function>): Promise<RouteResult> {
        const startTime = Date.now();
        const attempts: RouteAttempt[] = [];
        let finalResult: any = null;
        let finalError: string | undefined;

        console.log(`🎯 Routing request for: ${request.url}`);

        // Get routing order based on strategy
        const methodOrder = this.getMethodOrder(request);
        console.log(`📋 Method order: ${methodOrder.join(' → ')}`);

        for (let retryCount = 0; retryCount <= this.config.retrySettings.maxRetries; retryCount++) {
            for (const methodName of methodOrder) {
                const methodConfig = this.config.methods.find(m => m.name === methodName);
                const methodStats = this.methodStats.get(methodName);
                
                if (!methodConfig || !methodStats) continue;

                // Check prerequisites
                if (!this.checkPrerequisites(methodConfig, request)) {
                    console.log(`⚠️ Prerequisites not met for method: ${methodName}`);
                    continue;
                }

                // Check circuit breaker
                if (methodStats.circuitBreakerOpen && !request.options?.bypassCircuitBreaker) {
                    console.log(`🔴 Circuit breaker open for method: ${methodName}`);
                    continue;
                }

                // Check concurrency limit
                if (methodStats.concurrentRequests >= methodConfig.maxConcurrency) {
                    console.log(`⏸️ Concurrency limit reached for method: ${methodName}`);
                    continue;
                }

                // Attempt the request
                const attemptResult = await this.attemptMethod(
                    methodName,
                    methodConfig,
                    request,
                    methodImplementations[methodName],
                    retryCount
                );

                attempts.push(attemptResult);

                if (attemptResult.success) {
                    console.log(`✅ Success with method: ${methodName} (${attemptResult.responseTime}ms)`);
                    finalResult = attemptResult;
                    
                    return {
                        success: true,
                        finalMethod: methodName,
                        attempts,
                        totalTime: Date.now() - startTime,
                        result: finalResult
                    };
                } else {
                    console.log(`❌ Failed with method: ${methodName} - ${attemptResult.error}`);
                    finalError = attemptResult.error;
                    
                    // Try fallback methods if available
                    if (methodConfig.fallbackMethods) {
                        for (const fallbackMethod of methodConfig.fallbackMethods) {
                            if (!methodOrder.includes(fallbackMethod)) {
                                methodOrder.push(fallbackMethod);
                            }
                        }
                    }
                }
            }

            // Apply retry delay if not the last retry
            if (retryCount < this.config.retrySettings.maxRetries) {
                const delay = this.config.retrySettings.exponentialBackoff
                    ? this.config.retrySettings.retryDelay * Math.pow(2, retryCount)
                    : this.config.retrySettings.retryDelay;
                
                console.log(`⏳ Waiting ${delay}ms before retry ${retryCount + 1}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.log('❌ All routing attempts failed');
        
        return {
            success: false,
            finalMethod: 'none',
            attempts,
            totalTime: Date.now() - startTime,
            error: finalError || 'All methods failed'
        };
    }

    private getMethodOrder(request: RouteRequest): string[] {
        if (request.options?.forceMethod) {
            return [request.options.forceMethod];
        }

        const enabledMethods = this.config.methods
            .filter(m => m.enabled)
            .filter(m => {
                const stats = this.methodStats.get(m.name);
                return stats && !stats.circuitBreakerOpen;
            });

        switch (this.config.strategy) {
            case 'priority':
                return enabledMethods
                    .sort((a, b) => b.priority - a.priority)
                    .map(m => m.name);

            case 'adaptive':
                return this.getAdaptiveOrder(enabledMethods);

            case 'load_balance':
                return this.getLoadBalancedOrder(enabledMethods);

            case 'failover':
                return this.getFailoverOrder(enabledMethods);

            default:
                return enabledMethods.map(m => m.name);
        }
    }

    private getAdaptiveOrder(methods: RouteMethod[]): string[] {
        return methods
            .map(method => {
                const stats = this.methodStats.get(method.name)!;
                const score = this.calculateAdaptiveScore(stats, method);
                return { method: method.name, score };
            })
            .sort((a, b) => b.score - a.score)
            .map(item => item.method);
    }

    private calculateAdaptiveScore(stats: MethodStats, config: RouteMethod): number {
        const successWeight = 0.6;
        const speedWeight = 0.3;
        const priorityWeight = 0.1;

        const successScore = stats.successRate * successWeight;
        const speedScore = stats.avgResponseTime > 0 
            ? (1 / (stats.avgResponseTime / 1000)) * speedWeight 
            : speedWeight;
        const priorityScore = (config.priority / 10) * priorityWeight;

        return successScore + speedScore + priorityScore;
    }

    private getLoadBalancedOrder(methods: RouteMethod[]): string[] {
        switch (this.config.loadBalanceSettings.algorithm) {
            case 'round_robin':
                return this.getRoundRobinOrder(methods);
            
            case 'weighted':
                return this.getWeightedOrder(methods);
            
            case 'least_connections':
                return this.getLeastConnectionsOrder(methods);
            
            case 'response_time':
                return this.getResponseTimeOrder(methods);
            
            default:
                return methods.map(m => m.name);
        }
    }

    private getRoundRobinOrder(methods: RouteMethod[]): string[] {
        const methodNames = methods.map(m => m.name);
        const selected = methodNames[this.roundRobinIndex % methodNames.length];
        this.roundRobinIndex++;
        
        // Put selected method first, then others
        return [selected, ...methodNames.filter(name => name !== selected)];
    }

    private getWeightedOrder(methods: RouteMethod[]): string[] {
        const weights = this.config.loadBalanceSettings.weights || {};
        
        return methods
            .map(method => ({
                name: method.name,
                weight: weights[method.name] || method.weight || 1
            }))
            .sort((a, b) => b.weight - a.weight)
            .map(item => item.name);
    }

    private getLeastConnectionsOrder(methods: RouteMethod[]): string[] {
        return methods
            .map(method => {
                const stats = this.methodStats.get(method.name)!;
                return {
                    name: method.name,
                    connections: stats.concurrentRequests
                };
            })
            .sort((a, b) => a.connections - b.connections)
            .map(item => item.name);
    }

    private getResponseTimeOrder(methods: RouteMethod[]): string[] {
        return methods
            .map(method => {
                const stats = this.methodStats.get(method.name)!;
                return {
                    name: method.name,
                    responseTime: stats.avgResponseTime || 999999
                };
            })
            .sort((a, b) => a.responseTime - b.responseTime)
            .map(item => item.name);
    }

    private getFailoverOrder(methods: RouteMethod[]): string[] {
        // Find the best performing method that's currently healthy
        const healthyMethods = methods.filter(method => {
            const stats = this.methodStats.get(method.name)!;
            return stats.successRate >= this.config.adaptiveSettings.successRateThreshold;
        });

        if (healthyMethods.length > 0) {
            const primary = healthyMethods
                .sort((a, b) => {
                    const aStats = this.methodStats.get(a.name)!;
                    const bStats = this.methodStats.get(b.name)!;
                    return bStats.successRate - aStats.successRate;
                })[0];

            return [primary.name, ...methods.filter(m => m.name !== primary.name).map(m => m.name)];
        }

        return methods.map(m => m.name);
    }

    private checkPrerequisites(methodConfig: RouteMethod, request: RouteRequest): boolean {
        if (!methodConfig.prerequisites) return true;

        // Implement prerequisite checking logic
        // For example, check if required services are available
        return true;
    }

    private async attemptMethod(
        methodName: string,
        methodConfig: RouteMethod,
        request: RouteRequest,
        implementation: Function,
        retryCount: number
    ): Promise<RouteAttempt> {
        const stats = this.methodStats.get(methodName)!;
        const startTime = Date.now();

        // Update concurrency counter
        stats.concurrentRequests++;
        
        try {
            // Execute the method implementation
            const result = await Promise.race([
                implementation(request),
                this.createTimeoutPromise(methodConfig.timeout)
            ]);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Update statistics
            stats.totalAttempts++;
            stats.successfulAttempts++;
            stats.lastUsed = endTime;
            stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
            stats.successRate = stats.successfulAttempts / stats.totalAttempts;

            const attempt: RouteAttempt = {
                method: methodName,
                startTime,
                endTime,
                success: true,
                responseTime,
                statusCode: result.statusCode || 200,
                retryCount
            };

            stats.recentAttempts.push(attempt);
            this.emit('methodSuccess', { method: methodName, responseTime, retryCount });

            return attempt;

        } catch (error) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Update statistics
            stats.totalAttempts++;
            stats.failedAttempts++;
            stats.lastUsed = endTime;
            stats.successRate = stats.successfulAttempts / stats.totalAttempts;

            const attempt: RouteAttempt = {
                method: methodName,
                startTime,
                endTime,
                success: false,
                responseTime,
                statusCode: error.statusCode || 0,
                error: error.message,
                retryCount
            };

            stats.recentAttempts.push(attempt);
            this.emit('methodFailure', { method: methodName, error: error.message, retryCount });

            return attempt;

        } finally {
            // Decrease concurrency counter
            stats.concurrentRequests--;
        }
    }

    private createTimeoutPromise(timeout: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Method timeout after ${timeout}ms`));
            }, timeout);
        });
    }

    getMethodStatistics(): MethodStats[] {
        return Array.from(this.methodStats.values());
    }

    getOverallStatistics(): {
        totalRequests: number;
        successfulRequests: number;
        avgResponseTime: number;
        overallSuccessRate: number;
        methodBreakdown: Record<string, {
            attempts: number;
            successRate: number;
            avgResponseTime: number;
        }>;
    } {
        const stats = Array.from(this.methodStats.values());
        const totalRequests = stats.reduce((sum, s) => sum + s.totalAttempts, 0);
        const successfulRequests = stats.reduce((sum, s) => sum + s.successfulAttempts, 0);
        const avgResponseTime = stats.reduce((sum, s) => sum + s.avgResponseTime, 0) / stats.length;

        const methodBreakdown: Record<string, any> = {};
        stats.forEach(stat => {
            methodBreakdown[stat.name] = {
                attempts: stat.totalAttempts,
                successRate: stat.successRate,
                avgResponseTime: stat.avgResponseTime
            };
        });

        return {
            totalRequests,
            successfulRequests,
            avgResponseTime,
            overallSuccessRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
            methodBreakdown
        };
    }

    resetStatistics(): void {
        for (const stats of this.methodStats.values()) {
            stats.totalAttempts = 0;
            stats.successfulAttempts = 0;
            stats.failedAttempts = 0;
            stats.avgResponseTime = 0;
            stats.successRate = 1.0;
            stats.recentAttempts = [];
            stats.circuitBreakerOpen = false;
            stats.circuitBreakerOpenTime = undefined;
        }
        
        console.log('📊 Router statistics reset');
    }

    cleanup(): void {
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer);
            this.evaluationTimer = undefined;
        }
        
        this.removeAllListeners();
        console.log('🧹 Intelligent Router cleaned up');
    }
}

export default IntelligentRouter;