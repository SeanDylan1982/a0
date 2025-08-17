import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SocketBroadcaster } from '../socket-server'
import { NotificationType, UserRole } from '@prisma/client'

describe('SocketBroadcaster', () => {
  const mockIo = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    SocketBroadcaster.setIO(mockIo as any)
  })

  describe('broadcastActivity', () => {
    it('should broadcast activity to module-specific channel', () => {
      const activity = {
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

      SocketBroadcaster.broadcastActivity(activity)

      expect(mockIo.to).toHaveBeenCalledWith('activities:inventory')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:new', activity)
    })

    it('should broadcast important activities to management', () => {
      const activity = {
        id: 'activity-456',
        userId: 'user-789',
        module: 'sales',
        action: 'create',
        entityType: 'invoice',
        entityName: 'INV-001',
        timestamp: new Date(),
        user: {
          name: 'Sales User',
          email: 'sales@example.com',
          role: UserRole.SALES_REP
        }
      }

      SocketBroadcaster.broadcastActivity(activity)

      expect(mockIo.to).toHaveBeenCalledWith('activities:sales')
      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:new', activity)
    })

    it('should broadcast critical activities to directors', () => {
      const activity = {
        id: 'activity-789',
        userId: 'user-123',
        module: 'accounting',
        action: 'delete',
        entityType: 'transaction',
        entityName: 'TXN-001',
        timestamp: new Date(),
        user: {
          name: 'Accountant',
          email: 'accountant@example.com',
          role: UserRole.ACCOUNTANT
        }
      }

      SocketBroadcaster.broadcastActivity(activity)

      expect(mockIo.to).toHaveBeenCalledWith('directors')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:critical', activity)
    })
  })

  describe('broadcastNotification', () => {
    it('should broadcast notification to specific user', () => {
      const notification = {
        id: 'notification-123',
        userId: 'user-456',
        type: NotificationType.INVENTORY_ALERT,
        title: 'Low Stock Alert',
        message: 'Product XYZ is running low',
        priority: 'HIGH',
        createdAt: new Date()
      }

      SocketBroadcaster.broadcastNotification(notification)

      expect(mockIo.to).toHaveBeenCalledWith('user:user-456')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:new', notification)
    })

    it('should broadcast to notification type channel', () => {
      const notification = {
        id: 'notification-456',
        userId: 'user-789',
        type: NotificationType.SYSTEM,
        title: 'System Update',
        message: 'System will be updated tonight',
        priority: 'MEDIUM',
        createdAt: new Date()
      }

      SocketBroadcaster.broadcastNotification(notification)

      expect(mockIo.to).toHaveBeenCalledWith('notifications:system')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:broadcast', {
        ...notification,
        userId: undefined
      })
    })
  })

  describe('broadcastInventoryAlert', () => {
    it('should broadcast alert to inventory and management channels', () => {
      const alert = {
        productId: 'product-123',
        productName: 'Test Product',
        currentStock: 5,
        minimumStock: 10,
        alertType: 'LOW_STOCK' as const,
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastInventoryAlert(alert)

      expect(mockIo.to).toHaveBeenCalledWith('inventory')
      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:alert', alert)
    })

    it('should broadcast critical alerts to directors', () => {
      const alert = {
        productId: 'product-456',
        productName: 'Critical Product',
        currentStock: 0,
        minimumStock: 5,
        alertType: 'CRITICAL' as const,
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastInventoryAlert(alert)

      expect(mockIo.to).toHaveBeenCalledWith('directors')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:critical', alert)
    })

    it('should broadcast to specific product subscribers', () => {
      const alert = {
        productId: 'product-789',
        productName: 'Specific Product',
        currentStock: 2,
        minimumStock: 10,
        alertType: 'LOW_STOCK' as const,
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastInventoryAlert(alert)

      expect(mockIo.to).toHaveBeenCalledWith('inventory:product:product-789')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:product:alert', alert)
    })
  })

  describe('broadcastStockMovement', () => {
    it('should broadcast movement to inventory channel', () => {
      const movement = {
        id: 'movement-123',
        productId: 'product-456',
        productName: 'Test Product',
        type: 'SALE',
        quantity: 10,
        beforeQty: 50,
        afterQty: 40,
        reason: 'Customer purchase',
        userId: 'user-789',
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastStockMovement(movement)

      expect(mockIo.to).toHaveBeenCalledWith('inventory')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:movement', movement)
    })

    it('should broadcast large movements to management', () => {
      const movement = {
        id: 'movement-456',
        productId: 'product-789',
        productName: 'Bulk Product',
        type: 'PURCHASE',
        quantity: 150, // Large quantity
        beforeQty: 100,
        afterQty: 250,
        reason: 'Bulk purchase',
        userId: 'user-123',
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastStockMovement(movement)

      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:large-movement', movement)
    })

    it('should broadcast to specific product subscribers', () => {
      const movement = {
        id: 'movement-789',
        productId: 'product-123',
        productName: 'Tracked Product',
        type: 'ADJUSTMENT',
        quantity: 5,
        beforeQty: 20,
        afterQty: 15,
        reason: 'Damage',
        userId: 'user-456',
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastStockMovement(movement)

      expect(mockIo.to).toHaveBeenCalledWith('inventory:product:product-123')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:product:movement', movement)
    })
  })

  describe('broadcastSystemMessage', () => {
    it('should broadcast system message to all users', () => {
      const message = {
        type: 'warning' as const,
        title: 'System Maintenance',
        message: 'System will be down for maintenance',
        data: { scheduledTime: '2024-01-01T02:00:00Z' }
      }

      SocketBroadcaster.broadcastSystemMessage(message)

      expect(mockIo.to).toHaveBeenCalledWith('all')
      expect(mockIo.emit).toHaveBeenCalledWith('system:message', {
        ...message,
        timestamp: expect.any(String)
      })
    })
  })

  describe('sendNotificationCountUpdate', () => {
    it('should send count update to specific user', () => {
      const userId = 'user-123'
      const counts = {
        [NotificationType.INVENTORY_ALERT]: 5,
        [NotificationType.SYSTEM]: 2,
        [NotificationType.MESSAGE]: 10,
        [NotificationType.CALENDAR_REMINDER]: 3,
        [NotificationType.NOTICE_BOARD]: 1,
        [NotificationType.ACTIVITY]: 0
      }

      SocketBroadcaster.sendNotificationCountUpdate(userId, counts)

      expect(mockIo.to).toHaveBeenCalledWith('user:user-123')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:counts', counts)
    })
  })

  describe('getConnectedUsersStats', () => {
    it('should return stats with all roles initialized to 0', () => {
      const stats = SocketBroadcaster.getConnectedUsersStats()

      Object.values(UserRole).forEach(role => {
        expect(stats[role]).toBe(0)
      })
    })
  })

  describe('error handling', () => {
    it('should handle missing io instance gracefully', () => {
      SocketBroadcaster.setIO(null as any)

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
    })
  })
})