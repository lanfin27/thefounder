// setup-flaresolverr-alternative.js
// Alternative FlareSolverr setup using Node.js proxy service

const express = require('express');
const axios = require('axios');
const { chromium } = require('playwright');
const path = require('path');

class FlareSolverrAlternative {
    constructor() {
        this.port = 8191;
        this.app = express();
        this.server = null;
        this.browser = null;
        this.contexts = new Map();
        
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.use(express.json());
        
        // Health check endpoint
        this.app.get('/v1', (req, res) => {
            res.json({
                msg: 'FlareSolverr Alternative is ready!',
                version: '1.0.0-alternative',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });
        });

        // Main API endpoint
        this.app.post('/v1', async (req, res) => {
            try {
                const result = await this.handleRequest(req.body);
                res.json(result);
            } catch (error) {
                res.json({
                    status: 'error',
                    message: error.message,
                    startTimestamp: Date.now(),
                    endTimestamp: Date.now()
                });
            }
        });
    }

    async handleRequest(requestBody) {
        const { cmd, session, url, maxTimeout = 45000 } = requestBody;
        const startTimestamp = Date.now();

        switch (cmd) {
            case 'sessions.create':
                return await this.createSession(session, startTimestamp);
            
            case 'sessions.destroy':
                return await this.destroySession(session, startTimestamp);
            
            case 'request.get':
                return await this.solveCloudflare(url, session, maxTimeout, startTimestamp);
            
            case 'request.post':
                return await this.solveCloudflare(url, session, maxTimeout, startTimestamp, 'POST', requestBody.postData);
            
            default:
                throw new Error(`Unknown command: ${cmd}`);
        }
    }

