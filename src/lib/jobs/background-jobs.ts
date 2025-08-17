import { PrismaClient } from '@prisma/client'
import { CacheManager } from '../cache/cache-manager'

const prisma = new PrismaClient()

export interface JobConfig {
  name: string
  interval: number // milliseconds
  enabled: boolean
  lastRun?: Date
}

export class BackgroundJobManager {
  private static jobs: Map<string, NodeJS.Timeout> = new Map()
  private static isInitialized = false

  static async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('Initializing background jobs...')

    // Notification cleanup job - runs every hour
    this.scheduleJob('notification-cleanup', 60 * 60 * 1000, this.cleanupExpiredNotifications)

    // Activity log archival - runs daily at 2 AM
    this.scheduleJob('activity-log-archival', 24 * 60 * 60 * 1000, this.archiveOldActivityLogs)

    // Stock reservation cleanup - runs every 15 minutes
    this.scheduleJob('stock-reservation-cleanup', 15 * 60 * 1000, this.cleanupExpiredReservations)

    // Cache cleanup - runs every 30 minutes
    this.scheduleJob('cache-cleanup', 30 * 60 * 1000, this.cleanupCache)

    // Performance metrics collection - runs every 5 minutes
    this.scheduleJob('performance-metrics', 5 * 60 * 1000, this.collectPerformanceMetrics)

    this.isInitialized = true
    console.log('Background jobs initialized successfully')
  }

  static scheduleJob(name: string, interval: number, jobFunction: () => Promise<void>): void {
    // Clear existing job if it exists
    const existingJob = this.jobs.get(name)
    if (existingJob) {
      clearInterval(existingJob)
    }

    // Schedule new job
    const job = setInterval(async () => {
      try {
        console.log(`Running background job: ${name}`)
        await jobFunction()
        console.log(`Completed background job: ${name}`)
      } catch (error) {
        console.error(`Error in background job ${name}:`, error)
      }
    }, interval)

    this.jobs.set(name, job)
    console.log(`Scheduled background job: ${name} (interval: ${interval}ms)`)
  }

  static stopJob(name: string): void {
    const job = this.jobs.get(name)
    if (job) {
      clearInterval(job)
      this.jobs.delete(name)
      console.log(`Stopped background job: ${name}`)
    }
  }

  static stopAllJobs(): void {
    for (const [name, job] of this.jobs.entries()) {
      clearInterval(job)
      console.log(`Stopped background job: ${name}`)
    }
    this.jobs.clear()
    this.isInitialized = false
  }

  // Job implementations
  private static async cleanupExpiredNotifications(): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // Keep notifications for 30 days

    const result = await prisma.notification.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date()
            }
          },
          {
            AND: [
              { read: true },
              { createdAt: { lt: cutoffDate } }
            ]
          }
        ]
      }
    })

    console.log(`Cleaned up ${result.count} expired/old notifications`)
  }

  private static async archiveOldActivityLogs(): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 6) // Archive logs older than 6 months

    // In a production environment, you might want to move these to an archive table
    // For now, we'll just delete very old logs
    const veryOldCutoff = new Date()
    veryOldCutoff.setFullYear(veryOldCutoff.getFullYear() - 2) // Delete logs older than 2 years

    const result = await prisma.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: veryOldCutoff
        }
      }
    })

    console.log(`Archived/deleted ${result.count} old activity logs`)
  }

  private static async cleanupExpiredReservations(): Promise<void> {
    const result = await prisma.stockReservation.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    console.log(`Cleaned up ${result.count} expired stock reservations`)
  }

  private static async cleanupCache(): Promise<void> {
    // Clean up memory cache
    CacheManager.cleanupMemoryCache()
    console.log('Cleaned up memory cache')
  }

  private static async collectPerformanceMetrics(): Promise<void> {
    try {
      // Collect basic performance metrics
      const metrics = {
        timestamp: new Date(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        // Add more metrics as needed
      }

      // Store metrics in cache for monitoring dashboard
      await CacheManager.set('performance:latest', metrics, { ttl: 300 }) // 5 minutes

      // You could also store historical metrics in database or send to monitoring service
    } catch (error) {
      console.error('Error collecting performance metrics:', error)
    }
  }

  static getJobStatus(): Record<string, { running: boolean; interval: number }> {
    const status: Record<string, { running: boolean; interval: number }> = {}
    
    for (const [name] of this.jobs.entries()) {
      status[name] = {
        running: true,
        interval: 0 // You'd need to store this if you want to report it
      }
    }

    return status
  }
}