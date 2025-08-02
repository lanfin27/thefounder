import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Store active scraping processes
const activeScrapingJobs = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pages = 10, mode = 'comprehensive', priority = 'normal' } = body
    
    // Check if scraping is already running
    if (activeScrapingJobs.size > 0) {
      return NextResponse.json({
        success: false,
        error: 'Scraping already in progress',
        activeJobs: activeScrapingJobs.size
      }, { status: 409 })
    }

    const jobId = `scrape_${Date.now()}`
    console.log(`🚀 Starting scraping job: ${jobId}`)
    
    // Construct scraper command
    const scriptPath = path.join(process.cwd(), 'scripts', 'flippa-scraper-final.js')
    const args = ['--pages', pages.toString()]
    
    if (mode === 'comprehensive') {
      args.push('--comprehensive')
    }
    
    if (mode === 'recently_sold') {
      args.push('--filter=recently_sold')
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
      startTime: new Date().toISOString(),
      status: 'running',
      pages: pages,
      mode: mode,
      process: scrapingProcess,
      output: [],
      errors: [],
      metrics: null
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
      const metricsMatch = finalOutput.match(/Total listings loaded: (\d+)/)
      if (metricsMatch) {
        jobInfo.metrics = {
          totalListings: parseInt(metricsMatch[1]),
          successRate: finalOutput.includes('Success rate:') ? 
            parseFloat(finalOutput.match(/Success rate: ([\d.]+)%/)?.[1] || '0') : 0
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
      message: 'Scraping job started successfully',
      jobId: jobId,
      estimatedDuration: `${pages * 5} seconds`,
      expectedListings: pages * 25,
      configuration: {
        pages,
        mode,
        priority
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
          status: job.status,
          startTime: job.startTime,
          endTime: job.endTime,
          pages: job.pages,
          mode: job.mode,
          currentPage: job.currentPage || 0,
          listingsFound: job.listingsFound || 0,
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
        status: job.status,
        startTime: job.startTime,
        pages: job.pages,
        mode: job.mode,
        currentPage: job.currentPage || 0,
        listingsFound: job.listingsFound || 0
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