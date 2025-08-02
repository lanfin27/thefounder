import { NextRequest, NextResponse } from 'next/server';
import Bull from 'bull';
import { extractAdminToken } from '@/lib/auth/admin';

// Initialize queue
const schedulerQueue = new Bull('flippa-scheduler', process.env.REDIS_URL!);

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const adminToken = extractAdminToken(request);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { type = 'complete', options = {} } = body;
    
    // Create job based on type
    let job;
    
    switch (type) {
      case 'complete':
        // Full scrape with page setup
        job = await schedulerQueue.add(
          'manual-complete-scrape',
          {
            type: 'manual-complete',
            triggeredAt: new Date().toISOString(),
            options: {
              clearFilters: options.clearFilters ?? true,
              recentlySold: options.recentlySold ?? true,
              sortBy: options.sortBy || 'most_recent',
              itemsPerPage: options.itemsPerPage || 100,
              maxPages: options.maxPages || 10
            }
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          }
        );
        break;
        
      case 'quick':
        // Quick scrape of first page only
        job = await schedulerQueue.add(
          'manual-quick-scrape',
          {
            type: 'manual-quick',
            triggeredAt: new Date().toISOString(),
            options: {
              ...options,
              maxPages: 1
            }
          },
          {
            removeOnComplete: true,
            removeOnFail: false
          }
        );
        break;
        
      case 'incremental':
        // Incremental update only
        job = await schedulerQueue.add(
          'manual-incremental',
          {
            type: 'manual-incremental',
            triggeredAt: new Date().toISOString(),
            options: {
              onlyNew: true,
              ...options
            }
          },
          {
            removeOnComplete: true,
            removeOnFail: false
          }
        );
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid scraping type' },
          { status: 400 }
        );
    }
    
    // Return job details
    return NextResponse.json({
      success: true,
      jobId: job.id,
      type: type,
      status: 'queued',
      options: job.data.options,
      message: `Scraping job ${job.id} has been queued`
    });
    
  } catch (error) {
    console.error('Error triggering scrape:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to trigger scraping',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get scraping job status
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const adminToken = extractAdminToken(request);
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get job ID from query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      // Return queue stats if no specific job ID
      const stats = await schedulerQueue.getJobCounts();
      const jobs = await schedulerQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
      
      return NextResponse.json({
        queue: 'flippa-scheduler',
        stats: stats,
        recentJobs: jobs.slice(0, 10).map(job => ({
          id: job.id,
          type: job.data.type,
          status: job.finishedOn ? 'completed' : job.failedReason ? 'failed' : 'active',
          createdAt: new Date(job.timestamp).toISOString(),
          finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          progress: job.progress
        }))
      });
    }
    
    // Get specific job
    const job = await schedulerQueue.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: job.id,
      type: job.data.type,
      status: job.finishedOn ? 'completed' : job.failedReason ? 'failed' : 'active',
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: new Date(job.timestamp).toISOString(),
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    });
    
  } catch (error) {
    console.error('Error getting job status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}