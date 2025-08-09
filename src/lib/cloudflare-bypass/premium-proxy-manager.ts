// premium-proxy-manager.ts
// Premium residential proxy integration with Bright Data, Oxylabs, and SmartProxy

import axios, { AxiosInstance } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface PremiumProxyConfig {
    // Bright Data
    brightData?: {
        username: string;
        password: string;
        zone?: string;
        endpoint?: string;
        sessionStickiness: boolean;
        country?: string;
        city?: string;
    };
    
    // Oxylabs
    oxylabs?: {
        username: string;
        password: string;
        endpoint?: string;
        sessionType: 'sticky' | 'rotating';
        country?: string;
        city?: string;
    };
    
    // SmartProxy
    smartProxy?: {
        username: string;
        password: string;
        endpoint?: string;
        stickySession: boolean;
        country?: string;
    };
    
    // General settings
    rotationInterval: number; // milliseconds
    healthCheckInterval: number;
    maxFailures: number;
    timeoutMs: number;
}

export interface ProxyEndpoint {
    host: string;
    port: number;
    username: string;
    password: string;
    protocol: 'http' | 'https' | 'socks5';
    provider: 'brightdata' | 'oxylabs' | 'smartproxy';
    country?: string;
    city?: string;
    sessionId?: string;
    isSticky: boolean;
    successRate: number;
    totalRequests: number;
    successfulRequests: number;
    lastUsed: number;
    failures: number;
    avgResponseTime: number;
}

export interface ProxyTestResult {
    endpoint: ProxyEndpoint;
    success: boolean;
    responseTime: number;
    ip: string;
    country: string;
    city?: string;
    error?: string;
}

export class PremiumProxyManager {
    private config: PremiumProxyConfig;
    private endpoints: ProxyEndpoint[] = [];
    private currentIndex: number = 0;
    private testClient: AxiosInstance;
    private healthCheckTimer?: NodeJS.Timeout;
    private rotationTimer?: NodeJS.Timeout;

    constructor(config: PremiumProxyConfig) {
        this.config = {
            rotationInterval: 300000, // 5 minutes
            healthCheckInterval: 600000, // 10 minutes
            maxFailures: 5,
            timeoutMs: 10000,
            ...config
        };

        this.testClient = axios.create({
            timeout: this.config.timeoutMs,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        this.initializeEndpoints();
    }

    private initializeEndpoints(): void {
        console.log('🔧 Initializing premium proxy endpoints...');

        // Initialize Bright Data endpoints
        if (this.config.brightData) {
            this.createBrightDataEndpoints();
        }

        // Initialize Oxylabs endpoints
        if (this.config.oxylabs) {
            this.createOxylabsEndpoints();
        }

        // Initialize SmartProxy endpoints
        if (this.config.smartProxy) {
            this.createSmartProxyEndpoints();
        }

        console.log(`✅ Initialized ${this.endpoints.length} premium proxy endpoints`);
    }

    private createBrightDataEndpoints(): void {
        const config = this.config.brightData!;
        const endpoint = config.endpoint || 'brd.superproxy.io:22225';
        const [host, port] = endpoint.split(':');

        // Create multiple session-based endpoints for rotation
        const sessionCount = 10;
        for (let i = 0; i < sessionCount; i++) {
            const sessionId = `session_${Date.now()}_${i}`;
            const username = config.sessionStickiness 
                ? `${config.username}-session-${sessionId}`
                : config.username;

            this.endpoints.push({
                host,
                port: parseInt(port),
                username,
                password: config.password,
                protocol: 'http',
                provider: 'brightdata',
                country: config.country,
                city: config.city,
                sessionId,
                isSticky: config.sessionStickiness,
                successRate: 1.0,
                totalRequests: 0,
                successfulRequests: 0,
                lastUsed: 0,
                failures: 0,
                avgResponseTime: 0
            });
        }

        console.log(`✅ Created ${sessionCount} Bright Data endpoints`);
    }

    private createOxylabsEndpoints(): void {
        const config = this.config.oxylabs!;
        const endpoint = config.endpoint || 'pr.oxylabs.io:7777';
        const [host, port] = endpoint.split(':');

        // Create endpoints based on session type
        const endpointCount = config.sessionType === 'sticky' ? 10 : 5;
        
        for (let i = 0; i < endpointCount; i++) {
            const sessionId = config.sessionType === 'sticky' 
                ? `oxylabs_session_${Date.now()}_${i}`
                : undefined;
            
            const username = sessionId 
                ? `${config.username}-session-${sessionId}`
                : config.username;

            this.endpoints.push({
                host,
                port: parseInt(port),
                username,
                password: config.password,
                protocol: 'http',
                provider: 'oxylabs',
                country: config.country,
                city: config.city,
                sessionId,
                isSticky: config.sessionType === 'sticky',
                successRate: 1.0,
                totalRequests: 0,
                successfulRequests: 0,
                lastUsed: 0,
                failures: 0,
                avgResponseTime: 0
            });
        }

        console.log(`✅ Created ${endpointCount} Oxylabs endpoints`);
    }

    private createSmartProxyEndpoints(): void {
        const config = this.config.smartProxy!;
        const endpoint = config.endpoint || 'gate.smartproxy.com:7000';
        const [host, port] = endpoint.split(':');

        // SmartProxy uses different approach for session management
        const endpointCount = config.stickySession ? 8 : 3;
        
        for (let i = 0; i < endpointCount; i++) {
            this.endpoints.push({
                host,
                port: parseInt(port),
                username: config.username,
                password: config.password,
                protocol: 'http',
                provider: 'smartproxy',
                country: config.country,
                isSticky: config.stickySession,
                successRate: 1.0,
                totalRequests: 0,
                successfulRequests: 0,
                lastUsed: 0,
                failures: 0,
                avgResponseTime: 0
            });
        }

        console.log(`✅ Created ${endpointCount} SmartProxy endpoints`);
    }

    async initialize(): Promise<void> {
        console.log('🚀 Initializing Premium Proxy Manager...');

        // Test all endpoints
        await this.testAllEndpoints();

        // Start health check timer
        this.startHealthCheck();

        // Start rotation timer
        this.startAutoRotation();

        console.log('✅ Premium Proxy Manager initialized successfully');
    }

    private async testAllEndpoints(): Promise<void> {
        console.log(`🧪 Testing ${this.endpoints.length} proxy endpoints...`);

        const testPromises = this.endpoints.map(endpoint => this.testEndpoint(endpoint));
        const results = await Promise.allSettled(testPromises);

        let successCount = 0;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                successCount++;
                console.log(`✅ ${this.endpoints[index].provider}: ${result.value.ip} (${result.value.responseTime}ms)`);
            } else {
                const error = result.status === 'rejected' ? result.reason.message : result.value.error;
                console.log(`❌ ${this.endpoints[index].provider}: ${error}`);
            }
        });

