// Centralized logging for scraping system

import winston from 'winston'

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
}

winston.addColors(logColors)

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'flippa-scraper' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          return `${timestamp} [${level}]: ${message} ${metaStr}`
        })
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/scraping-errors.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/scraping-combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
})

// Add structured logging methods
export const scrapingLogger = {
  jobStarted: (jobType: string, jobId: string, config?: any) => {
    logger.info('Scraping job started', {
      jobType,
      jobId,
      config,
      event: 'job_started'
    })
  },

  jobCompleted: (jobType: string, jobId: string, results: any) => {
    logger.info('Scraping job completed', {
      jobType,
      jobId,
      results,
      event: 'job_completed'
    })
  },

  jobFailed: (jobType: string, jobId: string, error: any) => {
    logger.error('Scraping job failed', {
      jobType,
      jobId,
      error: error.message || error,
      stack: error.stack,
      event: 'job_failed'
    })
  },

  listingScraped: (listingId: string, category: string, price: number) => {
    logger.debug('Listing scraped', {
      listingId,
      category,
      price,
      event: 'listing_scraped'
    })
  },

  categoryScanned: (category: string, listingCount: number) => {
    logger.info('Category scanned', {
      category,
      listingCount,
      event: 'category_scanned'
    })
  },

  rateLimitHit: (url: string, retryAfter?: number) => {
    logger.warn('Rate limit hit', {
      url,
      retryAfter,
      event: 'rate_limit'
    })
  },

  proxyError: (proxy: string, error: any) => {
    logger.error('Proxy error', {
      proxy,
      error: error.message || error,
      event: 'proxy_error'
    })
  },

  dataQualityIssue: (listingId: string, issues: string[]) => {
    logger.warn('Data quality issues detected', {
      listingId,
      issues,
      event: 'data_quality'
    })
  },

  statisticsCalculated: (industry: string, date: string, stats: any) => {
    logger.info('Statistics calculated', {
      industry,
      date,
      stats,
      event: 'statistics_calculated'
    })
  }
}

// Performance monitoring
export class PerformanceTracker {
  private startTime: number
  private checkpoints: Map<string, number>

  constructor() {
    this.startTime = Date.now()
    this.checkpoints = new Map()
  }

  checkpoint(name: string) {
    this.checkpoints.set(name, Date.now() - this.startTime)
  }

  finish() {
    const totalTime = Date.now() - this.startTime
    const checkpointData = Object.fromEntries(this.checkpoints)
    
    logger.info('Performance metrics', {
      totalTime,
      checkpoints: checkpointData,
      event: 'performance'
    })
    
    return { totalTime, checkpoints: checkpointData }
  }
}

export default logger