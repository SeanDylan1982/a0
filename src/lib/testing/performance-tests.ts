import { PrismaClient } from '@prisma/client'
import { CachedActivityService } from '../services/cached-activity-service'
import { CachedNotificationService } from '../services/cached-notification-service'
import { CacheManager } from '../cache/cache-manager'
import { PerformanceMonitor } from '../monitoring/performance-monitor'

const prisma = new PrismaClient()

export interface PerformanceTestResult {
  testName: string
  duration: number
  success: boolean
  error?: string
  metrics?: Record<string, any>
}

export class PerformanceTestSuite {
  private static results: PerformanceTestResult[] = []

  static async runAllTests(): Promise<PerformanceTestResult[]> {
    console.log('Starting performance test suite...')
    this.results = []

    // Database query performance tests
    await this.testActivityLogQueries()
    await this.testNotificationQueries()
    await this.testStockMovementQueries()

    // Cache performance tests
    await this.testCacheOperations()
    await this.testCacheHitRates()

    // Concurrent operation tests
    await this.testConcurrentReads()
    await this.testConcurrentWrites()

    // Memory and resource tests
    await this.testMemoryUsage()
    await this.testLargeDatasetHandling()

    console.log('Performance test suite completed')
    return this.results
  }

  private static async runTest(
    testName: string,
    testFn: () => Promise<any>
  ): Promise<PerformanceTestResult> {
    const startTime = Date.now()
    let success = true
    let error: string | undefined
    let metrics: Record<string, any> = {}

    try {
      const result = await testFn()
      if (typeof result === 'object' && result !== null) {
        metrics = result
      }
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
    }

    const duration = Date.now() - startTime
    const testResult: PerformanceTestResult = {
      testName,
      duration,
      success,
      error,
      metrics
    }

    this.results.push(testResult)
    console.log(`Test ${testName}: ${success ? 'PASS' : 'FAIL'} (${duration}ms)`)
    
    return testResult
  }

  // Database query performance tests
  private static async testActivityLogQueries(): Promise<void> {
    await this.runTest('Activity Log - Basic Query', async () => {
      const result = await CachedActivityService.getActivities({
        page: 1,
        limit: 20
      })
      return { recordCount: result.data.length, totalRecords: result.pagination.total }
    })

    await this.runTest('Activity Log - Filtered Query', async () => {
      const result = await CachedActivityService.getActivities({
        page: 1,
        limit: 20,
        module: 'inventory',
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      })
      return { recordCount: result.data.length }
    })

    await this.runTest('Activity Log - Stats Query', async () => {
      const stats = await CachedActivityService.getActivityStats()
      return {
        totalActivities: stats.totalActivities,
        moduleCount: Object.keys(stats.moduleBreakdown).length
      }
    })
  }

  private static async testNotificationQueries(): Promise<void> {
    await this.runTest('Notifications - Basic Query', async () => {
      // This would need a test user ID
      const testUserId = 'test-user-id'
      const result = await CachedNotificationService.getNotifications({
        userId: testUserId,
        page: 1,
        limit: 20
      })
      return { recordCount: result.data.length }
    })

    await this.runTest('Notifications - Unread Count', async () => {
      const testUserId = 'test-user-id'
      const count = await CachedNotificationService.getUnreadCount(testUserId)
      return { unreadCount: count }
    })
  }

  private static async testStockMovementQueries(): Promise<void> {
    await this.runTest('Stock Movements - Product History', async () => {
      const movements = await prisma.stockMovement.findMany({
        take: 100,
        orderBy: { timestamp: 'desc' },
        include: {
          product: { select: { name: true } },
          user: { select: { name: true } }
        }
      })
      return { recordCount: movements.length }
    })
  }

  // Cache performance tests
  private static async testCacheOperations(): Promise<void> {
    await this.runTest('Cache - Set Operation', async () => {
      const testData = { test: 'data', timestamp: Date.now() }
      await CacheManager.set('performance-test', testData)
      return { dataSize: JSON.stringify(testData).length }
    })

    await this.runTest('Cache - Get Operation', async () => {
      const data = await CacheManager.get('performance-test')
      return { found: data !== null }
    })

    await this.runTest('Cache - Delete Operation', async () => {
      await CacheManager.del('performance-test')
      const data = await CacheManager.get('performance-test')
      return { deleted: data === null }
    })
  }

