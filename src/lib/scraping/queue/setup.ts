// Bull queue setup for scraping jobs

import Bull from 'bull'
import { SCRAPING_CONFIG } from '../config'
import { logger } from '../utils/logger'
import type { QueueJobData } from '../flippa/types'

// Create queue instance
export const scrapingQueue = new Bull<QueueJobData>('flippa-scraping', {
  redis: SCRAPING_CONFIG.queue.redis,
  defaultJobOptions: SCRAPING_CONFIG.queue.defaultJobOptions
})

// Queue event handlers
scrapingQueue.on('error', (error) => {
  logger.error('Queue error', error)
})

scrapingQueue.on('waiting', (jobId) => {
  logger.debug(`Job ${jobId} is waiting`)
})

scrapingQueue.on('active', (job) => {
  logger.info(`Job ${job.id} has started`, {
    jobType: job.data.jobType,
    jobId: job.data.jobId
  })
})

scrapingQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed`, {
    jobType: job.data.jobType,
    jobId: job.data.jobId,
    result
  })
})

scrapingQueue.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed`, {
    jobType: job?.data.jobType,
    jobId: job?.data.jobId,
    error: err.message,
    stack: err.stack
  })
})

scrapingQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled and will be retried`, {
    jobType: job.data.jobType,
    jobId: job.data.jobId
  })
})

// Queue management functions
export const queueManager = {
  /**
   * Add a scraping job to the queue
   */
  async addJob(
    jobType: QueueJobData['jobType'],
    config: QueueJobData['config'],
    options?: Bull.JobOptions
  ): Promise<Bull.Job<QueueJobData>> {
    const jobData: QueueJobData = {
      jobId: `${jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobType,
      config,
      priority: config.priority || 'normal',
      attempts: 0
    }

    const jobOptions: Bull.JobOptions = {
      priority: this.getPriorityValue(jobData.priority),
      delay: config.delayMs,
      ...options
    }

    const job = await scrapingQueue.add(jobData, jobOptions)
    
    logger.info('Job added to queue', {
      jobId: job.id,
      jobType: jobData.jobType,
      priority: jobData.priority
    })

    return job
  },

  /**
   * Get job by ID
   */
  async getJob(jobId: Bull.JobId): Promise<Bull.Job<QueueJobData> | null> {
    return scrapingQueue.getJob(jobId)
  },

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused
    ] = await Promise.all([
      scrapingQueue.getWaitingCount(),
      scrapingQueue.getActiveCount(),
      scrapingQueue.getCompletedCount(),
      scrapingQueue.getFailedCount(),
      scrapingQueue.getDelayedCount(),
      scrapingQueue.getPausedCount()
    ])

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + completed + failed + delayed + paused
    }
  },

  /**
   * Clean old jobs
   */
  async cleanJobs(grace: number = 3600000) { // 1 hour default
    await scrapingQueue.clean(grace, 'completed')
    await scrapingQueue.clean(grace * 24, 'failed') // Keep failed jobs longer
  },

  /**
   * Pause/resume queue
   */
  async pause() {
    await scrapingQueue.pause()
    logger.info('Queue paused')
  },

  async resume() {
    await scrapingQueue.resume()
    logger.info('Queue resumed')
  },

  /**
   * Get jobs by status
   */
  async getJobs(status: Bull.JobStatus[], limit = 100): Promise<Bull.Job<QueueJobData>[]> {
    const jobs = await scrapingQueue.getJobs(status, 0, limit)
    return jobs
  },

  /**
   * Retry failed jobs
   */
  async retryFailedJobs() {
    const failedJobs = await scrapingQueue.getFailed()
    let retried = 0

    for (const job of failedJobs) {
      if (job.attemptsMade < (job.opts.attempts || 3)) {
        await job.retry()
        retried++
      }
    }

    logger.info(`Retried ${retried} failed jobs`)
    return retried
  },

  /**
   * Convert priority string to numeric value
   */
  getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'high': return 1
      case 'normal': return 5
      case 'low': return 10
      default: return 5
    }
  },

  /**
   * Schedule recurring jobs
   */
  async scheduleRecurringJobs() {
    // Daily category scan
    await scrapingQueue.add(
      {
        jobId: 'daily_category_scan',
        jobType: 'category_scan',
        config: {
          priority: 'high'
        }
      },
      {
        repeat: {
          cron: '0 2 * * *' // 2 AM daily
        },
        removeOnComplete: 10,
        removeOnFail: 10
      }
    )

    // Hourly statistics calculation
    await scrapingQueue.add(
      {
        jobId: 'hourly_statistics',
        jobType: 'statistics_calc',
        config: {
          priority: 'normal'
        }
      },
      {
        repeat: {
          cron: '0 * * * *' // Every hour
        },
        removeOnComplete: 5,
        removeOnFail: 5
      }
    )

    logger.info('Recurring jobs scheduled')
  }
}

// Helper to create job-specific queues if needed
export function createJobQueue(name: string): Bull.Queue<QueueJobData> {
  return new Bull<QueueJobData>(`flippa-${name}`, {
    redis: SCRAPING_CONFIG.queue.redis,
    defaultJobOptions: SCRAPING_CONFIG.queue.defaultJobOptions
  })
}