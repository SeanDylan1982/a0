import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SocketBroadcaster } from '../socket-server'
import { NotificationType, UserRole, StockMovementType } from '@prisma/client'

describe('Socket.IO Real-time Integration', () => {
  const mockIo = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    SocketBroadcaster.setIO(mockIo as any)
  })

  describe('Activity Broadcasting Integration', () => {
    it('should broadcast activities to correct channels', async () => {
      const inventoryActivity = {
        id: 'activity-123',
        userId: 'user-456',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityName: 'Test Product',
        timestamp: new Date(),
        user: {
          name: 'Test User',
          email: 'test@example.com',
          role: UserRole.INVENTORY_MANAGER
        }
      }

      SocketBroadcaster.broadcastActivity(inventoryActivity)

      // Verify the broadcast was called
      expect(mockIo.to).toHaveBeenCalledWith('activities:inventory')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:new', inventoryActivity)
      
      // Should also broadcast to management since it's inventory
      expect(mockIo.to).toHaveBeenCalledWith('management')
    })

    it('should broadcast critical activities to directors', async () => {
      const criticalActivity = {
        id: 'activity-456',
        userId: 'user-123',
        module: 'accounting',
        action: 'delete',
        entityType: 'transaction',
        entityName: 'Important Transaction',
        timestamp: new Date(),
        user: {
          name: 'Accountant',
          email: 'accountant@example.com',
          role: UserRole.ACCOUNTANT
        }
      }

      SocketBroadcaster.broadcastActivity(criticalActivity)

      // Should broadcast to directors for critical delete actions
      expect(mockIo.to).toHaveBeenCalledWith('directors')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:critical', criticalActivity)
    })
  })

  describe('Notification System Integration', () => {
    it('should broadcast notifications to user and type channels', async () => {
      const inventoryNotification = {
        id: 'notif-123',
        userId: 'user-456',
        type: NotificationType.INVENTORY_ALERT,
        title: 'Low Stock Alert',
        message: 'Product XYZ is running low',
        priority: 'HIGH',
        data: { productId: 'prod-123' },
        createdAt: new Date()
      }

      SocketBroadcaster.broadcastNotification(inventoryNotification)

      // Verify socket broadcast to user
      expect(mockIo.to).toHaveBeenCalledWith('user:user-456')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:new', inventoryNotification)

      // Verify broadcast to notification type channel
      expect(mockIo.to).toHaveBeenCalledWith('notifications:inventory')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:broadcast', expect.objectContaining({
        type: NotificationType.INVENTORY_ALERT,
        title: 'Low Stock Alert',
        userId: undefined // Should not expose userId in broadcast
      }))
    })

    it('should broadcast to notification type channels', async () => {
      const systemNotification = {
        id: 'notif-sys-001',
        userId: 'admin-123',
        type: NotificationType.SYSTEM,
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight',
        priority: 'MEDIUM',
        createdAt: new Date()
      }

      SocketBroadcaster.broadcastNotification(systemNotification)

      expect(mockIo.to).toHaveBeenCalledWith('notifications:system')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:broadcast', expect.objectContaining({
        type: NotificationType.SYSTEM,
        title: 'System Maintenance',
        userId: undefined // Should not expose userId in broadcast
      }))
    })
  })

  describe('Inventory Broadcasting Integration', () => {
    it('should broadcast stock movements to correct channels', async () => {
      const stockMovement = {
        id: 'movement-123',
        productId: 'product-456',
        productName: 'Test Product',
        type: 'SALE',
        quantity: 10,
        beforeQty: 100,
        afterQty: 90,
        reason: 'Customer order',
        userId: 'user-789',
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastStockMovement(stockMovement)

      // Verify broadcasts
      expect(mockIo.to).toHaveBeenCalledWith('inventory')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:movement', stockMovement)

      expect(mockIo.to).toHaveBeenCalledWith('inventory:product:product-456')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:product:movement', stockMovement)
    })

    it('should broadcast inventory alerts for low stock', async () => {
      const lowStockAlert = {
        productId: 'product-123',
        productName: 'Critical Component',
        currentStock: 2,
        minimumStock: 10,
        alertType: 'LOW_STOCK' as const,
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastInventoryAlert(lowStockAlert)

      // Should broadcast to inventory managers and management
      expect(mockIo.to).toHaveBeenCalledWith('inventory')
      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:alert', lowStockAlert)

      // Should also broadcast to product-specific subscribers
      expect(mockIo.to).toHaveBeenCalledWith('inventory:product:product-123')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:product:alert', lowStockAlert)
    })

    it('should broadcast critical alerts to directors', async () => {
      const criticalAlert = {
        productId: 'product-critical',
        productName: 'Essential Item',
        currentStock: 0,
        minimumStock: 5,
        alertType: 'CRITICAL' as const,
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastInventoryAlert(criticalAlert)

      // Critical alerts should reach directors
      expect(mockIo.to).toHaveBeenCalledWith('directors')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:critical', criticalAlert)
    })
  })

  describe('Role-based Channel Broadcasting', () => {
    it('should respect role hierarchy in activity broadcasting', async () => {
      // Test management-level activity
      const managementActivity = {
        id: 'activity-mgmt-001',
        userId: 'manager-123',
        module: 'sales',
        action: 'approve',
        entityType: 'quote',
        entityName: 'Large Customer Quote',
        timestamp: new Date(),
        user: {
          name: 'Sales Manager',
          email: 'manager@example.com',
          role: UserRole.MANAGER
        }
      }

      SocketBroadcaster.broadcastActivity(managementActivity)

      // Should broadcast to sales channel and management
      expect(mockIo.to).toHaveBeenCalledWith('activities:sales')
      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:new', managementActivity)
    })

    it('should broadcast system-wide messages to all users', async () => {
      const systemMessage = {
        type: 'warning' as const,
        title: 'Scheduled Maintenance',
        message: 'System will be unavailable from 2-4 AM for maintenance',
        data: {
          maintenanceWindow: '2024-01-15T02:00:00Z',
          estimatedDuration: '2 hours'
        }
      }

      SocketBroadcaster.broadcastSystemMessage(systemMessage)

      expect(mockIo.to).toHaveBeenCalledWith('all')
      expect(mockIo.emit).toHaveBeenCalledWith('system:message', expect.objectContaining({
        type: 'warning',
        title: 'Scheduled Maintenance',
        timestamp: expect.any(String)
      }))
    })
  })

  describe('Real-time Notification Counts', () => {
    it('should send notification count updates to specific users', async () => {
      const userId = 'user-123'
      const notificationCounts = {
        [NotificationType.INVENTORY_ALERT]: 5,
        [NotificationType.SYSTEM]: 2,
        [NotificationType.MESSAGE]: 12,
        [NotificationType.CALENDAR_REMINDER]: 3,
        [NotificationType.NOTICE_BOARD]: 1,
        [NotificationType.ACTIVITY]: 8
      }

      SocketBroadcaster.sendNotificationCountUpdate(userId, notificationCounts)

      expect(mockIo.to).toHaveBeenCalledWith('user:user-123')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:counts', notificationCounts)
    })
  })

  describe('Error Resilience', () => {
    it('should handle missing socket.io instance gracefully', async () => {
      SocketBroadcaster.setIO(null as any)

      // These should not throw errors
      expect(() => {
        SocketBroadcaster.broadcastActivity({
          id: 'test',
          userId: 'user',
          module: 'test',
          action: 'test',
          entityType: 'test',
          entityName: 'test',
          timestamp: new Date(),
          user: { name: 'test', email: 'test', role: UserRole.USER }
        })
      }).not.toThrow()

      expect(() => {
        SocketBroadcaster.broadcastNotification({
          id: 'test',
          userId: 'user',
          type: NotificationType.SYSTEM,
          title: 'test',
          message: 'test',
          priority: 'LOW',
          createdAt: new Date()
        })
      }).not.toThrow()

      expect(() => {
        SocketBroadcaster.broadcastSystemMessage({
          type: 'info',
          title: 'Test',
          message: 'Test message'
        })
      }).not.toThrow()
    })

    it('should continue functioning after socket errors', async () => {
      // Reset to working socket
      SocketBroadcaster.setIO(mockIo as any)

      const testActivity = {
        id: 'test-activity',
        userId: 'user-test',
        module: 'test',
        action: 'test',
        entityType: 'test',
        entityName: 'Test Entity',
        timestamp: new Date(),
        user: {
          name: 'Test User',
          email: 'test@example.com',
          role: UserRole.USER
        }
      }

      SocketBroadcaster.broadcastActivity(testActivity)

      expect(mockIo.to).toHaveBeenCalledWith('activities:test')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:new', testActivity)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle high-frequency broadcasts efficiently', async () => {
      const startTime = Date.now()
      
      // Simulate 100 rapid broadcasts
      for (let i = 0; i < 100; i++) {
        SocketBroadcaster.broadcastActivity({
          id: `activity-${i}`,
          userId: `user-${i}`,
          module: 'inventory',
          action: 'update',
          entityType: 'product',
          entityName: `Product ${i}`,
          timestamp: new Date(),
          user: {
            name: `User ${i}`,
            email: `user${i}@example.com`,
            role: UserRole.USER
          }
        })
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (less than 100ms for 100 broadcasts)
      expect(duration).toBeLessThan(100)
      
      // Should have made all the expected calls
      // Each activity broadcast calls mockIo.to twice (module + management channels)
      expect(mockIo.to).toHaveBeenCalledTimes(200)
      expect(mockIo.emit).toHaveBeenCalledTimes(200)
    })

    it('should handle concurrent broadcasts without conflicts', async () => {
      const promises = []
      
      // Create 50 concurrent broadcasts
      for (let i = 0; i < 50; i++) {
        promises.push(
          Promise.resolve().then(() => {
            SocketBroadcaster.broadcastNotification({
              id: `notif-${i}`,
              userId: `user-${i}`,
              type: NotificationType.ACTIVITY,
              title: `Notification ${i}`,
              message: `Message ${i}`,
              priority: 'MEDIUM',
              createdAt: new Date()
            })
          })
        )
      }
      
      // Wait for all to complete
      await Promise.all(promises)
      
      // All should have completed successfully
      expect(mockIo.to).toHaveBeenCalledTimes(100) // 50 user channels + 50 notification channels
      expect(mockIo.emit).toHaveBeenCalledTimes(100)
    })
  })
})