    async createSession(sessionId = 'default', startTimestamp) {
        if (!this.browser) {
            await this.initializeBrowser();
        }

        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1366, height: 768 },
            ignoreHTTPSErrors: true
        });

        this.contexts.set(sessionId, context);

        return {
            status: 'ok',
            message: 'Session created successfully',
            session: sessionId,
            startTimestamp,
            endTimestamp: Date.now(),
            version: '1.0.0-alternative'
        };
    }

    async destroySession(sessionId, startTimestamp) {
        const context = this.contexts.get(sessionId);
        if (context) {
            await context.close();
            this.contexts.delete(sessionId);
        }

        return {
            status: 'ok',
            message: 'Session destroyed successfully',
            startTimestamp,
            endTimestamp: Date.now(),
            version: '1.0.0-alternative'
        };
    }

    async solveCloudflare(url, sessionId = 'default', maxTimeout, startTimestamp, method = 'GET', postData = null) {
        let context = this.contexts.get(sessionId);
        
        if (!context) {
            // Create session if it doesn't exist
            await this.createSession(sessionId, startTimestamp);
            context = this.contexts.get(sessionId);
        }

        const page = await context.newPage();

        try {
            // Apply stealth measures
            await this.applyStealthMeasures(page);

            console.log(`🔍 Solving Cloudflare challenge for: ${url}`);
            
            // Navigate to the URL
            const response = await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: maxTimeout
            });

            // Check for Cloudflare challenge
            await this.handleCloudflareChallenge(page, maxTimeout);

            // Get final page content
            const finalUrl = page.url();
            const content = await page.content();
            const cookies = await context.cookies();

            return {
                status: 'ok',
                message: 'Challenge solved successfully',
                startTimestamp,
                endTimestamp: Date.now(),
                version: '1.0.0-alternative',
                solution: {
                    url: finalUrl,
                    status: response?.status() || 200,
                    headers: await this.getResponseHeaders(response),
                    response: content,
                    cookies: cookies.map(cookie => ({
                        name: cookie.name,
                        value: cookie.value,
                        domain: cookie.domain,
                        path: cookie.path
                    })),
                    userAgent: await page.evaluate(() => navigator.userAgent)
                }
            };

        } finally {
            await page.close();
        }
    }

    async applyStealthMeasures(page) {
        await page.addInitScript(() => {
            // Hide webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            // Remove automation indicators
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

            // Spoof Chrome object
            window.chrome = {
                runtime: {},
                loadTimes: function() {
                    return {
                        commitLoadTime: Date.now(),
                        connectionInfo: 'http/1.1',
                        finishDocumentLoadTime: Date.now(),
                        finishLoadTime: Date.now(),
                        firstPaintAfterLoadTime: 0,
                        firstPaintTime: Date.now(),
                        navigationType: 'Other',
                        npnNegotiatedProtocol: 'http/1.1',
                        requestTime: Date.now() - 1000,
                        startLoadTime: Date.now() - 1000,
                        wasAlternateProtocolAvailable: false,
                        wasFetchedViaSpdy: false,
                        wasNpnNegotiated: false
                    };
                }
            };
        });

        // Set realistic headers
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

    async handleCloudflareChallenge(page, maxTimeout) {
        const startTime = Date.now();
        const timeoutMs = Math.min(maxTimeout, 60000); // Max 1 minute for challenge

        while (Date.now() - startTime < timeoutMs) {
            try {
                // Check if we're on a Cloudflare challenge page
                const isChallengePage = await page.evaluate(() => {
                    return document.title.includes('Just a moment') ||
                           document.body.innerHTML.includes('Checking your browser') ||
                           document.body.innerHTML.includes('Please wait while we verify') ||
                           document.body.innerHTML.includes('cf-browser-verification');
                });

                if (!isChallengePage) {
                    console.log('✅ Cloudflare challenge bypassed or not present');
                    return;
                }

                console.log('⏳ Cloudflare challenge detected, waiting for automatic resolution...');
                
                // Wait for navigation away from challenge page
                try {
                    await page.waitForFunction(
                        () => !document.title.includes('Just a moment') && 
                              !document.body.innerHTML.includes('Checking your browser'),
                        { timeout: 10000 }
                    );
                    console.log('✅ Challenge resolved automatically');
                    return;
                } catch (waitError) {
                    // Continue waiting
                }

                // Wait a bit before checking again
                await page.waitForTimeout(2000);

            } catch (error) {
                console.warn('⚠️ Error during challenge handling:', error.message);
                await page.waitForTimeout(1000);
            }
        }

        console.log('⚠️ Cloudflare challenge timeout - proceeding with current state');
    }

    async getResponseHeaders(response) {
        if (!response) return {};
        
        try {
            return await response.allHeaders();
        } catch (error) {
            return {};
        }
    }

    async initializeBrowser() {
        console.log('🚀 Initializing browser for FlareSolverr Alternative...');
        
        this.browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor',
                '--disable-ipc-flooding-protection'
            ]
        });
        
        console.log('✅ Browser initialized');
    }

    async start() {
        console.log('🚀 Starting FlareSolverr Alternative Service');
        console.log('==========================================\n');

        try {
            await this.initializeBrowser();

            this.server = this.app.listen(this.port, () => {
                console.log(`✅ FlareSolverr Alternative started successfully`);
                console.log(`🌐 Endpoint: http://localhost:${this.port}/v1`);
                console.log(`📊 Ready to handle Cloudflare challenges`);
            });

            // Test the service
            await this.testService();

            return true;

        } catch (error) {
            console.error('❌ Failed to start service:', error.message);
            return false;
        }
    }

    async testService() {
        console.log('\n🧪 Testing FlareSolverr Alternative...');
        
        // Wait a moment for server to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Test health endpoint
            const healthResponse = await axios.get(`http://localhost:${this.port}/v1`);
            console.log('✅ Health check passed');

            // Test session creation
            const sessionResponse = await axios.post(`http://localhost:${this.port}/v1`, {
                cmd: 'sessions.create',
                session: 'test_session'
            });

            if (sessionResponse.data.status === 'ok') {
                console.log('✅ Session creation test passed');

                // Test simple request
                const requestResponse = await axios.post(`http://localhost:${this.port}/v1`, {
                    cmd: 'request.get',
                    session: 'test_session',
                    url: 'https://httpbin.org/ip',
                    maxTimeout: 20000
                }, { timeout: 30000 });

                if (requestResponse.data.status === 'ok') {
                    console.log('✅ Basic request test passed');
                    console.log('🎉 FlareSolverr Alternative is fully functional!');
                } else {
                    console.log('⚠️ Basic request test failed');
                }

                // Cleanup
                await axios.post(`http://localhost:${this.port}/v1`, {
                    cmd: 'sessions.destroy',
                    session: 'test_session'
                });
            }

        } catch (error) {
            console.error('❌ Service test failed:', error.message);
        }
    }

    async stop() {
        console.log('🛑 Stopping FlareSolverr Alternative...');

        // Close all contexts
        for (const [sessionId, context] of this.contexts) {
            await context.close();
        }
        this.contexts.clear();

        // Close browser
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }

        // Stop server
        if (this.server) {
            this.server.close();
            this.server = null;
        }

        console.log('✅ FlareSolverr Alternative stopped');
    }
}

// Export for use as module
module.exports = FlareSolverrAlternative;

// Run if called directly
if (require.main === module) {
    const service = new FlareSolverrAlternative();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await service.stop();
        process.exit(0);
    });

    service.start().then(success => {
        if (success) {
            console.log('\n📋 Service is running. Press Ctrl+C to stop.');
        } else {
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Service failed to start:', error);
        process.exit(1);
    });
}