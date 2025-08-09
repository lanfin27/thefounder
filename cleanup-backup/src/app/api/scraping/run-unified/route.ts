import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Store active unified jobs
const activeJobs = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      fast = false // Optional fast mode
    } = body
    
    // Check if already running
    if (activeJobs.size > 0) {
      return NextResponse.json({
        success: false,
        error: 'Collection already in progress',
        activeJobs: activeJobs.size
      }, { status: 409 })
    }

    const jobId = `unified_${Date.now()}`
    console.log(`🚀 Starting unified collection job: ${jobId}`)
    
    const scriptPath = path.join(process.cwd(), 'scripts', 'unified-marketplace-scraper.js')
    const args: string[] = []
    
    if (fast) {
      args.push('--fast')
    }
    
    console.log(`📋 Executing: node ${scriptPath} ${args.join(' ')}`)
    
    // Start process
    const collectionProcess = spawn('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    })
    
    // Store job info
    const jobInfo = {
      id: jobId,
      startTime: new Date().toISOString(),
      status: 'running',
      process: collectionProcess,
      output: [],
      errors: [],
      currentPage: 0,
      listingsFound: 0,
      marketplaceSize: null,
      completeness: 0,
      detectionHistory: []
    }
    
    activeJobs.set(jobId, jobInfo)
    
    // Handle output
    collectionProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log(`📊 Unified output: ${output}`)
      
      jobInfo.output.push({
        timestamp: new Date().toISOString(),
        message: output.trim()
      })
      
      // Parse progress from output
      if (output.includes('Processing page')) {
        const match = output.match(/Processing page (\d+)/)
        if (match) {
          jobInfo.currentPage = parseInt(match[1])
        }
      }
      
      if (output.includes('Total:')) {
        const match = output.match(/Total:\s*(\d+)/)
        if (match) {
          jobInfo.listingsFound = parseInt(match[1])
        }
      }
      
      if (output.includes('Marketplace Size:')) {
        const match = output.match(/Marketplace Size:\s*(\d+)/)
        if (match) {
          jobInfo.marketplaceSize = parseInt(match[1])
        }
      }
      
      if (output.includes('Completeness:')) {
        const match = output.match(/Completeness:\s*([\d.]+)%/)
        if (match) {
          jobInfo.completeness = parseFloat(match[1])
        }
      }
      
      if (output.includes('Detected marketplace size:')) {
        const sizeMatch = output.match(/Detected marketplace size:\s*(\d+)/)
        if (sizeMatch) {
          jobInfo.detectionHistory.push({
            timestamp: new Date().toISOString(),
            size: parseInt(sizeMatch[1]),
            page: jobInfo.currentPage
          })
        }
      }
    })
    
    collectionProcess.stderr?.on('data', (data) => {
      const error = data.toString()
      console.error(`❌ Unified error: ${error}`)
      jobInfo.errors.push({
        timestamp: new Date().toISOString(),
        error: error.trim()
      })
    })
    
    collectionProcess.on('close', (code) => {
      console.log(`🏁 Unified job ${jobId} completed with code: ${code}`)
      jobInfo.status = code === 0 ? 'completed' : 'failed'
      jobInfo.endTime = new Date().toISOString()
      jobInfo.exitCode = code
      
      // Parse final metrics
      const output = jobInfo.output.join('\n')
      const totalMatch = output.match(/Total Listings Collected:\s*(\d+)/)
      const marketMatch = output.match(/Detected Marketplace Size:\s*(\d+)/)
      const compMatch = output.match(/Completeness:\s*([\d.]+)%/)
      const pagesMatch = output.match(/Pages Processed:\s*(\d+)/)
      
      jobInfo.metrics = {
        totalListings: totalMatch ? parseInt(totalMatch[1]) : jobInfo.listingsFound,
        marketplaceSize: marketMatch ? parseInt(marketMatch[1]) : jobInfo.marketplaceSize,
        completeness: compMatch ? parseFloat(compMatch[1]) : jobInfo.completeness,
        pagesProcessed: pagesMatch ? parseInt(pagesMatch[1]) : jobInfo.currentPage,
        duration: jobInfo.endTime ? 
          (new Date(jobInfo.endTime).getTime() - new Date(jobInfo.startTime).getTime()) / 1000 : 0
      }
      
      // Keep job info for 10 minutes
      setTimeout(() => {
        activeJobs.delete(jobId)
      }, 10 * 60 * 1000)
    })
    
    // Return response
    return NextResponse.json({
      success: true,
      message: 'Unified intelligent collection started',
      jobId: jobId,
      mode: 'unified',
      features: [
        'Dynamic marketplace detection',
        'No fixed limits',
        'Adaptive completeness targeting',
        'Intelligent progress monitoring'
      ],
      expectedDuration: '20-40 minutes (depends on marketplace size)'
    })

  } catch (error: any) {
    console.error('❌ Failed to start unified collection:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start unified collection job',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    if (jobId) {
      // Get specific job
      const job = activeJobs.get(jobId)
      if (!job) {
        return NextResponse.json({
          success: false,
          error: 'Job not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          startTime: job.startTime,
          endTime: job.endTime,
          currentPage: job.currentPage,
          listingsFound: job.listingsFound,
          marketplaceSize: job.marketplaceSize,
          completeness: job.completeness,
          detectionHistory: job.detectionHistory.slice(-5), // Last 5 detections
          recentOutput: job.output.slice(-10), // Last 10 outputs
          errors: job.errors,
          metrics: job.metrics
        }
      })
    } else {
      // Get all jobs
      const jobs = Array.from(activeJobs.values()).map(job => ({
        id: job.id,
        status: job.status,
        startTime: job.startTime,
        listingsFound: job.listingsFound,
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