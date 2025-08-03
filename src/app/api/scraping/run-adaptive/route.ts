import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Store active scraping processes
const activeScrapingJobs = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      scraper = 'adaptive', // 'standard' or 'adaptive'
      pages = null, // null for adaptive mode
      mode = 'comprehensive', 
      priority = 'normal',
      target = 95 // completeness target percentage
    } = body
    
    // Check if scraping is already running
    if (activeScrapingJobs.size > 0) {
      return NextResponse.json({
        success: false,
        error: 'Scraping already in progress',
        activeJobs: activeScrapingJobs.size
      }, { status: 409 })
    }

    const jobId = `scrape_${Date.now()}`
    console.log(`🚀 Starting ${scraper} scraping job: ${jobId}`)
    
    // Select appropriate scraper
    let scriptPath: string
    let args: string[] = []
    
    if (scraper === 'adaptive') {
      scriptPath = path.join(process.cwd(), 'scripts', 'flippa-scraper-adaptive.js')
      
      if (pages) {
        args.push('--pages', pages.toString())
      } else {
        args.push('--adaptive')
      }
      
      if (target) {
        args.push('--target', target.toString())
      }
    } else {
      scriptPath = path.join(process.cwd(), 'scripts', 'flippa-scraper-final.js')
      args.push('--pages', (pages || 10).toString())
      
      if (mode === 'comprehensive') {
        args.push('--comprehensive')
      }
    }
    
    args.push('--headless') // Always run headless in production
    
    console.log(`📋 Executing: node ${scriptPath} ${args.join(' ')}`)
    
    // Start scraping process
    const scrapingProcess = spawn('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    })
    
    // Store job info
    const jobInfo = {
      id: jobId,
      scraper: scraper,
      startTime: new Date().toISOString(),
      status: 'running',
      pages: pages,
      mode: mode,
      target: target,
      process: scrapingProcess,
      output: [],
      errors: [],
      metrics: null,
      marketplaceState: null
    }
    
    activeScrapingJobs.set(jobId, jobInfo)
    
    // Handle process output
    scrapingProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log(`📊 Scraper output: ${output}`)
      jobInfo.output.push({
        timestamp: new Date().toISOString(),
        message: output.trim()
      })
      
      // Parse progress from output
      if (output.includes('Page') && output.includes('listings')) {
        const match = output.match(/Page (\d+).*?(\d+) listings/)
        if (match) {
          jobInfo.currentPage = parseInt(match[1])
          jobInfo.listingsFound = (jobInfo.listingsFound || 0) + parseInt(match[2])
        }
      }
      
      // Parse marketplace state for adaptive scraper
      if (output.includes('Marketplace state:')) {
        const match = output.match(/Marketplace state: (\d+) listings.*?([\d.]+)% confidence/)
        if (match) {
          jobInfo.marketplaceState = {
            total: parseInt(match[1]),
            confidence: parseFloat(match[2])
          }
        }
      }
      
      // Parse completeness
      if (output.includes('Completeness:')) {
        const match = output.match(/Completeness: ([\d.]+)%/)
        if (match) {
          jobInfo.completeness = parseFloat(match[1])
        }
      }
    })
    
    scrapingProcess.stderr?.on('data', (data) => {
      const error = data.toString()
      console.error(`❌ Scraper error: ${error}`)
      jobInfo.errors.push({
        timestamp: new Date().toISOString(),
        error: error.trim()
      })
    })
    
    scrapingProcess.on('close', (code) => {
      console.log(`🏁 Scraping job ${jobId} completed with code: ${code}`)
      jobInfo.status = code === 0 ? 'completed' : 'failed'
      jobInfo.endTime = new Date().toISOString()
      jobInfo.exitCode = code
      
      // Parse final metrics from output
      const finalOutput = jobInfo.output.join('\n')
      
      if (scraper === 'adaptive') {
        // Parse adaptive scraper metrics
        const totalMatch = finalOutput.match(/Total unique listings: (\d+)/)
        const completenessMatch = finalOutput.match(/Completeness: ([\d.]+)%/)
        const pagesMatch = finalOutput.match(/Pages processed: (\d+)/)
        
        jobInfo.metrics = {
          totalListings: totalMatch ? parseInt(totalMatch[1]) : 0,
          completeness: completenessMatch ? parseFloat(completenessMatch[1]) : 0,
          pagesProcessed: pagesMatch ? parseInt(pagesMatch[1]) : 0,
          successRate: jobInfo.completeness || 0
        }
      } else {
        // Parse standard scraper metrics
        const metricsMatch = finalOutput.match(/Total listings loaded: (\d+)/)
        if (metricsMatch) {
          jobInfo.metrics = {
            totalListings: parseInt(metricsMatch[1]),
            successRate: finalOutput.includes('Success rate:') ? 
              parseFloat(finalOutput.match(/Success rate: ([\d.]+)%/)?.[1] || '0') : 0
          }
        }
      }
      
      // Keep job info for 5 minutes for status checks
      setTimeout(() => {
        activeScrapingJobs.delete(jobId)
      }, 5 * 60 * 1000)
    })
    
    // Return job started response
    return NextResponse.json({
      success: true,
      message: `${scraper} scraping job started successfully`,
      jobId: jobId,
      scraper: scraper,
      estimatedDuration: pages ? `${pages * 5} seconds` : 'Dynamic (based on marketplace)',
      expectedListings: pages ? pages * 25 : 'All available listings',
      configuration: {
        scraper,
        pages,
        mode,
        priority,
        target: scraper === 'adaptive' ? target : undefined
      }
    })

  } catch (error: any) {
    console.error('❌ Failed to start scraping:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start scraping job',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    if (jobId) {
      // Get specific job status
      const job = activeScrapingJobs.get(jobId)
      if (!job) {
        return NextResponse.json({
          success: false,
          error: 'Job not found or completed'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          scraper: job.scraper,
          status: job.status,
          startTime: job.startTime,
          endTime: job.endTime,
          pages: job.pages,
          mode: job.mode,
          target: job.target,
          currentPage: job.currentPage || 0,
          listingsFound: job.listingsFound || 0,
          completeness: job.completeness,
          marketplaceState: job.marketplaceState,
          recentOutput: job.output.slice(-5), // Last 5 output messages
          errors: job.errors,
          exitCode: job.exitCode,
          metrics: job.metrics
        }
      })
    } else {
      // Get all active jobs
      const jobs = Array.from(activeScrapingJobs.values()).map(job => ({
        id: job.id,
        scraper: job.scraper,
        status: job.status,
        startTime: job.startTime,
        pages: job.pages,
        mode: job.mode,
        currentPage: job.currentPage || 0,
        listingsFound: job.listingsFound || 0,
        completeness: job.completeness
      }))
      
      return NextResponse.json({
        success: true,
        activeJobs: jobs.length,
        jobs: jobs
      })
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get job status'
    }, { status: 500 })
  }
}