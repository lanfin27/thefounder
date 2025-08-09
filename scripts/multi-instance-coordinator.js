// scripts/multi-instance-coordinator.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MultiInstanceCoordinator {
  constructor() {
    this.instances = [];
    this.instanceConfigs = this.generateInstanceConfigs();
    this.coordinatorStats = {
      totalInstances: 0,
      activeInstances: 0,
      totalListingsCollected: 0,
      startTime: new Date(),
      instanceMetrics: {}
    };
  }

  generateInstanceConfigs() {
    // Different time zones and user profiles for maximum coverage
    return [
      {
        id: 'instance_primary',
        schedule: 'continuous',
        userAgentProfile: 'chrome_windows',
        delayRange: [30000, 45000], // 30-45 seconds
        pageRange: [1, 50],
        priority: 1
      },
      {
        id: 'instance_secondary', 
        schedule: 'offset_30min',
        userAgentProfile: 'safari_mac',
        delayRange: [45000, 60000], // 45-60 seconds
        pageRange: [51, 100],
        priority: 2
      },
      {
        id: 'instance_tertiary',
        schedule: 'night_shift',
        userAgentProfile: 'firefox_linux',
        delayRange: [60000, 90000], // 60-90 seconds
        pageRange: [101, 150],
        priority: 3
      },
      {
        id: 'instance_weekend',
        schedule: 'weekend_only',
        userAgentProfile: 'edge_windows',
        delayRange: [35000, 50000], // 35-50 seconds
        pageRange: [151, 200],
        priority: 4
      }
    ];
  }

  async startMultiInstanceSystem() {
    console.log('🚀 MULTI-INSTANCE COORDINATOR STARTING');
    console.log(`📊 Managing ${this.instanceConfigs.length} instances`);
    
    this.coordinatorStats.totalInstances = this.instanceConfigs.length;
    
    // Start monitoring dashboard
    this.startMonitoringDashboard();
    
    // Start each instance based on schedule
    for (const config of this.instanceConfigs) {
      await this.scheduleInstance(config);
    }
    
    // Keep coordinator running
    this.startCoordinatorLoop();
  }

  async scheduleInstance(config) {
    const shouldStart = this.shouldStartInstance(config);
    
    if (shouldStart) {
      console.log(`🔄 Starting ${config.id} (${config.schedule})`);
      await this.startInstance(config);
    } else {
      console.log(`⏰ Scheduling ${config.id} for later (${config.schedule})`);
      this.scheduleInstanceLater(config);
    }
  }

  shouldStartInstance(config) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    
    switch (config.schedule) {
      case 'continuous':
        return true;
      case 'offset_30min':
        return now.getMinutes() >= 30;
      case 'night_shift':
        return hour >= 22 || hour <= 6; // 10PM - 6AM
      case 'weekend_only':
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      default:
        return true;
    }
  }

  async startInstance(config) {
    // Create instance-specific configuration file
    const instanceConfigPath = path.join(__dirname, `instance-config-${config.id}.json`);
    fs.writeFileSync(instanceConfigPath, JSON.stringify(config, null, 2));
    
    // Start instance process
    const instanceProcess = spawn('node', [
      path.join(__dirname, 'smart-instance-scraper.js'),
      instanceConfigPath
    ], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    // Track instance
    this.instances.push({
      config,
      process: instanceProcess,
      startTime: new Date(),
      status: 'running',
      stats: {
        pagesProcessed: 0,
        listingsFound: 0,
        errors: 0,
        lastSuccess: null
      }
    });
    
    this.coordinatorStats.activeInstances++;
    this.coordinatorStats.instanceMetrics[config.id] = {
      startTime: new Date(),
      status: 'active',
      performance: {}
    };
    
    // Monitor instance output
    instanceProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.processInstanceOutput(config.id, output);
      console.log(`[${config.id}] ${output.trim()}`);
    });
    
    instanceProcess.stderr.on('data', (data) => {
      console.error(`[${config.id}] ERROR: ${data.toString()}`);
    });
    
    instanceProcess.on('close', (code) => {
      console.log(`[${config.id}] Process exited with code ${code}`);
      this.handleInstanceExit(config.id, code);
    });
  }

  processInstanceOutput(instanceId, output) {
    // Parse instance output for metrics
    if (output.includes('✅ Page')) {
      const pageMatch = output.match(/Page (\d+): \+(\d+) listings/);
      if (pageMatch) {
        const listings = parseInt(pageMatch[2]);
        this.coordinatorStats.totalListingsCollected += listings;
        
        if (this.coordinatorStats.instanceMetrics[instanceId]) {
          this.coordinatorStats.instanceMetrics[instanceId].performance.lastListings = listings;
          this.coordinatorStats.instanceMetrics[instanceId].performance.lastUpdate = new Date();
        }
      }
    }
  }

  handleInstanceExit(instanceId, code) {
    this.coordinatorStats.activeInstances--;
    
    if (code !== 0) {
      console.log(`🔄 Restarting ${instanceId} due to unexpected exit`);
      
      // Find config and restart after delay
      const config = this.instanceConfigs.find(c => c.id === instanceId);
      if (config) {
        setTimeout(() => {
          this.startInstance(config);
        }, 60000); // Restart after 1 minute
      }
    }
  }

  scheduleInstanceLater(config) {
    // Calculate next start time based on schedule
    let nextStart = new Date();
    
    switch (config.schedule) {
      case 'offset_30min':
        nextStart.setMinutes(30, 0, 0);
        if (nextStart <= new Date()) {
          nextStart.setHours(nextStart.getHours() + 1);
        }
        break;
      case 'night_shift':
        nextStart.setHours(22, 0, 0, 0);
        if (nextStart <= new Date()) {
          nextStart.setDate(nextStart.getDate() + 1);
        }
        break;
      case 'weekend_only':
        while (nextStart.getDay() !== 6 && nextStart.getDay() !== 0) {
          nextStart.setDate(nextStart.getDate() + 1);
        }
        nextStart.setHours(9, 0, 0, 0);
        break;
    }
    
    const delay = nextStart.getTime() - new Date().getTime();
    console.log(`⏰ ${config.id} scheduled to start in ${(delay/1000/60).toFixed(0)} minutes`);
    
    setTimeout(() => {
      this.startInstance(config);
    }, delay);
  }

  startMonitoringDashboard() {
    // Update dashboard every minute
    setInterval(() => {
      this.displayDashboard();
    }, 60000);
    
    // Initial display
    setTimeout(() => this.displayDashboard(), 5000);
  }

  displayDashboard() {
    console.clear();
    console.log('🎛️  MULTI-INSTANCE COORDINATOR DASHBOARD');
    console.log('═'.repeat(60));
    console.log(`📊 Runtime: ${((new Date() - this.coordinatorStats.startTime) / 1000 / 60).toFixed(0)} minutes`);
    console.log(`🔄 Active Instances: ${this.coordinatorStats.activeInstances}/${this.coordinatorStats.totalInstances}`);
    console.log(`📈 Total Listings Collected: ${this.coordinatorStats.totalListingsCollected}`);
    console.log('');
    
    console.log('📋 INSTANCE STATUS:');
    Object.entries(this.coordinatorStats.instanceMetrics).forEach(([id, metrics]) => {
      const runtime = ((new Date() - metrics.startTime) / 1000 / 60).toFixed(0);
      const lastListings = metrics.performance?.lastListings || 0;
      const lastUpdate = metrics.performance?.lastUpdate || 'Never';
      
      console.log(`   ${id}: ${metrics.status} (${runtime}m) - Last: +${lastListings} listings`);
    });
    
    console.log('');
    console.log(`⏰ Next update: ${new Date(Date.now() + 60000).toLocaleTimeString()}`);
    console.log('═'.repeat(60));
  }

  startCoordinatorLoop() {
    // Health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 300000);
    
    // Save coordinator stats every 10 minutes
    setInterval(() => {
      this.saveCoordinatorStats();
    }, 600000);
  }

  performHealthCheck() {
    console.log('🔍 Performing health check...');
    
    // Check if we need to restart any instances
    this.instances.forEach(instance => {
      const runtime = new Date() - instance.startTime;
      const maxRuntime = 2 * 60 * 60 * 1000; // 2 hours
      
      if (runtime > maxRuntime && instance.stats.errors > 10) {
        console.log(`🔄 Restarting ${instance.config.id} due to excessive errors`);
        instance.process.kill();
      }
    });
  }

  saveCoordinatorStats() {
    const statsFile = `coordinator-stats-${Date.now()}.json`;
    fs.writeFileSync(statsFile, JSON.stringify(this.coordinatorStats, null, 2));
    console.log(`💾 Coordinator stats saved: ${statsFile}`);
  }
}

// Execute multi-instance coordinator
new MultiInstanceCoordinator().startMultiInstanceSystem();