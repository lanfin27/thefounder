// Job scheduler for scraping tasks

import { scrapingQueue, queueManager } from './setup'
import { scrapingProcessor } from './processors'
import { logger } from '../utils/logger'
import { SCRAPING_CONFIG } from '../config'

// Start the queue processor
export async function startQueueProcessor() {
  const concurrency = SCRAPING_CONFIG.rateLimit.maxConcurrent

  // Process jobs
  scrapingQueue.process(concurrency, scrapingProcessor)

  // Schedule recurring jobs
  await queueManager.scheduleRecurringJobs()

  // Clean old jobs every hour
  setInterval(async () => {
    try {
      await queueManager.cleanJobs()
    } catch (error) {
      logger.error('Failed to clean jobs', error)
    }
  }, 3600000) // 1 hour

  logger.info('Queue processor started', { concurrency })
}

// Stop the queue processor
export async function stopQueueProcessor() {
  await scrapingQueue.close()
  logger.info('Queue processor stopped')
}

// Add initial jobs
export async function seedInitialJobs() {
  try {
    // Add initial category scan
    await queueManager.addJob('category_scan', {
      priority: 'high'
    })

    logger.info('Initial jobs seeded')
  } catch (error) {
    logger.error('Failed to seed initial jobs', error)
  }
}

// Monitor queue health
export async function monitorQueueHealth() {
  try {
    const stats = await queueManager.getQueueStats()
    
    // Log queue statistics
    logger.info('Queue statistics', stats)
    
    // Check for stuck jobs
    if (stats.active > 0 && stats.waiting === 0) {
      const activeJobs = await queueManager.getJobs(['active'])
      const now = Date.now()
      
      for (const job of activeJobs) {
        const runtime = now - job.timestamp
        if (runtime > 600000) { // 10 minutes
          logger.warn('Long-running job detected', {
            jobId: job.id,
            runtime: runtime / 1000 / 60, // minutes
            data: job.data
          })
        }
      }
    }
    
    // Retry failed jobs if any
    if (stats.failed > 0) {
      const retried = await queueManager.retryFailedJobs()
      if (retried > 0) {
        logger.info(`Retried ${retried} failed jobs`)
      }
    }
    
    return stats
  } catch (error) {
    logger.error('Failed to monitor queue health', error)
    throw error
  }
}

// Schedule health monitoring
export function scheduleHealthMonitoring() {
  // Monitor every 5 minutes
  setInterval(async () => {
    try {
      await monitorQueueHealth()
    } catch (error) {
      logger.error('Health monitoring failed', error)
    }
  }, 300000) // 5 minutes
}