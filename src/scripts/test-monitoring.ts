// Test script for the monitoring system
import { MonitoringSystem } from '@/lib/monitoring/monitoring-system'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function testMonitoring() {
  console.log('🧪 Testing Flippa Monitoring System...')
  console.log('=' .repeat(50))
  
  const monitoring = new MonitoringSystem()
  
  try {
    // Initialize the system
    console.log('\n1. Initializing monitoring system...')
    await monitoring.initialize()
    console.log('✅ System initialized')
    
    // Get current status
    console.log('\n2. Getting system status...')
    const status = await monitoring.getStatus()
    console.log('Status:', {
      isRunning: status.isRunning,
      lastScan: status.lastScan?.completed_at || 'Never',
      config: status.config
    })
    
    // Run a manual scan
    console.log('\n3. Running manual scan...')
    console.log('This will:')
    console.log('   - Scan first 5 pages of Flippa')
    console.log('   - Compare with baseline (5,645 listings)')
    console.log('   - Identify new/deleted/updated listings')
    console.log('   - Process new discoveries')
    console.log('   - Send notifications for high-value finds')
    console.log('')
    
    const result = await monitoring.runScan({ manual: true })
    
    if (result.success) {
      console.log('\n✅ Scan completed successfully!')
      console.log('Results:', JSON.stringify(result.results, null, 2))
    } else {
      console.log('\n❌ Scan failed:', result.results.error)
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
  } finally {
    // Stop the monitoring system
    monitoring.stop()
    console.log('\n🛑 Monitoring system stopped')
  }
}

// Run the test
testMonitoring().catch(console.error)