  private static async testCacheHitRates(): Promise<void> {
    await this.runTest('Cache Hit Rate - Activity Service', async () => {
      const params = { page: 1, limit: 10 }
      
      // First call (cache miss)
      const start1 = Date.now()
      await CachedActivityService.getActivities(params)
      const duration1 = Date.now() - start1

      // Second call (cache hit)
      const start2 = Date.now()
      await CachedActivityService.getActivities(params)
      const duration2 = Date.now() - start2

      return {
        cacheMissDuration: duration1,
        cacheHitDuration: duration2,
        speedupRatio: duration1 / duration2
      }
    })
  }

  // Concurrent operation tests
  private static async testConcurrentReads(): Promise<void> {
    await this.runTest('Concurrent Reads - Activity Service', async () => {
      const concurrentRequests = 10
      const promises = Array(concurrentRequests).fill(null).map(() =>
        CachedActivityService.getActivities({ page: 1, limit: 20 })
      )

      const results = await Promise.all(promises)
      return {
        concurrentRequests,
        allSuccessful: results.every(r => r.data.length >= 0)
      }
    })
  }

  private static async testConcurrentWrites(): Promise<void> {
    await this.runTest('Concurrent Cache Writes', async () => {
      const concurrentWrites = 20
      const promises = Array(concurrentWrites).fill(null).map((_, i) =>
        CacheManager.set(`concurrent-test-${i}`, { value: i, timestamp: Date.now() })
      )

      await Promise.all(promises)

      // Verify all writes succeeded
      const verifyPromises = Array(concurrentWrites).fill(null).map((_, i) =>
        CacheManager.get(`concurrent-test-${i}`)
      )
      const results = await Promise.all(verifyPromises)

      return {
        concurrentWrites,
        successfulWrites: results.filter(r => r !== null).length
      }
    })
  }

  // Memory and resource tests
  private static async testMemoryUsage(): Promise<void> {
    await this.runTest('Memory Usage - Before Load', async () => {
      const memoryUsage = process.memoryUsage()
      return {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss
      }
    })

    await this.runTest('Memory Usage - After Load', async () => {
      // Simulate memory load
      const largeData = Array(10000).fill(null).map((_, i) => ({
        id: i,
        data: `test-data-${i}`,
        timestamp: new Date(),
        metadata: { index: i, processed: false }
      }))

      // Store in cache
      await CacheManager.set('large-dataset', largeData)

      const memoryUsage = process.memoryUsage()
      return {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        dataSize: largeData.length
      }
    })
  }

  private static async testLargeDatasetHandling(): Promise<void> {
    await this.runTest('Large Dataset - Pagination Performance', async () => {
      // Test pagination with large page numbers
      const result = await CachedActivityService.getActivities({
        page: 100,
        limit: 50
      })

      return {
        page: 100,
        recordCount: result.data.length,
        totalPages: result.pagination.totalPages
      }
    })
  }

  // Benchmark specific operations
  static async benchmarkOperation(
    name: string,
    operation: () => Promise<any>,
    iterations: number = 100
  ): Promise<{
    name: string
    iterations: number
    totalDuration: number
    averageDuration: number
    minDuration: number
    maxDuration: number
    successRate: number
  }> {
    const durations: number[] = []
    let successes = 0

    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      try {
        await operation()
        successes++
      } catch (error) {
        console.error(`Benchmark iteration ${i} failed:`, error)
      }
      durations.push(Date.now() - start)
    }

    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const averageDuration = totalDuration / iterations
    const minDuration = Math.min(...durations)
    const maxDuration = Math.max(...durations)
    const successRate = successes / iterations

    return {
      name,
      iterations,
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      successRate
    }
  }

  static getTestResults(): PerformanceTestResult[] {
    return this.results
  }

  static generateReport(): string {
    const report = [
      '# Performance Test Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Test Results',
      ''
    ]

    this.results.forEach(result => {
      report.push(`### ${result.testName}`)
      report.push(`- Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`)
      report.push(`- Duration: ${result.duration}ms`)
      
      if (result.error) {
        report.push(`- Error: ${result.error}`)
      }
      
      if (result.metrics) {
        report.push('- Metrics:')
        Object.entries(result.metrics).forEach(([key, value]) => {
          report.push(`  - ${key}: ${value}`)
        })
      }
      
      report.push('')
    })

    return report.join('\n')
  }
}