        console.log(`📊 Proxy test complete: ${successCount}/${this.endpoints.length} working`);
    }

    async testEndpoint(endpoint: ProxyEndpoint): Promise<ProxyTestResult> {
        const startTime = Date.now();
        
        try {
            const proxyUrl = this.buildProxyUrl(endpoint);
            const agent = endpoint.protocol === 'socks5'
                ? new SocksProxyAgent(proxyUrl)
                : new HttpsProxyAgent(proxyUrl);

            const response = await this.testClient.get('https://ipapi.co/json/', {
                httpsAgent: agent,
                httpAgent: agent,
                timeout: this.config.timeoutMs
            });

            const responseTime = Date.now() - startTime;
            const data = response.data;

            // Update endpoint stats
            endpoint.totalRequests++;
            endpoint.successfulRequests++;
            endpoint.successRate = endpoint.successfulRequests / endpoint.totalRequests;
            endpoint.avgResponseTime = (endpoint.avgResponseTime + responseTime) / 2;
            endpoint.lastUsed = Date.now();
            endpoint.failures = 0;

            return {
                endpoint,
                success: true,
                responseTime,
                ip: data.ip,
                country: data.country_name,
                city: data.city
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Update endpoint stats
            endpoint.totalRequests++;
            endpoint.failures++;
            endpoint.successRate = endpoint.successfulRequests / endpoint.totalRequests;

            return {
                endpoint,
                success: false,
                responseTime,
                ip: 'unknown',
                country: 'unknown',
                error: error.message
            };
        }
    }

    private buildProxyUrl(endpoint: ProxyEndpoint): string {
        const auth = `${endpoint.username}:${endpoint.password}`;
        return `${endpoint.protocol}://${auth}@${endpoint.host}:${endpoint.port}`;
    }

    getNextEndpoint(options: {
        provider?: 'brightdata' | 'oxylabs' | 'smartproxy';
        country?: string;
        minSuccessRate?: number;
    } = {}): ProxyEndpoint | null {
        const minSuccessRate = options.minSuccessRate || 0.5;
        
        // Filter endpoints based on criteria
        let availableEndpoints = this.endpoints.filter(endpoint => {
            if (endpoint.successRate < minSuccessRate) return false;
            if (endpoint.failures >= this.config.maxFailures) return false;
            if (options.provider && endpoint.provider !== options.provider) return false;
            if (options.country && endpoint.country !== options.country) return false;
            return true;
        });

        if (availableEndpoints.length === 0) {
            console.warn('⚠️ No available proxy endpoints, resetting failure counts');
            this.endpoints.forEach(endpoint => {
                endpoint.failures = 0;
                endpoint.successRate = Math.max(endpoint.successRate, 0.5);
            });
            availableEndpoints = this.endpoints.filter(endpoint => endpoint.successRate >= 0.3);
        }

        if (availableEndpoints.length === 0) {
            return null;
        }

        // Sort by success rate and last used time
        availableEndpoints.sort((a, b) => {
            const aScore = a.successRate * 100 - (Date.now() - a.lastUsed) / 1000;
            const bScore = b.successRate * 100 - (Date.now() - b.lastUsed) / 1000;
            return bScore - aScore;
        });

        const selectedEndpoint = availableEndpoints[0];
        selectedEndpoint.lastUsed = Date.now();

        return selectedEndpoint;
    }

    async rotateEndpoint(currentEndpoint: ProxyEndpoint): Promise<ProxyEndpoint | null> {
        // For sticky sessions, create a new session ID
        if (currentEndpoint.isSticky && currentEndpoint.provider === 'brightdata') {
            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            currentEndpoint.sessionId = newSessionId;
            currentEndpoint.username = currentEndpoint.username.replace(
                /session-[^-]+-[^-]+$/,
                `session-${newSessionId}`
            );
        }

        return this.getNextEndpoint();
    }

    reportEndpointFailure(endpoint: ProxyEndpoint, error: string): void {
        endpoint.failures++;
        endpoint.totalRequests++;
        endpoint.successRate = endpoint.successfulRequests / endpoint.totalRequests;
        
        console.log(`⚠️ Proxy failure: ${endpoint.provider} (${endpoint.failures}/${this.config.maxFailures}) - ${error}`);
        
        if (endpoint.failures >= this.config.maxFailures) {
            console.log(`❌ Proxy blacklisted: ${endpoint.provider} ${endpoint.host}:${endpoint.port}`);
        }
    }

    reportEndpointSuccess(endpoint: ProxyEndpoint, responseTime: number): void {
        endpoint.successfulRequests++;
        endpoint.totalRequests++;
        endpoint.successRate = endpoint.successfulRequests / endpoint.totalRequests;
        endpoint.avgResponseTime = (endpoint.avgResponseTime + responseTime) / 2;
        endpoint.lastUsed = Date.now();
        endpoint.failures = Math.max(0, endpoint.failures - 1); // Slowly recover from failures
    }

    private startHealthCheck(): void {
        this.healthCheckTimer = setInterval(async () => {
            console.log('🏥 Running proxy health check...');
            
            const unhealthyEndpoints = this.endpoints.filter(
                endpoint => endpoint.successRate < 0.3 || endpoint.failures >= this.config.maxFailures
            );

            if (unhealthyEndpoints.length > 0) {
                console.log(`🔄 Testing ${unhealthyEndpoints.length} unhealthy endpoints...`);
                
                const testPromises = unhealthyEndpoints.map(endpoint => this.testEndpoint(endpoint));
                await Promise.allSettled(testPromises);
            }

        }, this.config.healthCheckInterval);
    }

    private startAutoRotation(): void {
        this.rotationTimer = setInterval(() => {
            console.log('🔄 Auto-rotating proxy sessions...');
            
            // Reset sticky sessions
            this.endpoints.forEach(endpoint => {
                if (endpoint.isSticky && Date.now() - endpoint.lastUsed > this.config.rotationInterval) {
                    this.rotateEndpoint(endpoint);
                }
            });
            
        }, this.config.rotationInterval);
    }

    getStatistics(): {
        totalEndpoints: number;
        workingEndpoints: number;
        providerStats: Record<string, {
            total: number;
            working: number;
            avgSuccessRate: number;
            avgResponseTime: number;
        }>;
        overallSuccessRate: number;
    } {
        const workingEndpoints = this.endpoints.filter(e => e.successRate >= 0.5 && e.failures < this.config.maxFailures);
        
        const providerStats: any = {};
        ['brightdata', 'oxylabs', 'smartproxy'].forEach(provider => {
            const providerEndpoints = this.endpoints.filter(e => e.provider === provider);
            const workingProviderEndpoints = providerEndpoints.filter(e => e.successRate >= 0.5);
            
            if (providerEndpoints.length > 0) {
                providerStats[provider] = {
                    total: providerEndpoints.length,
                    working: workingProviderEndpoints.length,
                    avgSuccessRate: providerEndpoints.reduce((sum, e) => sum + e.successRate, 0) / providerEndpoints.length,
                    avgResponseTime: providerEndpoints.reduce((sum, e) => sum + e.avgResponseTime, 0) / providerEndpoints.length
                };
            }
        });

        const overallSuccessRate = this.endpoints.length > 0
            ? this.endpoints.reduce((sum, e) => sum + e.successRate, 0) / this.endpoints.length
            : 0;

        return {
            totalEndpoints: this.endpoints.length,
            workingEndpoints: workingEndpoints.length,
            providerStats,
            overallSuccessRate
        };
    }

    async cleanup(): void {
        console.log('🧹 Cleaning up Premium Proxy Manager...');

        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
        }

        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = undefined;
        }

        console.log('✅ Premium Proxy Manager cleaned up');
    }
}

export default PremiumProxyManager;