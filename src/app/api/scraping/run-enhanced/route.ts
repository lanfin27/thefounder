import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Store active scraping processes
const activeScrapingJobs = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      target = 95, // completeness target percentage
      priority = 'high'
    } = body
    
    // Check if scraping is already running
    if (activeScrapingJobs.size > 0) {
      return NextResponse.json({
        success: false,
        error: 'Scraping already in progress',
        activeJobs: activeScrapingJobs.size
      }, { status: 409 })
    }

    const jobId = `enhanced_${Date.now()}`
    console.log(`🚀 Starting enhanced scraping job: ${jobId}`)
    console.log(`🎯 Target: Complete marketplace coverage (5,904+ listings)`)
    console.log(`📊 Features: Profit/Revenue separation, Both multiples`)
    
    // Use enhanced scraper
    const scriptPath = path.join(process.cwd(), 'scripts', 'flippa-scraper-enhanced.js')
    const args: string[] = []
    
    args.push('--headless') // Always run headless in production
    args.push('--target', target.toString())
    
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
      scraper: 'enhanced',
      startTime: new Date().toISOString(),
      status: 'running',
      target: target,
      priority: priority,
      process: scrapingProcess,
      output: [],
      errors: [],
      metrics: null,
      marketplaceState: null,
      financialStats: {
        withProfit: 0,
        withRevenue: 0,
        withBothMultiples: 0
      }
    }
    
    activeScrapingJobs.set(jobId, jobInfo)
    
    // Handle process output
    scrapingProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log(`📊 Enhanced scraper output: ${output}`)
      jobInfo.output.push({
        timestamp: new Date().toISOString(),
        message: output.trim()
      })
      
      // Parse progress
      if (output.includes('Page') && output.includes('new')) {
        const pageMatch = output.match(/Page (\d+)\/(\d+)/)
        const listingsMatch = output.match(/(\d+) new/)
        if (pageMatch) {
          jobInfo.currentPage = parseInt(pageMatch[1])
          jobInfo.totalPages = parseInt(pageMatch[2])
        }
        if (listingsMatch) {
          jobInfo.listingsFound = (jobInfo.listingsFound || 0) + parseInt(listingsMatch[1])
        }
      }
      
      // Parse marketplace state
      if (output.includes('Total Listings:')) {
        const match = output.match(/Total Listings:\s*([\d,]+)/)
        if (match) {
          jobInfo.marketplaceState = {
            total: parseInt(match[1].replace(/,/g, '')),
            detected: true
          }
        }
      }
      
      // Parse financial stats
      if (output.includes('With profit:')) {
        const match = output.match(/With profit:\s*(\d+)/)
        if (match) {
          jobInfo.financialStats.withProfit = parseInt(match[1])
        }
      }
      
      if (output.includes('With revenue:')) {
        const match = output.match(/With revenue:\s*(\d+)/)
        if (match) {
          jobInfo.financialStats.withRevenue = parseInt(match[1])
        }
      }
      
      if (output.includes('With both multiples:')) {
        const match = output.match(/With both multiples:\s*(\d+)/)
        if (match) {
          jobInfo.financialStats.withBothMultiples = parseInt(match[1])
        }
      }
      
      // Parse coverage
      if (output.includes('Coverage:')) {
        const match = output.match(/Coverage:\s*([\d.]+)%/)
        if (match) {
          jobInfo.coverage = parseFloat(match[1])
        }
      }
    })
    
    scrapingProcess.stderr?.on('data', (data) => {
      const error = data.toString()
      console.error(`❌ Enhanced scraper error: ${error}`)
      jobInfo.errors.push({
        timestamp: new Date().toISOString(),
        error: error.trim()
      })
    })
    
    scrapingProcess.on('close', (code) => {
      console.log(`🏁 Enhanced scraping job ${jobId} completed with code: ${code}`)
      jobInfo.status = code === 0 ? 'completed' : 'failed'
      jobInfo.endTime = new Date().toISOString()
      jobInfo.exitCode = code
      
      // Parse final metrics
      const finalOutput = jobInfo.output.join('\n')
      
      // Enhanced metrics parsing
      const totalMatch = finalOutput.match(/Total unique listings:\s*(\d+)/)
      const coverageMatch = finalOutput.match(/Coverage:\s*([\d.]+)%/)
      const profitMatch = finalOutput.match(/With profit data:\s*(\d+)/)
      const revenueMatch = finalOutput.match(/With revenue data:\s*(\d+)/)
      
      jobInfo.metrics = {
        totalListings: totalMatch ? parseInt(totalMatch[1]) : 0,
        coverage: coverageMatch ? parseFloat(coverageMatch[1]) : 0,
        withProfit: profitMatch ? parseInt(profitMatch[1]) : jobInfo.financialStats.withProfit,
        withRevenue: revenueMatch ? parseInt(revenueMatch[1]) : jobInfo.financialStats.withRevenue,
        withBothMultiples: jobInfo.financialStats.withBothMultiples,
        successRate: jobInfo.coverage || 0
      }
      
      // Keep job info for 10 minutes for status checks
      setTimeout(() => {
        activeScrapingJobs.delete(jobId)
      }, 10 * 60 * 1000)
    })
    
    // Return job started response
    return NextResponse.json({
      success: true,
      message: 'Enhanced scraping job started successfully',
      jobId: jobId,
      scraper: 'enhanced',
      expectedCoverage: '100% marketplace (5,904+ listings)',
      estimatedDuration: '25-30 minutes',
      features: [
        'Complete marketplace coverage',
        'Profit/Revenue separation',
        'Both multiple types extraction',
        'Enhanced quality scoring'
      ],
      configuration: {
        target,
        priority
      }
    })

  } catch (error: any) {
    console.error('❌ Failed to start enhanced scraping:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start enhanced scraping job',
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
          target: job.target,
          currentPage: job.currentPage || 0,
          totalPages: job.totalPages || 0,
          listingsFound: job.listingsFound || 0,
          coverage: job.coverage || 0,
          marketplaceState: job.marketplaceState,
          financialStats: job.financialStats,
          recentOutput: job.output.slice(-5),
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
        currentPage: job.currentPage || 0,
        totalPages: job.totalPages || 0,
        listingsFound: job.listingsFound || 0,
        coverage: job.coverage || 0,
        financialStats: job.financialStats
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