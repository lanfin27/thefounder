// Automated monitoring system with scheduling and notifications
import { FlippaScannerAxios } from './flippa-scanner-axios'
import { BaselineComparison } from './baseline-comparison'
import { ListingProcessor } from './listing-processor'
import { NotificationService } from './notification-service'
import { createServerClient } from '@/lib/supabase'
import { generateId } from '@/lib/utils'
import * as cron from 'node-cron'

interface MonitoringConfig {
  schedule: string // cron expression
  pages: number
  delayMin: number
  delayMax: number
  notificationThresholds: {
    price: number
    revenue: number
    priceDropPercent: number
  }
  categoriesOfInterest: string[]
}

export class MonitoringSystem {
  private scanner: FlippaScannerAxios
  private processor: ListingProcessor
  private notifier: NotificationService
  private supabase: ReturnType<typeof createServerClient>
  private cronJob: cron.ScheduledTask | null = null
  private isRunning: boolean = false
  
  constructor() {
    this.scanner = new FlippaScannerAxios()
    this.processor = new ListingProcessor()
    this.notifier = new NotificationService()
    this.supabase = createServerClient()
  }

  // Initialize monitoring with configuration
  async initialize(): Promise<void> {
    console.log('🚀 Initializing monitoring system...')
    
    // Load configuration from database
    const config = await this.loadConfiguration()
    
    // Set up scheduled monitoring
    if (config.schedule) {
      this.scheduleMonitoring(config.schedule)
    }
    
    console.log('✅ Monitoring system initialized')
  }

