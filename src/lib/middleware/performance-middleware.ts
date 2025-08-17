import { NextRequest, NextResponse } from 'next/server'
import { PerformanceMonitor } from '../monitoring/performance-monitor'

export interface PerformanceMiddlewareOptions {
  enableLogging?: boolean
  slowRequestThreshold?: number
  enableCaching?: boolean
  cacheHeaders?: boolean
}

export function withPerformanceMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: PerformanceMiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const {
      enableLogging = true,
      slowRequestThreshold = 3000,
      enableCaching = true,
      cacheHeaders = true
    } = options

    const startTime = Date.now()
    const endpoint = req.nextUrl.pathname
    const method = req.method

    // Extract user ID from request if available
    let userId: string | undefined
    try {
      // This would depend on your authentication implementation
      // const session = await getSession(req)
      // userId = session?.user?.id
    } catch (error) {
      // Ignore auth errors for performance monitoring
    }

    let response: NextResponse
    let statusCode = 200

    try {
      // Execute the handler with performance monitoring
      response = await PerformanceMonitor.measureAPI(
        endpoint,
        method,
        () => handler(req),
        userId
      )

      statusCode = response.status
    } catch (error) {
      statusCode = 500
      throw error
    } finally {
      const duration = Date.now() - startTime

      // Log slow requests
      if (enableLogging && duration > slowRequestThreshold) {
        console.warn(`Slow API request detected: ${method} ${endpoint} (${duration}ms)`)
      }

      // Add performance headers
      if (cacheHeaders && response!) {
        response.headers.set('X-Response-Time', `${duration}ms`)
        response.headers.set('X-Timestamp', new Date().toISOString())
      }
    }

    return response!
  }
}

// Middleware for database operations
export function withQueryPerformanceMonitoring<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return PerformanceMonitor.measureQuery(queryName, queryFn)
}

// Middleware for cache operations
export function withCachePerformanceMonitoring<T>(
  operation: string,
  cacheFn: () => Promise<T>
): Promise<T> {
  return PerformanceMonitor.measureCacheOperation(operation, cacheFn)
}

// Request size monitoring
export function checkRequestSize(req: NextRequest, maxSize: number = 10 * 1024 * 1024): void {
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new Error(`Request too large: ${contentLength} bytes (max: ${maxSize} bytes)`)
  }
}

// Rate limiting helper
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>()

  static isAllowed(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime < windowStart) {
        this.requests.delete(key)
      }
    }

    const current = this.requests.get(identifier)
    
    if (!current || current.resetTime < windowStart) {
      this.requests.set(identifier, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (current.count >= maxRequests) {
      return false
    }

    current.count++
    return true
  }

  static getRemainingRequests(identifier: string, maxRequests: number = 100): number {
    const current = this.requests.get(identifier)
    if (!current) return maxRequests
    return Math.max(0, maxRequests - current.count)
  }
}