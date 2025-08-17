import RedisClient from './redis-client'

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string
}

export class CacheManager {
  private static memoryCache = new Map<string, { value: any; expires: number }>()
  private static defaultTTL = 3600 // 1 hour

  static async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.prefix)

    // Try Redis first
    if (RedisClient.isReady()) {
      try {
        const value = await RedisClient.getInstance().get(fullKey)
        return value ? JSON.parse(value) : null
      } catch (error) {
        console.error('Redis get error:', error)
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(fullKey)
    if (cached && cached.expires > Date.now()) {
      return cached.value
    }

    // Clean up expired entry
    if (cached) {
      this.memoryCache.delete(fullKey)
    }

    return null
  }

  static async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix)
    const ttl = options?.ttl || this.defaultTTL

    // Try Redis first
    if (RedisClient.isReady()) {
      try {
        await RedisClient.getInstance().setex(fullKey, ttl, JSON.stringify(value))
        return
      } catch (error) {
        console.error('Redis set error:', error)
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(fullKey, {
      value,
      expires: Date.now() + (ttl * 1000)
    })
  }

  static async del(key: string, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix)

    // Try Redis first
    if (RedisClient.isReady()) {
      try {
        await RedisClient.getInstance().del(fullKey)
      } catch (error) {
        console.error('Redis del error:', error)
      }
    }

    // Also remove from memory cache
    this.memoryCache.delete(fullKey)
  }

  static async invalidatePattern(pattern: string, options?: CacheOptions): Promise<void> {
    const fullPattern = this.buildKey(pattern, options?.prefix)

    // Try Redis first
    if (RedisClient.isReady()) {
      try {
        const keys = await RedisClient.getInstance().keys(fullPattern)
        if (keys.length > 0) {
          await RedisClient.getInstance().del(...keys)
        }
      } catch (error) {
        console.error('Redis pattern invalidation error:', error)
      }
    }

    // Also clear matching memory cache entries
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern.replace('*', ''))) {
        this.memoryCache.delete(key)
      }
    }
  }

  static async flush(): Promise<void> {
    // Clear Redis
    if (RedisClient.isReady()) {
      try {
        await RedisClient.getInstance().flushdb()
      } catch (error) {
        console.error('Redis flush error:', error)
      }
    }

    // Clear memory cache
    this.memoryCache.clear()
  }

  private static buildKey(key: string, prefix?: string): string {
    const basePrefix = process.env.CACHE_PREFIX || 'account-zero'
    return prefix ? `${basePrefix}:${prefix}:${key}` : `${basePrefix}:${key}`
  }

  // Clean up expired memory cache entries
  static cleanupMemoryCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expires <= now) {
        this.memoryCache.delete(key)
      }
    }
  }
}

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    CacheManager.cleanupMemoryCache()
  }, 5 * 60 * 1000)
}