// setup-flaresolverr.js
// Automated FlareSolverr Docker container setup and management

const { spawn, exec } = require('child_process');
const axios = require('axios');
const path = require('path');

class FlareSolverrSetup {
    constructor() {
        this.containerName = 'flaresolverr-advanced';
        this.port = 8191;
        this.endpoint = `http://localhost:${this.port}/v1`;
        this.maxSetupTime = 120000; // 2 minutes
    }

    async checkDockerInstalled() {
        console.log('🐳 Checking Docker installation...');
        
        return new Promise((resolve, reject) => {
            exec('docker --version', (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Docker not found. Please install Docker Desktop first.');
                    console.log('📋 Download from: https://docs.docker.com/desktop/install/windows-install/');
                    reject(new Error('Docker not installed'));
                    return;
                }
                
                console.log('✅ Docker found:', stdout.trim());
                resolve(true);
            });
        });
    }

    async stopExistingContainer() {
        console.log('🛑 Stopping any existing FlareSolverr containers...');
        
        return new Promise((resolve) => {
            exec(`docker stop ${this.containerName} 2>nul && docker rm ${this.containerName} 2>nul`, (error) => {
                // Ignore errors - container might not exist
                resolve();
            });
        });
    }

    async pullFlareSolverrImage() {
        console.log('📥 Pulling latest FlareSolverr image...');
        
        return new Promise((resolve, reject) => {
            const pullProcess = spawn('docker', [
                'pull', 
                'ghcr.io/flaresolverr/flaresolverr:latest'
            ], { stdio: 'pipe' });

            let output = '';
            
            pullProcess.stdout.on('data', (data) => {
                output += data.toString();
                // Show progress
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.includes('Downloading') || line.includes('Extracting')) {
                        process.stdout.write('.');
                    }
                });
            });

            pullProcess.stderr.on('data', (data) => {
                console.error('Docker pull error:', data.toString());
            });

            pullProcess.on('close', (code) => {
                console.log('\n');
                if (code === 0) {
                    console.log('✅ FlareSolverr image pulled successfully');
                    resolve();
                } else {
                    console.error('❌ Failed to pull FlareSolverr image');
                    reject(new Error(`Docker pull failed with code ${code}`));
                }
            });
        });
    }

    async startFlareSolverrContainer() {
        console.log('🚀 Starting FlareSolverr container...');
        
        const dockerArgs = [
            'run',
            '-d',
            '--name', this.containerName,
            '--restart', 'unless-stopped',
            '-p', `${this.port}:8191`,
            '-e', 'LOG_LEVEL=info',
            '-e', 'LOG_HTML=false',
            '-e', 'CAPTCHA_SOLVER=none',
            '-e', 'TZ=UTC',
            // Enhanced settings for better success rate
            '-e', 'BROWSER_TIMEOUT=40000',
            '-e', 'TEST_URL=https://www.google.com',
            // Memory and resource limits
            '--memory=2g',
            '--cpus=2',
            'ghcr.io/flaresolverr/flaresolverr:latest'
        ];

        return new Promise((resolve, reject) => {
            const containerProcess = spawn('docker', dockerArgs, { stdio: 'pipe' });

            containerProcess.stdout.on('data', (data) => {
                console.log('Docker output:', data.toString().trim());
            });

            containerProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.log('Docker info:', error.trim());
                
                // Check for port already in use
                if (error.includes('port is already allocated')) {
                    console.warn('⚠️ Port 8191 is already in use. Attempting to stop existing container...');
                }
            });

            containerProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ FlareSolverr container started successfully');
                    console.log(`🌐 Available at: ${this.endpoint}`);
                    resolve();
                } else {
                    reject(new Error(`Container failed to start with code ${code}`));
                }
            });
        });
    }

    async waitForFlareSolverrReady(maxWaitTime = 60000) {
        console.log('⏳ Waiting for FlareSolverr to be ready...');
        
        const startTime = Date.now();
        let attempts = 0;
        
        while (Date.now() - startTime < maxWaitTime) {
            attempts++;
            
            try {
                const response = await axios.get(this.endpoint, { timeout: 5000 });
                
                if (response.data && response.data.msg === 'FlareSolverr is ready!') {
                    console.log(`✅ FlareSolverr ready after ${attempts} attempts (${Date.now() - startTime}ms)`);
                    console.log(`📊 Version: ${response.data.version}`);
                    return true;
                }
            } catch (error) {
                // Continue waiting
                process.stdout.write('.');
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('\n❌ FlareSolverr failed to become ready within timeout');
        return false;
    }

    async testFlareSolverrBasic() {
        console.log('🧪 Testing FlareSolverr basic functionality...');
        
        try {
            // Test session creation
            const sessionResponse = await axios.post(this.endpoint, {
                cmd: 'sessions.create',
                session: 'test_session'
            }, { timeout: 10000 });

            if (sessionResponse.data.status === 'ok') {
                console.log('✅ Session creation successful');
                
                // Test simple request
                const testResponse = await axios.post(this.endpoint, {
                    cmd: 'request.get',
                    session: 'test_session',
                    url: 'https://httpbin.org/ip',
                    maxTimeout: 20000
                }, { timeout: 30000 });

                if (testResponse.data.status === 'ok' && testResponse.data.solution) {
                    console.log('✅ Basic request test successful');
                    console.log(`📊 Response status: ${testResponse.data.solution.status}`);
                    console.log(`📏 Response length: ${testResponse.data.solution.response.length} chars`);
                    
                    // Cleanup test session
                    await axios.post(this.endpoint, {
                        cmd: 'sessions.destroy',
                        session: 'test_session'
                    });
                    
                    return true;
                } else {
                    console.log('❌ Basic request test failed');
                    return false;
                }
            } else {
                console.log('❌ Session creation failed');
                return false;
            }
        } catch (error) {
            console.error('❌ FlareSolverr test failed:', error.message);
            return false;
        }
    }

    async testCloudflareBypass() {
        console.log('🔍 Testing Cloudflare bypass capabilities...');
        
        try {
            // Create session for Cloudflare testing
            const sessionResponse = await axios.post(this.endpoint, {
                cmd: 'sessions.create',
                session: 'cf_test_session'
            });

            if (sessionResponse.data.status === 'ok') {
                console.log('✅ Cloudflare test session created');
                
                // Test against a known Cloudflare-protected site
                const testResponse = await axios.post(this.endpoint, {
                    cmd: 'request.get',
                    session: 'cf_test_session',
                    url: 'https://flippa.com',
                    maxTimeout: 45000
                }, { timeout: 60000 });

                if (testResponse.data.status === 'ok' && testResponse.data.solution) {
                    const solution = testResponse.data.solution;
                    console.log('✅ Cloudflare bypass test completed');
                    console.log(`📊 Final status: ${solution.status}`);
                    console.log(`🌐 Final URL: ${solution.url}`);
                    console.log(`📏 Response length: ${solution.response.length} chars`);
                    
                    // Check if we successfully bypassed Cloudflare
                    const isChallengeScreen = solution.response.includes('Just a moment') || 
                                           solution.response.includes('Checking your browser');
                    
                    if (!isChallengeScreen && solution.status === 200) {
                        console.log('🎉 Cloudflare bypass SUCCESSFUL!');
                    } else {
                        console.log('⚠️ Still on Cloudflare challenge page');
                    }
                    
                    // Cleanup
                    await axios.post(this.endpoint, {
                        cmd: 'sessions.destroy',
                        session: 'cf_test_session'
                    });
                    
                    return !isChallengeScreen;
                } else {
                    console.log('❌ Cloudflare test failed');
                    return false;
                }
            }
        } catch (error) {
            console.error('❌ Cloudflare bypass test failed:', error.message);
            return false;
        }
    }

    async getContainerLogs() {
        console.log('📋 Getting FlareSolverr container logs...');
        
        return new Promise((resolve) => {
            exec(`docker logs ${this.containerName} --tail 20`, (error, stdout, stderr) => {
                if (!error) {
                    console.log('📄 Container logs:');
                    console.log(stdout);
                    if (stderr) {
                        console.log('⚠️ Stderr:', stderr);
                    }
                }
                resolve();
            });
        });
    }

    async setup() {
        console.log('🚀 Starting FlareSolverr Advanced Setup');
        console.log('======================================\n');
        
        try {
            // Step 1: Check Docker
            await this.checkDockerInstalled();
            
            // Step 2: Stop existing containers
            await this.stopExistingContainer();
            
            // Step 3: Pull latest image
            await this.pullFlareSolverrImage();
            
            // Step 4: Start container
            await this.startFlareSolverrContainer();
            
            // Step 5: Wait for ready
            const isReady = await this.waitForFlareSolverrReady();
            if (!isReady) {
                await this.getContainerLogs();
                throw new Error('FlareSolverr failed to become ready');
            }
            
            // Step 6: Test basic functionality
            const basicTest = await this.testFlareSolverrBasic();
            if (!basicTest) {
                throw new Error('Basic functionality test failed');
            }
            
            // Step 7: Test Cloudflare bypass
            const cfTest = await this.testCloudflareBypass();
            
            console.log('\n🎉 FlareSolverr Setup Complete!');
            console.log('===============================');
            console.log(`🌐 Endpoint: ${this.endpoint}`);
            console.log(`📦 Container: ${this.containerName}`);
            console.log(`🛡️ Cloudflare Bypass: ${cfTest ? 'Working' : 'Needs Testing'}`);
            console.log('\n📋 Management Commands:');
            console.log(`   Stop:    docker stop ${this.containerName}`);
            console.log(`   Start:   docker start ${this.containerName}`);
            console.log(`   Logs:    docker logs ${this.containerName}`);
            console.log(`   Remove:  docker rm ${this.containerName}`);
            
            return true;
            
        } catch (error) {
            console.error('\n❌ FlareSolverr setup failed:', error.message);
            await this.getContainerLogs();
            return false;
        }
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new FlareSolverrSetup();
    
    setup.setup().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
}

module.exports = FlareSolverrSetup;