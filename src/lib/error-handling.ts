// Error handling utilities

import { NextResponse } from 'next/server'
import type { AppError } from './types'

// Custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string> = {}
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Database operation failed') {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Error response builder
export function createErrorResponse(error: unknown, statusCode?: number) {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)
  const status = statusCode || getErrorStatusCode(error)
  
  const response = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  }
  
  // Add validation errors if present
  if (error instanceof ValidationError && error.errors) {
    return NextResponse.json(
      { ...response, errors: error.errors },
      { status }
    )
  }
  
  return NextResponse.json(response, { status })
}

// Get error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }
  
  return 'An unexpected error occurred'
}

// Get error code
export function getErrorCode(error: unknown): string {
  if (error instanceof ValidationError) return 'VALIDATION_ERROR'
  if (error instanceof AuthenticationError) return 'AUTHENTICATION_ERROR'
  if (error instanceof AuthorizationError) return 'AUTHORIZATION_ERROR'
  if (error instanceof NotFoundError) return 'NOT_FOUND'
  if (error instanceof RateLimitError) return 'RATE_LIMIT_EXCEEDED'
  if (error instanceof DatabaseError) return 'DATABASE_ERROR'
  
  if (error instanceof Error) {
    return error.name.toUpperCase().replace(/\s+/g, '_')
  }
  
  return 'UNKNOWN_ERROR'
}

// Get appropriate HTTP status code
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof ValidationError) return 400
  if (error instanceof AuthenticationError) return 401
  if (error instanceof AuthorizationError) return 403
  if (error instanceof NotFoundError) return 404
  if (error instanceof RateLimitError) return 429
  if (error instanceof DatabaseError) return 500
  
  return 500
}

// Error logger
export function logError(error: unknown, context?: Record<string, any>) {
  const timestamp = new Date().toISOString()
  const message = getErrorMessage(error)
  const code = getErrorCode(error)
  
  console.error('[ERROR]', {
    timestamp,
    code,
    message,
    context,
    stack: error instanceof Error ? error.stack : undefined
  })
}

// Try-catch wrapper for async functions
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<[T | null, unknown | null]> {
  try {
    const result = await fn()
    return [result, null]
  } catch (error) {
    if (errorHandler) {
      errorHandler(error)
    }
    return [null, error]
  }
}

// API route error boundary
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      logError(error, { handler: handler.name })
      return createErrorResponse(error)
    }
  }) as T
}

// Client-side error boundary hook
export function useErrorHandler() {
  const handleError = (error: unknown, errorInfo?: { componentStack?: string }) => {
    logError(error, errorInfo)
    
    // You can add custom error reporting here
    // e.g., send to error tracking service
  }
  
  return { handleError }
}

// Format error for display
export function formatErrorForDisplay(error: unknown): string {
  const message = getErrorMessage(error)
  
  // Make technical errors more user-friendly
  const userFriendlyMessages: Record<string, string> = {
    'Network request failed': 'Connection error. Please check your internet connection.',
    'Failed to fetch': 'Unable to load data. Please try again.',
    'Invalid credentials': 'Incorrect email or password.',
    'Email already in use': 'An account with this email already exists.',
    'Rate limit exceeded': 'Too many requests. Please wait a moment and try again.',
  }
  
  return userFriendlyMessages[message] || message
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: unknown) => void
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options
  
  let lastError: unknown
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === maxAttempts) {
        throw error
      }
      
      if (onRetry) {
        onRetry(attempt, error)
      }
      
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Error recovery strategies
export const errorRecovery = {
  // Fallback to default value
  withDefault: <T>(fn: () => T, defaultValue: T): T => {
    try {
      return fn()
    } catch {
      return defaultValue
    }
  },
  
  // Fallback to alternative function
  withFallback: <T>(primary: () => T, fallback: () => T): T => {
    try {
      return primary()
    } catch {
      return fallback()
    }
  },
  
  // Ignore error and continue
  ignoreError: <T>(fn: () => T): T | undefined => {
    try {
      return fn()
    } catch {
      return undefined
    }
  }
}