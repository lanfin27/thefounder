// index.js
// Main entry point for the complete integration system

const DeploymentManager = require('./production-deployment/deployment-manager');
const DeploymentConfig = require('./production-deployment/deployment-config');
const MonitoringAlerts = require('./production-deployment/monitoring-alerts');

async function main() {
  console.log('🚀 Starting Stealth Collection Integration System');
  
  // Load configuration based on environment
  const environment = process.env.NODE_ENV || 'production';
  const deploymentConfig = new DeploymentConfig(environment);
  
  // Validate configuration
  const validation = await deploymentConfig.validate();
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  // Get full configuration
  const config = deploymentConfig.getAll();
  
  try {
    // Initialize monitoring alerts
    const monitoringAlerts = new MonitoringAlerts(config.monitoring?.alerts);
    
    // Initialize deployment manager
    const deploymentManager = new DeploymentManager({
      ...config,
      monitoring: {
        ...config.monitoring,
        alerts: monitoringAlerts
      }
    });
    
    // Subscribe to deployment events
    deploymentManager.on('initialized', () => {
      console.log('✅ System initialized successfully');
    });
    
    deploymentManager.on('health', (health) => {
      console.log(`💓 Health status: ${health.overall}`);
    });
    
    deploymentManager.on('alert', (alert) => {
      console.log(`🚨 Alert: ${alert.message}`);
    });
    
    deploymentManager.on('metrics', async (metrics) => {
      // Check metrics against alert rules
      await monitoringAlerts.checkMetrics(metrics);
    });
    
    deploymentManager.on('fatal', async () => {
      console.error('☠️ Fatal error occurred - system shutting down');
      process.exit(1);
    });
    
    // Handle process termination
    const shutdown = async () => {
      console.log('🛑 Shutting down integration system...');
      await deploymentManager.gracefulShutdown();
      monitoringAlerts.shutdown();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Log startup information
    console.log('');
    console.log('='.repeat(60));
    console.log('🎯 Stealth Collection Integration System');
    console.log(`📍 Environment: ${environment}`);
    console.log(`🔧 Workers: ${config.clustering?.workers || 'single process'}`);
    console.log(`📊 Monitoring: ${config.features?.monitoring ? 'enabled' : 'disabled'}`);
    console.log(`🚨 Alerting: ${config.features?.alerting ? 'enabled' : 'disabled'}`);
    console.log(`⚡ Auto-scaling: ${config.features?.autoScaling ? 'enabled' : 'disabled'}`);
    console.log('='.repeat(60));
    console.log('');
    
    // System is now running
    console.log('✨ System is ready and running');
    
  } catch (error) {
    console.error('💥 Failed to start system:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };