// flaresolverr-client.ts
// FlareSolverr proxy service client for automatic CAPTCHA solving

import axios, { AxiosInstance } from 'axios';

export interface FlareSolverrConfig {
  endpoint: string; // FlareSolverr service endpoint
  timeout: number;
  maxAttempts: number;
  userAgent?: string;
  proxy?: string;
}

export interface FlareSolverrRequest {
  cmd: 'sessions.create' | 'sessions.destroy' | 'request.get' | 'request.post';
  session?: string;
  url?: string;
  userAgent?: string;
  maxTimeout?: number;
  cookies?: Array<{ name: string; value: string; domain?: string }>;
  proxy?: { url: string; username?: string; password?: string };
  postData?: string;
  headers?: Record<string, string>;
}

export interface FlareSolverrResponse {
  status: 'ok' | 'error';
  message: string;
  startTimestamp: number;
  endTimestamp: number;
  version: string;
  solution?: {
    url: string;
    status: number;
    headers: Record<string, string>;
    response: string;
    cookies: Array<{ name: string; value: string; domain: string; path: string }>;
    userAgent: string;
  };
  session?: string;
  sessions?: string[];
}

export class FlareSolverrClient {
  private client: AxiosInstance;
  private config: FlareSolverrConfig;
  private activeSessions: Set<string> = new Set();

