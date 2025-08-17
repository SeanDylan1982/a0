import { NextRequest, NextResponse } from 'next/server'
import { PerformanceMonitor } from '@/lib/monitoring/performance-monitor'
import { CacheManager } from '@/lib/cache/cache-manager'
import { BackgroundJobManager } from '@/lib/jobs/background-jobs'
import { withPerformanceMonitoring } from '@/lib/middleware/performance-middleware'

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url)
      const timeRange = parseInt(url.searchParams.get('timeRange') || '3600000') // Default 1 hour

      // Get performance summary
      const summary = await PerformanceMonitor.getPerformanceSummary(timeRange)

      // Get job status
      const jobStatus = BackgroundJobManager.getJobStatus()

      // Get cache statistics (if available)
      const cacheStats = await getCacheStatistics()

      return NextResponse.json({
        success: true,
        data: {
          summary,
          jobStatus,
          cacheStats,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch performance metrics' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

async function getCacheStatistics() {
  try {
    // Get basic cache statistics
    const stats = {
      memoryCache: {
        // This would need to be implemented in CacheManager
        size: 0,
        hitRate: 0,
        missRate: 0
      },
      redis: {
        connected: false,
        memory: 0,
        keys: 0
      }
    }

    return stats
  } catch (error) {
    console.error('Error getting cache statistics:', error)
    return null
  }
}

export const GET = withPerformanceMonitoring(handler, {
  enableLogging: true,
  slowRequestThreshold: 2000
})