import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SocketBroadcaster } from '../socket-server'
import { NotificationType, UserRole } from '@prisma/client'

describe('Socket Event Broadcasting', () => {
  const mockIo = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    SocketBroadcaster.setIO(mockIo as any)
  })

  describe('Real-time Activity Broadcasting', () => {
    it('should broadcast inventory activities to inventory managers', () => {
      const inventoryActivity = {
        id: 'activity-inv-001',
        userId: 'user-123',
        module: 'inventory',
        action: 'update',
        entityType: 'product',
        entityName: 'Widget A',
        timestamp: new Date(),
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.INVENTORY_MANAGER
        }
      }

      SocketBroadcaster.broadcastActivity(inventoryActivity)

      // Should broadcast to inventory-specific channel
      expect(mockIo.to).toHaveBeenCalledWith('activities:inventory')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:new', inventoryActivity)

      // Should also broadcast to management since it's inventory
      expect(mockIo.to).toHaveBeenCalledWith('management')
    })

    it('should broadcast critical delete actions to directors', () => {
      const criticalActivity = {
        id: 'activity-crit-001',
        userId: 'user-456',
        module: 'accounting',
        action: 'delete',
        entityType: 'transaction',
        entityName: 'TXN-12345',
        timestamp: new Date(),
        user: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: UserRole.ACCOUNTANT
        }
      }

      SocketBroadcaster.broadcastActivity(criticalActivity)

      // Should broadcast to directors for critical actions
      expect(mockIo.to).toHaveBeenCalledWith('directors')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:critical', criticalActivity)
    })

    it('should broadcast sales activities to sales and management channels', () => {
      const salesActivity = {
        id: 'activity-sales-001',
        userId: 'user-789',
        module: 'sales',
        action: 'create',
        entityType: 'invoice',
        entityName: 'INV-2024-001',
        timestamp: new Date(),
        user: {
          name: 'Bob Wilson',
          email: 'bob@example.com',
          role: UserRole.SALES_REP
        }
      }

      SocketBroadcaster.broadcastActivity(salesActivity)

      expect(mockIo.to).toHaveBeenCalledWith('activities:sales')
      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.emit).toHaveBeenCalledWith('activity:new', salesActivity)
    })
  })

  describe('Real-time Notification Broadcasting', () => {
    it('should broadcast inventory alerts to specific users and channels', () => {
      const inventoryNotification = {
        id: 'notif-inv-001',
        userId: 'inventory-manager-123',
        type: NotificationType.INVENTORY_ALERT,
        title: 'Low Stock Alert',
        message: 'Widget A stock is below minimum threshold',
        priority: 'HIGH',
        data: { productId: 'prod-123', currentStock: 5, minStock: 10 },
        createdAt: new Date()
      }

      SocketBroadcaster.broadcastNotification(inventoryNotification)

      // Should send to specific user
      expect(mockIo.to).toHaveBeenCalledWith('user:inventory-manager-123')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:new', inventoryNotification)

      // Should also broadcast to inventory notification channel
      expect(mockIo.to).toHaveBeenCalledWith('notifications:inventory')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:broadcast', {
        ...inventoryNotification,
        userId: undefined // Privacy: don't expose userId in broadcast
      })
    })

    it('should broadcast system notifications to all users', () => {
      const systemNotification = {
        id: 'notif-sys-001',
        userId: 'admin-456',
        type: NotificationType.SYSTEM,
        title: 'System Maintenance',
        message: 'System will be down for maintenance from 2-4 AM',
        priority: 'MEDIUM',
        data: { maintenanceWindow: '2024-01-15T02:00:00Z' },
        createdAt: new Date()
      }

      SocketBroadcaster.broadcastNotification(systemNotification)

      expect(mockIo.to).toHaveBeenCalledWith('user:admin-456')
      expect(mockIo.to).toHaveBeenCalledWith('notifications:system')
    })

    it('should broadcast calendar reminders to calendar channel', () => {
      const calendarNotification = {
        id: 'notif-cal-001',
        userId: 'user-789',
        type: NotificationType.CALENDAR_REMINDER,
        title: 'Meeting Reminder',
        message: 'Team standup in 15 minutes',
        priority: 'MEDIUM',
        data: { eventId: 'event-123', startTime: '2024-01-15T09:00:00Z' },
        createdAt: new Date()
      }

      SocketBroadcaster.broadcastNotification(calendarNotification)

      expect(mockIo.to).toHaveBeenCalledWith('notifications:calendar')
    })
  })

  describe('Real-time Inventory Broadcasting', () => {
    it('should broadcast low stock alerts to inventory and management', () => {
      const lowStockAlert = {
        productId: 'prod-123',
        productName: 'Widget A',
        currentStock: 5,
        minimumStock: 10,
        alertType: 'LOW_STOCK' as const,
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastInventoryAlert(lowStockAlert)

      expect(mockIo.to).toHaveBeenCalledWith('inventory')
      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:alert', lowStockAlert)

      // Should also broadcast to product-specific subscribers
      expect(mockIo.to).toHaveBeenCalledWith('inventory:product:prod-123')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:product:alert', lowStockAlert)
    })

    it('should broadcast critical stock alerts to directors', () => {
      const criticalAlert = {
        productId: 'prod-456',
        productName: 'Critical Component',
        currentStock: 0,
        minimumStock: 5,
        alertType: 'CRITICAL' as const,
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastInventoryAlert(criticalAlert)

      expect(mockIo.to).toHaveBeenCalledWith('directors')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:critical', criticalAlert)
    })

    it('should broadcast stock movements to inventory channel', () => {
      const stockMovement = {
        id: 'movement-123',
        productId: 'prod-789',
        productName: 'Widget B',
        type: 'SALE',
        quantity: 25,
        beforeQty: 100,
        afterQty: 75,
        reason: 'Customer order #12345',
        userId: 'sales-rep-456',
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastStockMovement(stockMovement)

      expect(mockIo.to).toHaveBeenCalledWith('inventory')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:movement', stockMovement)

      expect(mockIo.to).toHaveBeenCalledWith('inventory:product:prod-789')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:product:movement', stockMovement)
    })

    it('should broadcast large stock movements to management', () => {
      const largeMovement = {
        id: 'movement-456',
        productId: 'prod-bulk',
        productName: 'Bulk Item',
        type: 'PURCHASE',
        quantity: 500, // Large quantity
        beforeQty: 100,
        afterQty: 600,
        reason: 'Bulk supplier order',
        userId: 'inventory-manager-123',
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastStockMovement(largeMovement)

      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory:large-movement', largeMovement)
    })
  })

  describe('System-wide Broadcasting', () => {
    it('should broadcast system messages to all connected users', () => {
      const systemMessage = {
        type: 'warning' as const,
        title: 'Server Maintenance',
        message: 'Scheduled maintenance will begin in 30 minutes',
        data: { 
          scheduledTime: '2024-01-15T02:00:00Z',
          estimatedDuration: '2 hours'
        }
      }

      SocketBroadcaster.broadcastSystemMessage(systemMessage)

      expect(mockIo.to).toHaveBeenCalledWith('all')
      expect(mockIo.emit).toHaveBeenCalledWith('system:message', {
        ...systemMessage,
        timestamp: expect.any(String)
      })
    })

    it('should send notification count updates to specific users', () => {
      const userId = 'user-123'
      const notificationCounts = {
        [NotificationType.INVENTORY_ALERT]: 3,
        [NotificationType.SYSTEM]: 1,
        [NotificationType.MESSAGE]: 7,
        [NotificationType.CALENDAR_REMINDER]: 2,
        [NotificationType.NOTICE_BOARD]: 0,
        [NotificationType.ACTIVITY]: 5
      }

      SocketBroadcaster.sendNotificationCountUpdate(userId, notificationCounts)

      expect(mockIo.to).toHaveBeenCalledWith('user:user-123')
      expect(mockIo.emit).toHaveBeenCalledWith('notification:counts', notificationCounts)
    })
  })

  describe('Role-based Channel Broadcasting', () => {
    it('should respect role-based channel restrictions', () => {
      // Test that management activities reach management channel
      const managementActivity = {
        id: 'activity-mgmt-001',
        userId: 'manager-123',
        module: 'accounting',
        action: 'approve',
        entityType: 'expense',
        entityName: 'EXP-2024-001',
        timestamp: new Date(),
        user: {
          name: 'Manager',
          email: 'manager@example.com',
          role: UserRole.MANAGER
        }
      }

      SocketBroadcaster.broadcastActivity(managementActivity)

      // Should broadcast to accounting activities and management
      expect(mockIo.to).toHaveBeenCalledWith('activities:accounting')
      expect(mockIo.to).toHaveBeenCalledWith('management')
    })

    it('should broadcast critical inventory alerts to multiple role channels', () => {
      const criticalInventoryAlert = {
        productId: 'prod-critical',
        productName: 'Essential Component',
        currentStock: 0,
        minimumStock: 20,
        alertType: 'CRITICAL' as const,
        timestamp: new Date()
      }

      SocketBroadcaster.broadcastInventoryAlert(criticalInventoryAlert)

      // Should reach inventory managers, management, and directors
      expect(mockIo.to).toHaveBeenCalledWith('inventory')
      expect(mockIo.to).toHaveBeenCalledWith('management')
      expect(mockIo.to).toHaveBeenCalledWith('directors')
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle missing socket.io instance gracefully', () => {
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
        SocketBroadcaster.broadcastSystemMessage({
          type: 'info',
          title: 'Test',
          message: 'Test message'
        })
      }).not.toThrow()
    })

    it('should continue functioning after socket errors', () => {
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
})