  constructor(config: Partial<FlareSolverrConfig> = {}) {
    this.config = {
      endpoint: 'http://localhost:8191/v1',
      timeout: 60000, // 60 seconds
      maxAttempts: 3,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async createSession(sessionId?: string): Promise<string> {
    try {
      console.log('🔧 Creating FlareSolverr session...');

      const request: FlareSolverrRequest = {
        cmd: 'sessions.create',
        session: sessionId,
        userAgent: this.config.userAgent,
        proxy: this.config.proxy ? { url: this.config.proxy } : undefined
      };

      const response = await this.client.post('', request);
      const result: FlareSolverrResponse = response.data;

      if (result.status === 'error') {
        throw new Error(`FlareSolverr session creation failed: ${result.message}`);
      }

      const createdSessionId = result.session || sessionId || 'default';
      this.activeSessions.add(createdSessionId);

      console.log(`✅ FlareSolverr session created: ${createdSessionId}`);
      return createdSessionId;

    } catch (error) {
      console.error('❌ Failed to create FlareSolverr session:', error);
      throw new Error(`FlareSolverr session creation failed: ${error.message}`);
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    try {
      console.log(`🗑️ Destroying FlareSolverr session: ${sessionId}`);

      const request: FlareSolverrRequest = {
        cmd: 'sessions.destroy',
        session: sessionId
      };

      const response = await this.client.post('', request);
      const result: FlareSolverrResponse = response.data;

      if (result.status === 'error') {
        console.warn(`Warning: FlareSolverr session destruction failed: ${result.message}`);
      }

      this.activeSessions.delete(sessionId);
      console.log(`✅ FlareSolverr session destroyed: ${sessionId}`);

    } catch (error) {
      console.warn('⚠️ Failed to destroy FlareSolverr session:', error.message);
      this.activeSessions.delete(sessionId);
    }
  }

  async solveCloudflare(
    url: string, 
    sessionId?: string,
    options: {
      method?: 'GET' | 'POST';
      postData?: string;
      headers?: Record<string, string>;
      cookies?: Array<{ name: string; value: string; domain?: string }>;
      userAgent?: string;
      proxy?: string;
      maxTimeout?: number;
    } = {}
  ): Promise<{
    url: string;
    status: number;
    headers: Record<string, string>;
    html: string;
    cookies: Array<{ name: string; value: string; domain: string; path: string }>;
    userAgent: string;
    responseTime: number;
  }> {
    let currentSessionId = sessionId;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      try {
        attempt++;
        console.log(`🔍 Attempting Cloudflare bypass (attempt ${attempt}/${this.config.maxAttempts}): ${url}`);

        // Create session if not provided
        if (!currentSessionId) {
          currentSessionId = await this.createSession();
        }

        const request: FlareSolverrRequest = {
          cmd: options.method === 'POST' ? 'request.post' : 'request.get',
          session: currentSessionId,
          url,
          userAgent: options.userAgent || this.config.userAgent,
          maxTimeout: options.maxTimeout || 45000,
          cookies: options.cookies,
          postData: options.postData,
          headers: options.headers,
          proxy: options.proxy ? { url: options.proxy } : (this.config.proxy ? { url: this.config.proxy } : undefined)
        };

        const startTime = Date.now();
        const response = await this.client.post('', request);
        const responseTime = Date.now() - startTime;

        const result: FlareSolverrResponse = response.data;

        if (result.status === 'error') {
          throw new Error(`FlareSolverr request failed: ${result.message}`);
        }

        if (!result.solution) {
          throw new Error('FlareSolverr returned no solution');
        }

        console.log(`✅ Cloudflare bypass successful in ${responseTime}ms`);
        console.log(`📊 Status: ${result.solution.status}, Response length: ${result.solution.response.length}`);

        return {
          url: result.solution.url,
          status: result.solution.status,
          headers: result.solution.headers,
          html: result.solution.response,
          cookies: result.solution.cookies,
          userAgent: result.solution.userAgent,
          responseTime
        };

      } catch (error) {
        console.warn(`⚠️ Cloudflare bypass attempt ${attempt} failed:`, error.message);

        // If session-related error, destroy and recreate session
        if (error.message.includes('session') || error.message.includes('Session')) {
          if (currentSessionId) {
            await this.destroySession(currentSessionId);
            currentSessionId = undefined;
          }
        }

        if (attempt === this.config.maxAttempts) {
          throw new Error(`Cloudflare bypass failed after ${this.config.maxAttempts} attempts: ${error.message}`);
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Cloudflare bypass failed after all attempts');
  }

  async checkHealth(): Promise<boolean> {
    try {
      console.log('🔍 Checking FlareSolverr health...');
      
      const response = await this.client.get('');
      const result = response.data;

      if (result && result.status === 'ok') {
        console.log('✅ FlareSolverr is healthy');
        return true;
      } else {
        console.log('❌ FlareSolverr health check failed');
        return false;
      }

    } catch (error) {
      console.error('❌ FlareSolverr health check error:', error.message);
      return false;
    }
  }

  async listSessions(): Promise<string[]> {
    try {
      const request: FlareSolverrRequest = {
        cmd: 'sessions.list' as any
      };

      const response = await this.client.post('', request);
      const result: FlareSolverrResponse = response.data;

      if (result.status === 'error') {
        throw new Error(`Failed to list sessions: ${result.message}`);
      }

      return result.sessions || [];

    } catch (error) {
      console.error('❌ Failed to list FlareSolverr sessions:', error);
      return [];
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up FlareSolverr sessions...');

    const cleanupPromises = Array.from(this.activeSessions).map(sessionId => 
      this.destroySession(sessionId).catch(error => 
        console.warn(`Warning: Failed to cleanup session ${sessionId}:`, error.message)
      )
    );

    await Promise.allSettled(cleanupPromises);
    this.activeSessions.clear();
    console.log('✅ FlareSolverr cleanup completed');
  }

  getActiveSessions(): string[] {
    return Array.from(this.activeSessions);
  }

  // Static method to start FlareSolverr Docker container
  static async startFlareSolverrContainer(options: {
    port?: number;
    logLevel?: 'debug' | 'info' | 'warning' | 'error';
    maxTimeout?: number;
  } = {}): Promise<void> {
    const { spawn } = require('child_process');
    
    const port = options.port || 8191;
    const logLevel = options.logLevel || 'info';
    const maxTimeout = options.maxTimeout || 60000;

    console.log('🐳 Starting FlareSolverr Docker container...');

    const dockerArgs = [
      'run',
      '-d',
      '--name', 'flaresolverr',
      '-p', `${port}:8191`,
      '-e', `LOG_LEVEL=${logLevel}`,
      '-e', `CAPTCHA_SOLVER=none`,
      '-e', `TZ=UTC`,
      '--restart', 'unless-stopped',
      'ghcr.io/flaresolverr/flaresolverr:latest'
    ];

    return new Promise((resolve, reject) => {
      const dockerProcess = spawn('docker', dockerArgs, { stdio: 'pipe' });

      dockerProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FlareSolverr container started successfully');
          console.log(`🌐 FlareSolverr available at: http://localhost:${port}`);
          resolve();
        } else {
          reject(new Error(`Docker container failed to start with code ${code}`));
        }
      });

      dockerProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        if (error.includes('already in use') || error.includes('already exists')) {
          console.log('ℹ️ FlareSolverr container already running');
          resolve();
        } else {
          console.error('Docker error:', error);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        dockerProcess.kill();
        reject(new Error('FlareSolverr container startup timeout'));
      }, 30000);
    });
  }
}

export default FlareSolverrClient;