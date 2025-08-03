/**
 * Collection Monitor
 * Monitors and automatically restarts the ultimate collector if it fails
 */

const { spawn } = require('child_process');

class CollectionMonitor {
  constructor() {
    this.maxRetries = 3;
    this.currentRetry = 0;
    this.startTime = Date.now();
  }

  async monitorAndRestart() {
    console.log('🔍 Starting collection monitor...');
    console.log(`📋 Max retries: ${this.maxRetries}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    while (this.currentRetry < this.maxRetries) {
      try {
        console.log(`🚀 Starting collection attempt ${this.currentRetry + 1}/${this.maxRetries}`);
        await this.runCollection();
        console.log('✅ Collection completed successfully');
        break;
        
      } catch (error) {
        this.currentRetry++;
        console.error(`\n❌ Collection failed (attempt ${this.currentRetry}/${this.maxRetries}):`, error.message);
        
        if (this.currentRetry < this.maxRetries) {
          console.log(`🔄 Restarting in 30 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
        } else {
          console.log('\n❌ Maximum retries reached. Collection failed.');
        }
      }
    }
    
    const totalDuration = (Date.now() - this.startTime) / 1000 / 60;
    console.log(`\n⏱️ Total monitor duration: ${totalDuration.toFixed(1)} minutes`);
  }

  runCollection() {
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['scripts/ultimate-marketplace-collector.js'], {
        stdio: 'inherit'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Collection process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
      
      // Add timeout handler (2 hours)
      const timeout = setTimeout(() => {
        console.log('\n⚠️ Collection timeout reached (2 hours). Terminating...');
        child.kill();
        reject(new Error('Collection timeout'));
      }, 2 * 60 * 60 * 1000);
      
      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }
}

// Execute monitor
async function main() {
  console.log('🎯 COLLECTION MONITOR STARTING');
  console.log('💪 Automatic retry on failure enabled');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const monitor = new CollectionMonitor();
  await monitor.monitorAndRestart();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CollectionMonitor };