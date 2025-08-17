import { CacheManager } from '../cache/cache-manager'

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: Date
  tags?: Record<string, string>
}

export interface QueryPerformanceData {
  query: string
  duration: number
  timestamp: Date
  success: boolean
  error?: string
}

export interface APIPerformanceData {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  timestamp: Date
  userId?: string
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = []
  private static readonly MAX_METRICS = 1000
  private static readonly ALERT_THRESHOLDS = {
    queryDuration: 5000, // 5 seconds
    apiDuration: 3000,   // 3 seconds
    memoryUsage: 0.9,    // 90% of available memory
    errorRate: 0.1       // 10% error rate
  }

  // Database query monitoring
  static async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    let success = true
    let error: string | undefined

    try {
      const result = await queryFn()
      return result
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - startTime
      
      await this.recordQueryPerformance({
        query: queryName,
        duration,
        timestamp: new Date(),
        success,
        error
      })

      // Alert if query is slow
      if (duration > this.ALERT_THRESHOLDS.queryDuration) {
        await this.triggerAlert('slow_query', {
          query: queryName,
          duration: duration.toString(),
          threshold: this.ALERT_THRESHOLDS.queryDuration.toString()
        })
      }
    }
  }

  // API endpoint monitoring
  static async measureAPI<T>(
    endpoint: string,
    method: string,
    apiFn: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    const startTime = Date.now()
    let statusCode = 200

    try {
      const result = await apiFn()
      return result
    } catch (err) {
      statusCode = 500
      throw err
    } finally {
      const duration = Date.now() - startTime
      
      await this.recordAPIPerformance({
        endpoint,
        method,
        duration,
        statusCode,
        timestamp: new Date(),
        userId
      })

      // Alert if API is slow
      if (duration > this.ALERT_THRESHOLDS.apiDuration) {
        await this.triggerAlert('slow_api', {
          endpoint,
          method,
          duration: duration.toString(),
          threshold: this.ALERT_THRESHOLDS.apiDuration.toString()
        })
      }
    }
  }

  // Record custom metrics
  static async recordMetric(metric: PerformanceMetric): Promise<void> {
    this.metrics.push(metric)

    // Keep only recent metrics in memory
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }

    // Store in cache for dashboard
    await CacheManager.set(
      `metric:${metric.name}:${Date.now()}`,
      metric,
      { ttl: 3600, prefix: 'performance' }
    )
  }

  // System resource monitoring
  static async collectSystemMetrics(): Promise<void> {
    const memoryUsage = process.memoryUsage()
    const timestamp = new Date()

    const metrics: PerformanceMetric[] = [
      {
        name: 'memory_heap_used',
        value: memoryUsage.heapUsed,
        unit: 'bytes',
        timestamp
      },
      {
        name: 'memory_heap_total',
        value: memoryUsage.heapTotal,
        unit: 'bytes',
        timestamp
      },
      {
        name: 'memory_rss',
        value: memoryUsage.rss,
        unit: 'bytes',
        timestamp
      },
      {
        name: 'uptime',
        value: process.uptime(),
        unit: 'seconds',
        timestamp
      }
    ]

    for (const metric of metrics) {
      await this.recordMetric(metric)
    }

    // Check memory usage alert
    const memoryUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal
    if (memoryUsageRatio > this.ALERT_THRESHOLDS.memoryUsage) {
      await this.triggerAlert('high_memory_usage', {
        usage: (memoryUsageRatio * 100).toFixed(2),
        threshold: (this.ALERT_THRESHOLDS.memoryUsage * 100).toString()
      })
    }
  }

  // Cache performance monitoring
  static async measureCacheOperation<T>(
    operation: string,
    operationFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await operationFn()
      const duration = Date.now() - startTime

      await this.recordMetric({
        name: 'cache_operation_duration',
        value: duration,
        unit: 'milliseconds',
        timestamp: new Date(),
        tags: { operation }
      })

      return result
    } catch (error) {
      await this.recordMetric({
        name: 'cache_operation_error',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        tags: { operation, error: error instanceof Error ? error.message : 'unknown' }
      })
      throw error
    }
  }

  // Get performance summary
  static async getPerformanceSummary(timeRange: number = 3600000): Promise<{
    queries: QueryPerformanceData[]
    apis: APIPerformanceData[]
    systemMetrics: PerformanceMetric[]
    alerts: any[]
  }> {
    const cutoff = new Date(Date.now() - timeRange)

    // Get recent data from cache
    const queries = await this.getRecentQueries(cutoff)
    const apis = await this.getRecentAPIs(cutoff)
    const systemMetrics = this.metrics.filter(m => m.timestamp >= cutoff)
    const alerts = await this.getRecentAlerts(cutoff)

    return {
      queries,
      apis,
      systemMetrics,
      alerts
    }
  }

  // Private helper methods
  private static async recordQueryPerformance(data: QueryPerformanceData): Promise<void> {
    await CacheManager.set(
      `query:${Date.now()}`,
      data,
      { ttl: 3600, prefix: 'performance' }
    )
  }

  private static async recordAPIPerformance(data: APIPerformanceData): Promise<void> {
    await CacheManager.set(
      `api:${Date.now()}`,
      data,
      { ttl: 3600, prefix: 'performance' }
    )
  }

  private static async triggerAlert(type: string, data: Record<string, string>): Promise<void> {
    const alert = {
      type,
      data,
      timestamp: new Date(),
      severity: this.getAlertSeverity(type)
    }

    await CacheManager.set(
      `alert:${Date.now()}`,
      alert,
      { ttl: 86400, prefix: 'performance' } // Keep alerts for 24 hours
    )

    console.warn(`Performance Alert [${type}]:`, data)
  }

  private static getAlertSeverity(type: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case 'slow_query':
      case 'slow_api':
        return 'medium'
      case 'high_memory_usage':
        return 'high'
      default:
        return 'low'
    }
  }

  private static async getRecentQueries(cutoff: Date): Promise<QueryPerformanceData[]> {
    // In a real implementation, you'd fetch from cache or database
    return []
  }

  private static async getRecentAPIs(cutoff: Date): Promise<APIPerformanceData[]> {
    // In a real implementation, you'd fetch from cache or database
    return []
  }

  private static async getRecentAlerts(cutoff: Date): Promise<any[]> {
    // In a real implementation, you'd fetch from cache or database
    return []
  }
}