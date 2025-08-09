import { NextResponse } from 'next/server'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: any, context?: string) {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error)
  
  // If it's already an ApiError, use its properties
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      },
      { status: error.statusCode }
    )
  }
  
  // Handle Supabase errors
  if (error.code && error.message) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database Error',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    )
  }
  
  // Default error response
  return NextResponse.json(
    {
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  )
}

// Wrapper for API route handlers
export function withErrorHandler(
  handler: (req: Request) => Promise<Response>,
  context?: string
) {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (error) {
      return handleApiError(error, context)
    }
  }
}