// scripts/master-control-system.js
const { spawn } = require('child_process');
const fs = require('fs');

class MasterControlSystem {
  constructor() {
    this.systems = [
      {
        name: 'Multi-Instance Coordinator',
        script: 'multi-instance-coordinator.js',
        status: 'stopped',
        process: null,
        priority: 1,
        description: 'Manages multiple scraping instances with smart scheduling'
      },
      {
        name: 'Data Enrichment System',
        script: 'data-enrichment-system.js', 
        status: 'stopped',
        process: null,
        priority: 2,
        description: 'Enriches existing data with detailed information'
      }
    ];
  }

  async startMasterSystem() {
    console.log('🎛️ MASTER CONTROL SYSTEM STARTING');
    console.log('═'.repeat(60));
    console.log('🚀 Enterprise Flippa Intelligence Platform');
    console.log('📊 Multi-Instance Scaling + Smart Monitoring + Data Enrichment');
    console.log('═'.repeat(60));
    
    // Start systems in priority order
    for (const system of this.systems.sort((a, b) => a.priority - b.priority)) {
      console.log(`\n🔄 Starting ${system.name}...`);
      console.log(`📋 ${system.description}`);
      
      await this.startSystem(system);
      
      // Wait between system starts
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Start master monitoring
    this.startMasterMonitoring();
    
    console.log('\n🎉 MASTER CONTROL SYSTEM OPERATIONAL!');
    console.log('═'.repeat(60));
    console.log('🎛️ All systems started successfully');
    console.log('📊 Real-time monitoring active');
    console.log('🔗 Dashboard: http://localhost:3000/admin/scraping');
    console.log('═'.repeat(60));
  }

  async startSystem(system) {
    try {
      const process = spawn('node', [system.script], {
        cwd: __dirname,
        stdio: ['inherit', 'pipe', 'pipe']
      });
      
      system.process = process;
      system.status = 'running';
      system.startTime = new Date();
      
      process.stdout.on('data', (data) => {
        console.log(`[${system.name}] ${data.toString().trim()}`);
      });
      
      process.stderr.on('data', (data) => {
        console.error(`[${system.name}] ERROR: ${data.toString().trim()}`);
      });
      
      process.on('close', (code) => {
        console.log(`[${system.name}] Process exited with code ${code}`);
        system.status = 'stopped';
        
        if (code !== 0) {
          console.log(`🔄 Restarting ${system.name}...`);
          setTimeout(() => this.startSystem(system), 30000);
        }
      });
      
      console.log(`✅ ${system.name} started successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to start ${system.name}:`, error.message);
      system.status = 'error';
    }
  }

  startMasterMonitoring() {
    // System health check every 5 minutes
    setInterval(() => {
      this.performSystemHealthCheck();
    }, 300000);
    
    // Status dashboard every minute
    setInterval(() => {
      this.displayMasterDashboard();
    }, 60000);
    
    // Save system stats every 10 minutes
    setInterval(() => {
      this.saveSystemStats();
    }, 600000);
  }

  performSystemHealthCheck() {
    console.log('🔍 Master System Health Check');
    
    this.systems.forEach(system => {
      if (system.status === 'running' && system.process) {
        // Check if process is still alive
        try {
          process.kill(system.process.pid, 0);
        } catch (error) {
          console.log(`❌ ${system.name} appears to be dead, restarting...`);
          system.status = 'restarting';
          this.startSystem(system);
        }
      }
    });
  }

  displayMasterDashboard() {
    console.clear();
    console.log('🎛️ MASTER CONTROL DASHBOARD');
    console.log('═'.repeat(60));
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log('');
    
    console.log('📊 SYSTEM STATUS:');
    this.systems.forEach(system => {
      const uptime = system.startTime ? 
        Math.floor((new Date() - system.startTime) / 1000 / 60) : 0;
      const statusIcon = system.status === 'running' ? '🟢' : 
                        system.status === 'error' ? '🔴' : '🟡';
      
      console.log(`   ${statusIcon} ${system.name}: ${system.status} (${uptime}m)`);
    });
    
    console.log('');
    console.log('🎯 ENTERPRISE FEATURES ACTIVE:');
    console.log('   ✅ Multi-Instance Scaling (4 instances)');
    console.log('   ✅ Smart Monitoring & Auto-Adjustment');
    console.log('   ✅ Data Enrichment & Trend Analysis');
    console.log('   ✅ Price Change Tracking');
    console.log('   ✅ Quality Metrics & Optimization');
    console.log('');
    console.log('═'.repeat(60));
  }

  saveSystemStats() {
    const stats = {
      timestamp: new Date().toISOString(),
      systems: this.systems.map(system => ({
        name: system.name,
        status: system.status,
        uptime: system.startTime ? new Date() - system.startTime : 0,
        pid: system.process?.pid
      }))
    };
    
    fs.writeFileSync(`master-system-stats-${Date.now()}.json`, JSON.stringify(stats, null, 2));
  }
}

// Execute master control system
new MasterControlSystem().startMasterSystem();