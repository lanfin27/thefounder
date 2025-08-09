// Automated monitoring script for Windows Task Scheduler
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const API_URL = 'http://localhost:3001/api/monitoring/scan';
const LOG_FILE = path.join(__dirname, '..', 'logs', 'monitoring-details.log');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Logging function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(LOG_FILE, logMessage);
}

async function runMonitoring() {
    log('=== Starting Incremental Monitoring ===');
    
    try {
        // 1. Check if server is running
        log('Checking server status...');
        try {
            const healthCheck = await fetch('http://localhost:3001/api/monitoring/status');
            if (!healthCheck.ok) {
                throw new Error('Server not responding');
            }
        } catch (serverError) {
            log('ERROR: Server not running. Starting server...');
            
            // Start the server
            const { spawn } = require('child_process');
            const server = spawn('npm', ['run', 'dev'], {
                cwd: path.join(__dirname, '..'),
                detached: true,
                stdio: 'ignore'
            });
            server.unref();
            
            // Wait for server to start
            log('Waiting for server to start...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        // 2. Get baseline count
        log('Getting baseline listing count...');
        const { count: baselineCount } = await supabase
            .from('flippa_listings')
            .select('*', { count: 'exact', head: true });
        log(`Current listings: ${baselineCount}`);
        
        // 3. Trigger monitoring scan
        log('Triggering monitoring scan...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                manual: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        log(`Scan result: ${JSON.stringify(result, null, 2)}`);
        
        // 4. Wait for processing
        if (result.success) {
            log('Scan initiated successfully. Waiting for completion...');
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
            
            // 5. Check results
            const { count: newCount } = await supabase
                .from('flippa_listings')
                .select('*', { count: 'exact', head: true });
            
            const newListings = newCount - baselineCount;
            log(`Scan complete. New listings: ${newListings}`);
            
            // 6. Log summary
            const summary = {
                timestamp: new Date().toISOString(),
                baselineCount,
                newCount,
                newListings,
                scanId: result.scanId || 'N/A',
                mode: result.results?.mode || 'unknown',
                duration: result.results?.duration || 0
            };
            
            // Append to summary log
            const summaryFile = path.join(logsDir, 'monitoring-summary.json');
            let summaries = [];
            if (fs.existsSync(summaryFile)) {
                summaries = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
            }
            summaries.push(summary);
            fs.writeFileSync(summaryFile, JSON.stringify(summaries, null, 2));
            
            log('Summary saved to monitoring-summary.json');
        } else {
            log(`ERROR: Scan failed - ${result.error || 'Unknown error'}`);
        }
        
    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(error.stack);
    }
    
    log('=== Monitoring Task Complete ===\n');
}

// Run the monitoring
runMonitoring().catch(error => {
    log(`FATAL ERROR: ${error.message}`);
    process.exit(1);
});