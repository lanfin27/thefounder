import { NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api-error-handler'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(request: Request) {
  // Mock implementation - in production this would stop actual monitoring
  return NextResponse.json({
    success: true,
    message: 'Monitoring stopped',
    timestamp: new Date().toISOString()
  })
}

export const POST = withErrorHandler(handler)