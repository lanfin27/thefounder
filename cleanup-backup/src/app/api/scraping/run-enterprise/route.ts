import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Store active enterprise jobs
const activeJobs = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      mode = 'professional', // 'professional' or 'enterprise'
      target = 5000
    } = body
    
    // Check if already running
    if (activeJobs.size > 0) {
      return NextResponse.json({
        success: false,
        error: 'Collection already in progress',
        activeJobs: activeJobs.size
      }, { status: 409 })
    }

    const jobId = `${mode}_${Date.now()}`
    console.log(`🚀 Starting ${mode} collection job: ${jobId}`)
    
    // Select appropriate script
    const scriptName = mode === 'enterprise' 
      ? 'enterprise-flippa-collector.js'
      : 'professional-flippa-scraper.js'
    
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName)
    const args: string[] = []
    
    if (mode === 'professional') {
      args.push('--target', target.toString())
      if (target >= 1000) {
        args.push('--fast') // Use faster delays for larger collections
      }
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
      mode: mode,
      startTime: new Date().toISOString(),
      status: 'running',
      target: target,
      process: collectionProcess,
      output: [],
      errors: [],
      metrics: null
    }
    
    activeJobs.set(jobId, jobInfo)
    
    // Handle output
    collectionProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log(`📊 ${mode} output: ${output}`)
      
      jobInfo.output.push({
        timestamp: new Date().toISOString(),
        message: output.trim()
      })
      
      // Parse metrics from output
      if (output.includes('Total Listings:')) {
        const match = output.match(/Total Listings:\s*(\d+)/)
        if (match) {
          jobInfo.totalListings = parseInt(match[1])
        }
      }
      
      if (output.includes('Rate:')) {
        const match = output.match(/Rate:\s*(\d+)\s*listings\/min/)
        if (match) {
          jobInfo.collectionRate = parseInt(match[1])
        }
      }
    })
    
    collectionProcess.stderr?.on('data', (data) => {
      const error = data.toString()
      console.error(`❌ ${mode} error: ${error}`)
      jobInfo.errors.push({
        timestamp: new Date().toISOString(),
        error: error.trim()
      })
    })
    
    collectionProcess.on('close', (code) => {
      console.log(`🏁 ${mode} job ${jobId} completed with code: ${code}`)
      jobInfo.status = code === 0 ? 'completed' : 'failed'
      jobInfo.endTime = new Date().toISOString()
      jobInfo.exitCode = code
      
      // Parse final metrics
      const output = jobInfo.output.join('\n')
      const totalMatch = output.match(/Total Listings:\s*(\d+)/)
      const savedMatch = output.match(/(\d+)\s*listings?\s*saved/)
      
      jobInfo.metrics = {
        totalListings: totalMatch ? parseInt(totalMatch[1]) : 0,
        savedToDatabase: savedMatch ? parseInt(savedMatch[1]) : 0,
        collectionRate: jobInfo.collectionRate || 0,
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
      message: `${mode} collection started successfully`,
      jobId: jobId,
      mode: mode,
      expectedDuration: mode === 'enterprise' ? '15-20 minutes' : '30-40 minutes',
      targetListings: target,
      features: mode === 'enterprise' 
        ? ['Distributed processing', 'Multi-worker architecture', 'Optimized for speed']
        : ['Single-threaded', 'Resource-efficient', 'Respectful delays']
    })

  } catch (error: any) {
    console.error('❌ Failed to start collection:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start collection job',
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
          mode: job.mode,
          status: job.status,
          startTime: job.startTime,
          endTime: job.endTime,
          totalListings: job.totalListings || 0,
          collectionRate: job.collectionRate || 0,
          recentOutput: job.output.slice(-5),
          errors: job.errors,
          metrics: job.metrics
        }
      })
    } else {
      // Get all jobs
      const jobs = Array.from(activeJobs.values()).map(job => ({
        id: job.id,
        mode: job.mode,
        status: job.status,
        startTime: job.startTime,
        totalListings: job.totalListings || 0
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