  // Run a monitoring scan
  async runScan(options: { manual?: boolean } = {}): Promise<{
    success: boolean
    scanId: string
    results: any
  }> {
    if (this.isRunning) {
      console.log('⚠️  Scan already in progress')
      return { success: false, scanId: '', results: { error: 'Scan already in progress' } }
    }

    this.isRunning = true
    const scanId = generateId('scan')
    
    try {
      console.log('🔍 Starting monitoring scan...')
      const startTime = Date.now()
      
      // Load configuration
      const config = await this.loadConfiguration()
      
      // 1. Scan current listings
      const scanResult = await this.scanner.scan({
        pages: config.pages,
        delayMin: config.delayMin,
        delayMax: config.delayMax,
        scanId
      })
      
      if (!scanResult.success && scanResult.errors.length > 0) {
        throw new Error('Scan failed with errors')
      }
      
      // 2. Compare with baseline
      const comparisonMap = await this.scanner.extractComparisonData(scanResult.listings)
      const comparison = new BaselineComparison(scanId)
      const comparisonResult = await comparison.compare(comparisonMap)
      
      // 3. Process new listings
      let processedCount = 0
      if (comparisonResult.newListings.length > 0) {
        const processingResult = await this.processor.processNewListings(
          comparisonResult.newListings,
          scanId
        )
        processedCount = processingResult.processed
      }
      
      // 4. Check for high-value discoveries
      const discoveries = await comparison.getHighValueDiscoveries(comparisonResult)
      
      // 5. Send notifications
      await this.sendNotifications({
        scanId,
        comparisonResult,
        discoveries,
        config
      })
      
      // Calculate duration
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      const results = {
        scanId,
        duration,
        pagesScanned: config.pages,
        totalListings: scanResult.listings.length,
        newListings: comparisonResult.newListings.length,
        deletedListings: comparisonResult.deletedListings.length,
        updatedListings: comparisonResult.updatedListings.length,
        priceDrops: comparisonResult.priceDrops.length,
        processedNewListings: processedCount,
        highValueDiscoveries: {
          highPrice: discoveries.highPriceListings.length,
          highRevenue: discoveries.highRevenueListings.length,
          trendingCategories: discoveries.trendingCategories.length
        }
      }
      
      console.log('✅ Monitoring scan completed:', results)
      
      return { success: true, scanId, results }
      
    } catch (error) {
      console.error('❌ Monitoring scan failed:', error)
      
      // Update scan session with error
      await this.supabase
        .from('scan_sessions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: [{ message: error.message, timestamp: new Date().toISOString() }]
        })
        .eq('scan_id', scanId)
      
      return { success: false, scanId, results: { error: error.message } }
      
    } finally {
      this.isRunning = false
    }
  }

  // Schedule automated monitoring
  private scheduleMonitoring(schedule: string): void {
    // Stop existing job if any
    if (this.cronJob) {
      this.cronJob.stop()
    }
    
    // Create new cron job
    this.cronJob = cron.schedule(schedule, async () => {
      console.log('⏰ Running scheduled monitoring scan...')
      await this.runScan()
    })
    
    console.log(`📅 Monitoring scheduled: ${schedule}`)
  }

  // Load configuration from database
  private async loadConfiguration(): Promise<MonitoringConfig> {
    const { data: configs } = await this.supabase
      .from('monitoring_config')
      .select('*')
    
    const configMap = new Map(configs?.map(c => [c.config_key, c.config_value]) || [])
    
    const schedule = configMap.get('scan_schedule') || { interval: 'hourly', enabled: true, pages: 5 }
    const thresholds = configMap.get('notification_thresholds') || { price: 100000, revenue: 10000, priceDropPercent: 20 }
    const categories = configMap.get('categories_of_interest') || ['SaaS', 'E-commerce']
    const delays = configMap.get('scan_delays') || { min: 60, max: 120 }
    
    // Convert interval to cron expression
    const cronSchedule = this.intervalToCron(schedule.interval)
    
    return {
      schedule: schedule.enabled ? cronSchedule : '',
      pages: schedule.pages || 5,
      delayMin: delays.min || 60,
      delayMax: delays.max || 120,
      notificationThresholds: thresholds,
      categoriesOfInterest: categories
    }
  }

  // Convert interval to cron expression
  private intervalToCron(interval: string): string {
    const cronMap: Record<string, string> = {
      'hourly': '0 * * * *',        // Every hour
      'daily': '0 9 * * *',          // Daily at 9 AM
      'twice-daily': '0 9,21 * * *', // 9 AM and 9 PM
      'weekly': '0 9 * * 1',         // Weekly on Monday at 9 AM
      'custom': '*/30 * * * *'       // Every 30 minutes (for testing)
    }
    
    return cronMap[interval] || cronMap['hourly']
  }

  // Send notifications for discoveries
  private async sendNotifications(params: {
    scanId: string
    comparisonResult: any
    discoveries: any
    config: MonitoringConfig
  }): Promise<void> {
    const { scanId, comparisonResult, discoveries, config } = params
    const notifications: any[] = []
    
    // High-value new listings
    if (discoveries.highPriceListings.length > 0) {
      for (const listingId of discoveries.highPriceListings) {
        const listing = await this.processor.getListingById(listingId)
        if (listing) {
          notifications.push({
            type: 'high_value_listing',
            priority: 'high',
            listing,
            reason: `Price: $${listing.asking_price.toLocaleString()}`
          })
        }
      }
    }
    
    // High revenue listings
    if (discoveries.highRevenueListings.length > 0) {
      for (const listingId of discoveries.highRevenueListings) {
        const listing = await this.processor.getListingById(listingId)
        if (listing) {
          notifications.push({
            type: 'high_revenue_listing',
            priority: 'high',
            listing,
            reason: `Monthly Revenue: $${listing.monthly_revenue.toLocaleString()}`
          })
        }
      }
    }
    
    // Significant price drops
    for (const drop of comparisonResult.priceDrops) {
      if (drop.dropPercentage >= config.notificationThresholds.priceDropPercent) {
        notifications.push({
          type: 'price_drop',
          priority: 'high',
          listingId: drop.listing_id,
          title: drop.title,
          oldPrice: drop.oldPrice,
          newPrice: drop.newPrice,
          dropPercentage: drop.dropPercentage
        })
      }
    }
    
    // Trending categories
    if (discoveries.trendingCategories.length > 0) {
      notifications.push({
        type: 'trending_categories',
        priority: 'normal',
        categories: discoveries.trendingCategories,
        newListingsCount: comparisonResult.newListings.length
      })
    }
    
    // Send notifications
    if (notifications.length > 0) {
      await this.notifier.sendBatch(notifications, scanId)
    }
  }

  // Stop monitoring
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
    }
    console.log('🛑 Monitoring stopped')
  }

  // Get monitoring status
  async getStatus(): Promise<{
    isRunning: boolean
    lastScan: any
    nextScan: Date | null
    config: MonitoringConfig
  }> {
    // Get last scan
    const { data: lastScan } = await this.supabase
      .from('scan_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
    
    // Get config
    const config = await this.loadConfiguration()
    
    // Calculate next scan time
    let nextScan: Date | null = null
    if (this.cronJob && config.schedule) {
      // This is a simplified calculation
      const now = new Date()
      if (config.schedule.includes('* * * *')) {
        // Hourly
        nextScan = new Date(now.getTime() + 60 * 60 * 1000)
      } else if (config.schedule.includes('9 * * *')) {
        // Daily at 9 AM
        nextScan = new Date(now)
        nextScan.setHours(9, 0, 0, 0)
        if (nextScan <= now) {
          nextScan.setDate(nextScan.getDate() + 1)
        }
      }
    }
    
    return {
      isRunning: this.isRunning,
      lastScan,
      nextScan,
      config
    }
  }
}