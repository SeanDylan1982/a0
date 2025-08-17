import RedisClient from '../cache/redis-client'
import { BackgroundJobManager } from '../jobs/background-jobs'
import { PermissionCache } from '../cache/permission-cache'
import { TranslationCache } from '../cache/translation-cache'
import { PerformanceMonitor } from '../monitoring/performance-monitor'

export class PerformanceInitializer {
  private static initialized = false

  static async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Performance system already initialized')
      return
    }

    console.log('Initializing performance optimization system...')

    try {
      // Initialize Redis connection
      await this.initializeRedis()

      // Initialize background jobs
      await this.initializeBackgroundJobs()

      // Warm up caches
      await this.warmupCaches()

      // Start performance monitoring
      await this.initializeMonitoring()

      this.initialized = true
      console.log('Performance optimization system initialized successfully')
    } catch (error) {
      console.error('Failed to initialize performance system:', error)
      // Continue without performance optimizations
    }
  }

  private static async initializeRedis(): Promise<void> {
    try {
      await RedisClient.connect()
      console.log('Redis client initialized')
    } catch (error) {
      console.warn('Redis not available, falling back to memory cache:', error)
    }
  }

  private static async initializeBackgroundJobs(): Promise<void> {
    await BackgroundJobManager.initialize()
    console.log('Background jobs initialized')
  }

  private static async warmupCaches(): Promise<void> {
    try {
      // Warm up permission cache for common roles
      const commonRoles = ['DIRECTOR', 'MANAGER', 'USER', 'STAFF_MEMBER']
      await PermissionCache.warmupRolePermissions(commonRoles as any)

      // Warm up translation cache
      await TranslationCache.warmupTranslations()

      console.log('Cache warmup completed')
    } catch (error) {
      console.warn('Cache warmup failed:', error)
    }
  }

  private static async initializeMonitoring(): Promise<void> {
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      // Start collecting system metrics
      setInterval(async () => {
        await PerformanceMonitor.collectSystemMetrics()
      }, 60000) // Every minute

      console.log('Performance monitoring started')
    }
  }

  static async shutdown(): Promise<void> {
    console.log('Shutting down performance system...')

    try {
      // Stop background jobs
      BackgroundJobManager.stopAllJobs()

      // Disconnect Redis
      await RedisClient.disconnect()

      this.initialized = false
      console.log('Performance system shutdown completed')
    } catch (error) {
      console.error('Error during performance system shutdown:', error)
    }
  }

  static isInitialized(): boolean {
    return this.initialized
  }
}