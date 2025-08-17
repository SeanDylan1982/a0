interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (req: any) => string // Optional custom key generator
}

interface RateLimitInfo {
  remaining: number
  resetTime: Date
  total: number
}

class RateLimiter {
  private stores = new Map<string, {
    requests: Array<{ timestamp: number }>
    windowMs: number
    maxRequests: number
  }>()

  constructor(private config: RateLimitConfig) {}

  async checkLimit(req: any): Promise<{ allowed: boolean; limitInfo?: RateLimitInfo }> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(req) : this.getDefaultKey(req)
    
    let store = this.stores.get(key)
    
    if (!store) {
      store = {
        requests: [],
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      }
      this.stores.set(key, store)
    }

    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Clean old requests
    store.requests = store.requests.filter(req => req.timestamp > windowStart)

    if (store.requests.length >= this.config.maxRequests) {
      const oldestRequest = store.requests[0]
      const resetTime = new Date(oldestRequest.timestamp + this.config.windowMs)
      
      return {
        allowed: false,
        limitInfo: {
          remaining: 0,
          resetTime,
          total: this.config.maxRequests
        }
      }
    }

    // Add new request
    store.requests.push({ timestamp: now })
    
    const resetTime = new Date(now + this.config.windowMs)
    
    return {
      allowed: true,
      limitInfo: {
        remaining: this.config.maxRequests - store.requests.length,
        resetTime,
        total: this.config.maxRequests
      }
    }
  }

  private getDefaultKey(req: any): string {
    // Try to get IP address from various sources
    const ip = req.headers?.['x-forwarded-for'] || 
                req.headers?.['x-real-ip'] || 
                req.connection?.remoteAddress || 
                req.socket?.remoteAddress || 
                'unknown'
    
    return `rate_limit:${ip}`
  }

  // Cleanup old stores periodically
  startCleanup(intervalMs: number = 60000) {
    setInterval(() => {
      const now = Date.now()
      for (const [key, store] of this.stores.entries()) {
        const windowStart = now - store.windowMs
        store.requests = store.requests.filter(req => req.timestamp > windowStart)
        
        // Remove empty stores
        if (store.requests.length === 0) {
          this.stores.delete(key)
        }
      }
    }, intervalMs)
  }
}

// Pre-configured rate limiters for different use cases
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyGenerator: (req: any) => {
    const ip = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown'
    const endpoint = req.nextUrl?.pathname || 'unknown'
    return `api:${ip}:${endpoint}`
  }
})

export const databaseRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 database operations per minute
  keyGenerator: (req: any) => {
    const ip = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown'
    return `db:${ip}`
  }
})

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per 15 minutes
  keyGenerator: (req: any) => {
    const ip = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown'
    const email = req.body?.email || 'unknown'
    return `auth:${ip}:${email}`
  }
})

// Middleware function for Next.js API routes
export async function applyRateLimit(
  req: any,
  limiter: RateLimiter = apiRateLimiter
): Promise<{ allowed: boolean; limitInfo?: RateLimitInfo }> {
  return await limiter.checkLimit(req)
}

// Start cleanup for all limiters
if (typeof window === 'undefined') { // Only run on server side
  apiRateLimiter.startCleanup()
  databaseRateLimiter.startCleanup()
  authRateLimiter.startCleanup()
}