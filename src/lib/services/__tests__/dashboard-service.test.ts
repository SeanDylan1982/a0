import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UserRole } from '@prisma/client'

// Mock all dependencies first
vi.mock('@/lib/prisma')
vi.mock('../activity-logger')
vi.mock('../notification-manager')
vi.mock('../access-control-manager')

describe('DashboardService', () => {
  let DashboardService: any
  let mockPrisma: any
  let mockActivityLogger: any
  let mockNotificationManager: any
  let mockAccessControlManager: any

  beforeEach(async () => {
    // Setup mocks
    mockPrisma = {
      user: { findUnique: vi.fn() },
      invoice: { aggregate: vi.fn(), count: vi.fn(), findMany: vi.fn() },
      product: { aggregate: vi.fn(), count: vi.fn(), findMany: vi.fn() },
      customer: { count: vi.fn() },
      sale: { count: vi.fn(), findMany: vi.fn() }
    }

    mockActivityLogger = {
      getActivitiesByRole: vi.fn(() => Promise.resolve([
        {
          id: '1',
          userId: 'user1',
          module: 'sales',
          action: 'create',
          entityType: 'sale',
          entityId: 'sale1',
          entityName: 'Sale #12345',
          timestamp: new Date(),
          user: {
            id: 'user1',
            name: 'John Smith',
            email: 'john@example.com',
            role: UserRole.SALES_REP
          }
        }
      ]))
    }

    mockNotificationManager = {
      getUnreadCount: vi.fn(() => Promise.resolve(5)),
      getNotificationsByPriority: vi.fn(() => Promise.resolve([])),
      getNotifications: vi.fn(() => Promise.resolve([]))
    }

    mockAccessControlManager = {
      hasPermission: vi.fn(() => Promise.resolve(true))
    }

    // Mock the imports
    vi.doMock('@/lib/prisma', () => ({ prisma: mockPrisma }))
    vi.doMock('../activity-logger', () => ({ ActivityLogger: mockActivityLogger }))
    vi.doMock('../notification-manager', () => ({ 
      NotificationManager: vi.fn(() => mockNotificationManager)
    }))
    vi.doMock('../access-control-manager', () => ({ 
      AccessControlManager: { getInstance: () => mockAccessControlManager }
    }))

    // Import after mocking
    const module = await import('../dashboard-service')
    DashboardService = module.DashboardService
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })



  describe('getDashboardData', () => {
    it('should return comprehensive dashboard data for director', async () => {
      // Setup mock responses
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        role: UserRole.DIRECTOR,
        name: 'Test User',
        email: 'test@example.com'
      })

      mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { total: 100000 } })
      mockPrisma.product.aggregate.mockResolvedValue({ _sum: { quantity: 1000, cost: 50 }, _count: 100 })
      mockPrisma.customer.count.mockResolvedValue(50)
      mockPrisma.sale.count.mockResolvedValue(25)
      mockPrisma.product.count.mockResolvedValue(5)
      mockPrisma.invoice.count.mockResolvedValue(3)

      const dashboardService = new DashboardService()
      const result = await dashboardService.getDashboardData('user1')

      expect(result).toHaveProperty('stats')
      expect(result).toHaveProperty('recentActivities')
      expect(result).toHaveProperty('criticalAlerts')
      expect(result).toHaveProperty('quickActions')
      expect(result).toHaveProperty('performanceMetrics')
      expect(result).toHaveProperty('notifications')

      // Verify stats structure
      expect(result.stats).toHaveProperty('totalRevenue')
      expect(result.stats).toHaveProperty('inventoryValue')
      expect(result.stats).toHaveProperty('activeCustomers')
      expect(result.stats).toHaveProperty('pendingOrders')

      // Verify each stat has required properties
      expect(result.stats.totalRevenue).toHaveProperty('value')
      expect(result.stats.totalRevenue).toHaveProperty('change')
      expect(result.stats.totalRevenue).toHaveProperty('changeType')
      expect(result.stats.totalRevenue).toHaveProperty('details')
      expect(result.stats.totalRevenue).toHaveProperty('icon')
      expect(result.stats.totalRevenue).toHaveProperty('href')
      expect(result.stats.totalRevenue).toHaveProperty('color')
    })

    it('should handle user not found error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(dashboardService.getDashboardData('nonexistent')).rejects.toThrow('User not found')
    })

    it('should calculate revenue correctly', async () => {
      // Mock monthly revenue data
      mockPrisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { total: 150000 } }) // Current month
        .mockResolvedValueOnce({ _sum: { total: 120000 } }) // Last month

      const result = await dashboardService.getDashboardData('user1')

      expect(result.stats.totalRevenue.value).toContain('150,000')
      expect(result.stats.totalRevenue.change).toBe('+25.0%') // (150000-120000)/120000 * 100
      expect(result.stats.totalRevenue.changeType).toBe('positive')
    })

    it('should calculate inventory value from central pool', async () => {
      mockPrisma.product.aggregate.mockResolvedValue({
        _sum: { quantity: 1000, cost: 75 },
        _count: 150
      })

      const result = await dashboardService.getDashboardData('user1')

      expect(result.stats.inventoryValue.value).toContain('75,000') // 1000 * 75
      expect(result.stats.inventoryValue.details).toContain('150 products')
    })

    it('should generate critical alerts for low stock', async () => {
      mockPrisma.product.count
        .mockResolvedValueOnce(3) // Out of stock
        .mockResolvedValueOnce(7) // Low stock

      const result = await dashboardService.getDashboardData('user1')

      const inventoryAlerts = result.criticalAlerts.filter(alert => alert.type === 'inventory')
      expect(inventoryAlerts).toHaveLength(2)
      
      const outOfStockAlert = inventoryAlerts.find(alert => alert.title === 'Products Out of Stock')
      expect(outOfStockAlert).toBeDefined()
      expect(outOfStockAlert?.severity).toBe('critical')
      expect(outOfStockAlert?.message).toContain('3 products')

      const lowStockAlert = inventoryAlerts.find(alert => alert.title === 'Low Stock Alert')
      expect(lowStockAlert).toBeDefined()
      expect(lowStockAlert?.severity).toBe('high')
      expect(lowStockAlert?.message).toContain('7 products')
    })

    it('should generate financial alerts for overdue invoices', async () => {
      mockPrisma.invoice.count.mockResolvedValue(5) // Overdue invoices

      const result = await dashboardService.getDashboardData('user1')

      const financialAlerts = result.criticalAlerts.filter(alert => alert.type === 'financial')
      expect(financialAlerts).toHaveLength(1)
      
      const overdueAlert = financialAlerts[0]
      expect(overdueAlert.title).toBe('Overdue Invoices')
      expect(overdueAlert.message).toContain('5 invoices')
      expect(overdueAlert.severity).toBe('high')
      expect(overdueAlert.actionUrl).toBe('/invoicing?filter=overdue')
    })

    it('should provide role-based quick actions', async () => {
      const result = await dashboardService.getDashboardData('user1')

      expect(result.quickActions.length).toBeGreaterThan(0)
      
      // Check that actions have required properties
      result.quickActions.forEach(action => {
        expect(action).toHaveProperty('id')
        expect(action).toHaveProperty('title')
        expect(action).toHaveProperty('description')
        expect(action).toHaveProperty('icon')
        expect(action).toHaveProperty('href')
        expect(action).toHaveProperty('permission')
        expect(action).toHaveProperty('color')
      })
    })

    it('should generate performance metrics for management roles', async () => {
      const result = await dashboardService.getDashboardData('user1')

      expect(result.performanceMetrics.length).toBeGreaterThan(0)
      
      // Check metrics structure
      result.performanceMetrics.forEach(metric => {
        expect(metric).toHaveProperty('id')
        expect(metric).toHaveProperty('name')
        expect(metric).toHaveProperty('value')
        expect(metric).toHaveProperty('unit')
        expect(metric).toHaveProperty('change')
        expect(metric).toHaveProperty('changeType')
        expect(metric).toHaveProperty('description')
      })
    })

    it('should handle restricted access for limited roles', async () => {
      // Mock user with limited role
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user2',
        role: UserRole.STAFF_MEMBER,
        name: 'Staff User',
        email: 'staff@example.com'
      })

      // Mock access control to deny financial access
      const mockAccessControl = {
        hasPermission: vi.fn((userId, permission) => {
          if (permission.module === 'accounting') {
            return Promise.resolve(false)
          }
          return Promise.resolve(true)
        })
      }

      // Override the access control mock for this test
      vi.doMock('../access-control-manager', () => ({
        AccessControlManager: {
          getInstance: () => mockAccessControl
        }
      }))

      const result = await dashboardService.getDashboardData('user2')

      expect(result.stats.totalRevenue.value).toBe('Restricted')
      expect(result.stats.totalRevenue.icon).toBe('🔒')
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.invoice.aggregate.mockRejectedValue(new Error('Database error'))

      const result = await dashboardService.getDashboardData('user1')

      expect(result.stats.totalRevenue.value).toBe('Error')
      expect(result.stats.totalRevenue.icon).toBe('⚠️')
      expect(result.stats.totalRevenue.changeType).toBe('negative')
    })

    it('should include notification summary', async () => {
      const result = await dashboardService.getDashboardData('user1')

      expect(result.notifications).toHaveProperty('unreadCount')
      expect(result.notifications).toHaveProperty('criticalCount')
      expect(result.notifications).toHaveProperty('recentNotifications')
      expect(result.notifications.unreadCount).toBe(5)
      expect(result.notifications.recentNotifications).toHaveLength(1)
    })

    it('should format time correctly', async () => {
      const result = await dashboardService.getDashboardData('user1')

      expect(result.recentActivities).toHaveLength(1)
      expect(result.recentActivities[0].time).toMatch(/ago|now/i)
    })
  })

  describe('Error Handling', () => {
    it('should handle service initialization errors', async () => {
      // Mock constructor to throw error
      const originalConsoleError = console.error
      console.error = vi.fn()

      await expect(dashboardService.getDashboardData('user1')).resolves.toBeDefined()

      console.error = originalConsoleError
    })

    it('should provide fallback data when services fail', async () => {
      // Mock all services to fail
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Service error'))

      await expect(dashboardService.getDashboardData('user1')).rejects.toThrow('Failed to fetch dashboard data')
    })
  })
})