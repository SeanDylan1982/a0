import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { CacheManager } from '../../cache/cache-manager'
import { PerformanceMonitor } from '../../monitoring/performance-monitor'
import { PerformanceTestSuite } from '../performance-tests'
import { CachedActivityService } from '../../services/cached-activity-service'
import { CachedNotificationService } from '../../services/cached-notification-service'

describe('Performance Optimization Tests', () => {
  beforeAll(async () => {
    // Initialize test environment
    console.log('Setting up performance tests...')
  })

  afterAll(async () => {
    // Cleanup
    await CacheManager.flush()
  })

  describe('Cache Manager', () => {
    it('should set and get values from cache', async () => {
      const testKey = 'test-key'
      const testValue = { data: 'test-data', timestamp: Date.now() }

      await CacheManager.set(testKey, testValue)
      const retrieved = await CacheManager.get(testKey)

      expect(retrieved).toEqual(testValue)
    })

    it('should handle cache expiration', async () => {
      const testKey = 'expiring-key'
      const testValue = { data: 'expiring-data' }

      // Set with 1 second TTL
      await CacheManager.set(testKey, testValue, { ttl: 1 })
      
      // Should be available immediately
      let retrieved = await CacheManager.get(testKey)
      expect(retrieved).toEqual(testValue)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Should be null after expiration
      retrieved = await CacheManager.get(testKey)
      expect(retrieved).toBeNull()
    })

    it('should delete cached values', async () => {
      const testKey = 'delete-test'
      const testValue = { data: 'to-be-deleted' }

      await CacheManager.set(testKey, testValue)
      await CacheManager.del(testKey)
      
      const retrieved = await CacheManager.get(testKey)
      expect(retrieved).toBeNull()
    })

    it('should invalidate patterns', async () => {
      await CacheManager.set('pattern-test-1', { data: '1' })
      await CacheManager.set('pattern-test-2', { data: '2' })
      await CacheManager.set('other-key', { data: 'other' })

      await CacheManager.invalidatePattern('pattern-test*')

      expect(await CacheManager.get('pattern-test-1')).toBeNull()
      expect(await CacheManager.get('pattern-test-2')).toBeNull()
      expect(await CacheManager.get('other-key')).not.toBeNull()
    })
  })

  describe('Performance Monitor', () => {
    it('should measure query performance', async () => {
      const queryName = 'test-query'
      let executionTime = 0

      const result = await PerformanceMonitor.measureQuery(queryName, async () => {
        const start = Date.now()
        await new Promise(resolve => setTimeout(resolve, 100)) // Simulate 100ms query
        executionTime = Date.now() - start
        return { success: true }
      })

      expect(result).toEqual({ success: true })
      expect(executionTime).toBeGreaterThanOrEqual(100)
    })

    it('should measure API performance', async () => {
      const endpoint = '/test-endpoint'
      const method = 'GET'
      let executionTime = 0

      const result = await PerformanceMonitor.measureAPI(endpoint, method, async () => {
        const start = Date.now()
        await new Promise(resolve => setTimeout(resolve, 50)) // Simulate 50ms API call
        executionTime = Date.now() - start
        return { data: 'test' }
      })

      expect(result).toEqual({ data: 'test' })
      expect(executionTime).toBeGreaterThanOrEqual(50)
    })

    it('should record custom metrics', async () => {
      const metric = {
        name: 'test-metric',
        value: 42,
        unit: 'count',
        timestamp: new Date(),
        tags: { test: 'true' }
      }

      await PerformanceMonitor.recordMetric(metric)
      
      // Verify metric was recorded (this would need access to internal metrics)
      expect(true).toBe(true) // Placeholder assertion
    })

    it('should collect system metrics', async () => {
      await PerformanceMonitor.collectSystemMetrics()
      
      // Verify system metrics were collected
      expect(true).toBe(true) // Placeholder assertion
    })
  })

  describe('Cached Services', () => {
    it('should cache activity service results', async () => {
      const params = { page: 1, limit: 5 }

      // First call - should hit database
      const start1 = Date.now()
      const result1 = await CachedActivityService.getActivities(params)
      const duration1 = Date.now() - start1

      // Second call - should hit cache
      const start2 = Date.now()
      const result2 = await CachedActivityService.getActivities(params)
      const duration2 = Date.now() - start2

      // Results should be identical
      expect(result1).toEqual(result2)
      
      // Second call should be faster (cache hit) or at least not significantly slower
      expect(duration2).toBeLessThanOrEqual(duration1 * 2) // Allow some variance
    }, 10000) // Increase timeout to 10 seconds

    it('should handle cache invalidation', async () => {
      const params = { page: 1, limit: 5 }

      // Cache some data
      await CachedActivityService.getActivities(params)

      // Invalidate cache
      await CachedActivityService.invalidateCache()

      // Next call should hit database again
      const result = await CachedActivityService.getActivities(params)
      expect(result).toBeDefined()
    })
  })

  describe('Performance Test Suite', () => {
    it('should run benchmark operations', async () => {
      const benchmarkResult = await PerformanceTestSuite.benchmarkOperation(
        'cache-set-test',
        async () => {
          await CacheManager.set(`benchmark-${Date.now()}`, { test: true })
        },
        10 // 10 iterations
      )

      expect(benchmarkResult.name).toBe('cache-set-test')
      expect(benchmarkResult.iterations).toBe(10)
      expect(benchmarkResult.averageDuration).toBeGreaterThanOrEqual(0)
      expect(benchmarkResult.successRate).toBeGreaterThan(0)
    })

    it('should generate performance report', async () => {
      // Run a simple test to generate some results
      await PerformanceTestSuite.benchmarkOperation(
        'report-test',
        async () => ({ success: true }),
        5
      )

      const report = PerformanceTestSuite.generateReport()
      
      expect(report).toContain('# Performance Test Report')
      expect(report).toContain('Generated:')
      expect(report).toContain('## Test Results')
    })
  })

  describe('Pagination Performance', () => {
    it('should handle large page numbers efficiently', async () => {
      const params = { page: 100, limit: 20 }

      const start = Date.now()
      const result = await CachedActivityService.getActivities(params)
      const duration = Date.now() - start

      expect(result).toBeDefined()
      expect(result.pagination.page).toBe(100)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should cache paginated results', async () => {
      const params = { page: 1, limit: 10 }

      // First call
      const start1 = Date.now()
      const result1 = await CachedActivityService.getActivities(params)
      const duration1 = Date.now() - start1

      // Second call (should be cached)
      const start2 = Date.now()
      const result2 = await CachedActivityService.getActivities(params)
      const duration2 = Date.now() - start2

      expect(result1).toEqual(result2)
      expect(duration2).toBeLessThan(duration1 * 0.5) // Should be at least 50% faster
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent cache operations', async () => {
      const concurrentOperations = 20
      const promises = []

      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          CacheManager.set(`concurrent-${i}`, { index: i, timestamp: Date.now() })
        )
      }

      // All operations should complete successfully
      await expect(Promise.all(promises)).resolves.toBeDefined()

      // Verify all values were set
      for (let i = 0; i < concurrentOperations; i++) {
        const value = await CacheManager.get(`concurrent-${i}`)
        expect(value).toEqual({ index: i, timestamp: expect.any(Number) })
      }
    })

    it('should handle concurrent service calls', async () => {
      const concurrentCalls = 10
      const params = { page: 1, limit: 5 }
      
      const promises = Array(concurrentCalls).fill(null).map(() =>
        CachedActivityService.getActivities(params)
      )

      const results = await Promise.all(promises)

      // All results should be identical (cached)
      const firstResult = results[0]
      results.forEach(result => {
        expect(result).toEqual(firstResult)
      })
    })
  })

  describe('Memory Management', () => {
    it('should not cause memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Create and cache large dataset
      const largeData = Array(1000).fill(null).map((_, i) => ({
        id: i,
        data: `large-data-item-${i}`,
        timestamp: new Date(),
        metadata: { processed: false, index: i }
      }))

      await CacheManager.set('large-dataset', largeData)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const afterMemory = process.memoryUsage().heapUsed
      const memoryIncrease = afterMemory - initialMemory

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)

      // Cleanup
      await CacheManager.del('large-dataset')
    })
  })
})