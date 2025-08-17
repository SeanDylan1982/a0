import { describe, it, expect, vi } from 'vitest'
import { UserRole } from '@prisma/client'
import {
  ACTIVITY_ACTIONS,
  MODULES,
  ENTITY_TYPES,
  logInventoryActivity,
  logSalesActivity,
  logCustomerActivity,
  canViewActivities,
  formatActivityDetails,
  getActivityIcon,
} from '../activity-utils'

// Mock the ActivityLogger
vi.mock('@/lib/services/activity-logger', () => ({
  ActivityLogger: {
    log: vi.fn(),
  },
}))

import { ActivityLogger } from '@/lib/services/activity-logger'

describe('Activity Utils', () => {
  describe('Constants', () => {
    it('should have correct activity actions', () => {
      expect(ACTIVITY_ACTIONS.CREATE).toBe('create')
      expect(ACTIVITY_ACTIONS.UPDATE).toBe('update')
      expect(ACTIVITY_ACTIONS.DELETE).toBe('delete')
      expect(ACTIVITY_ACTIONS.STOCK_IN).toBe('stock_in')
      expect(ACTIVITY_ACTIONS.STOCK_OUT).toBe('stock_out')
    })

    it('should have correct modules', () => {
      expect(MODULES.INVENTORY).toBe('inventory')
      expect(MODULES.SALES).toBe('sales')
      expect(MODULES.HR).toBe('hr')
      expect(MODULES.ACCOUNTING).toBe('accounting')
    })

    it('should have correct entity types', () => {
      expect(ENTITY_TYPES.PRODUCT).toBe('product')
      expect(ENTITY_TYPES.CUSTOMER).toBe('customer')
      expect(ENTITY_TYPES.SALE).toBe('sale')
      expect(ENTITY_TYPES.INVOICE).toBe('invoice')
    })
  })

  describe('logInventoryActivity', () => {
    it('should log inventory activity with correct parameters', async () => {
      const mockLog = vi.mocked(ActivityLogger.log)

      await logInventoryActivity(
        'user123',
        ACTIVITY_ACTIONS.STOCK_IN,
        'product123',
        'Test Product',
        { quantity: 10 },
        '192.168.1.1',
        'Mozilla/5.0'
      )

      expect(mockLog).toHaveBeenCalledWith({
        userId: 'user123',
        module: MODULES.INVENTORY,
        action: ACTIVITY_ACTIONS.STOCK_IN,
        entityType: ENTITY_TYPES.PRODUCT,
        entityId: 'product123',
        entityName: 'Test Product',
        details: { quantity: 10 },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })
    })

    it('should use empty details if not provided', async () => {
      const mockLog = vi.mocked(ActivityLogger.log)

      await logInventoryActivity(
        'user123',
        ACTIVITY_ACTIONS.CREATE,
        'product123',
        'Test Product'
      )

      expect(mockLog).toHaveBeenCalledWith({
        userId: 'user123',
        module: MODULES.INVENTORY,
        action: ACTIVITY_ACTIONS.CREATE,
        entityType: ENTITY_TYPES.PRODUCT,
        entityId: 'product123',
        entityName: 'Test Product',
        details: {},
        ipAddress: undefined,
        userAgent: undefined,
      })
    })
  })

  describe('logSalesActivity', () => {
    it('should log sales activity with correct parameters', async () => {
      const mockLog = vi.mocked(ActivityLogger.log)

      await logSalesActivity(
        'user123',
        ACTIVITY_ACTIONS.CREATE,
        'sale123',
        'John Doe',
        { amount: 1000 }
      )

      expect(mockLog).toHaveBeenCalledWith({
        userId: 'user123',
        module: MODULES.SALES,
        action: ACTIVITY_ACTIONS.CREATE,
        entityType: ENTITY_TYPES.SALE,
        entityId: 'sale123',
        entityName: 'Sale to John Doe',
        details: { amount: 1000 },
        ipAddress: undefined,
        userAgent: undefined,
      })
    })
  })

  describe('logCustomerActivity', () => {
    it('should log customer activity with correct parameters', async () => {
      const mockLog = vi.mocked(ActivityLogger.log)

      await logCustomerActivity(
        'user123',
        ACTIVITY_ACTIONS.UPDATE,
        'customer123',
        'Jane Smith',
        { email: 'jane@example.com' }
      )

      expect(mockLog).toHaveBeenCalledWith({
        userId: 'user123',
        module: MODULES.CUSTOMERS,
        action: ACTIVITY_ACTIONS.UPDATE,
        entityType: ENTITY_TYPES.CUSTOMER,
        entityId: 'customer123',
        entityName: 'Jane Smith',
        details: { email: 'jane@example.com' },
        ipAddress: undefined,
        userAgent: undefined,
      })
    })
  })

  describe('canViewActivities', () => {
    it('should allow DIRECTOR to view all activities', () => {
      expect(canViewActivities(UserRole.DIRECTOR, MODULES.INVENTORY, 'other123', 'director123')).toBe(true)
      expect(canViewActivities(UserRole.DIRECTOR, MODULES.HR, 'other123', 'director123')).toBe(true)
    })

    it('should allow SALES_REP to view sales activities and own activities', () => {
      expect(canViewActivities(UserRole.SALES_REP, MODULES.SALES, 'other123', 'sales123')).toBe(true)
      expect(canViewActivities(UserRole.SALES_REP, MODULES.INVENTORY, 'sales123', 'sales123')).toBe(true)
      expect(canViewActivities(UserRole.SALES_REP, MODULES.INVENTORY, 'other123', 'sales123')).toBe(false)
    })

    it('should allow INVENTORY_MANAGER to view inventory activities and own activities', () => {
      expect(canViewActivities(UserRole.INVENTORY_MANAGER, MODULES.INVENTORY, 'other123', 'inv123')).toBe(true)
      expect(canViewActivities(UserRole.INVENTORY_MANAGER, MODULES.SALES, 'inv123', 'inv123')).toBe(true)
      expect(canViewActivities(UserRole.INVENTORY_MANAGER, MODULES.SALES, 'other123', 'inv123')).toBe(false)
    })

    it('should allow HR_STAFF to view HR activities and own activities', () => {
      expect(canViewActivities(UserRole.HR_STAFF, MODULES.HR, 'other123', 'hr123')).toBe(true)
      expect(canViewActivities(UserRole.HR_STAFF, MODULES.INVENTORY, 'hr123', 'hr123')).toBe(true)
      expect(canViewActivities(UserRole.HR_STAFF, MODULES.INVENTORY, 'other123', 'hr123')).toBe(false)
    })

    it('should allow ACCOUNTANT to view financial activities and own activities', () => {
      expect(canViewActivities(UserRole.ACCOUNTANT, MODULES.ACCOUNTING, 'other123', 'acc123')).toBe(true)
      expect(canViewActivities(UserRole.ACCOUNTANT, MODULES.INVOICING, 'other123', 'acc123')).toBe(true)
      expect(canViewActivities(UserRole.ACCOUNTANT, MODULES.SALES, 'other123', 'acc123')).toBe(true)
      expect(canViewActivities(UserRole.ACCOUNTANT, MODULES.INVENTORY, 'other123', 'acc123')).toBe(false)
      expect(canViewActivities(UserRole.ACCOUNTANT, MODULES.INVENTORY, 'acc123', 'acc123')).toBe(true)
    })

    it('should restrict STAFF_MEMBER to only own activities', () => {
      expect(canViewActivities(UserRole.STAFF_MEMBER, MODULES.INVENTORY, 'staff123', 'staff123')).toBe(true)
      expect(canViewActivities(UserRole.STAFF_MEMBER, MODULES.INVENTORY, 'other123', 'staff123')).toBe(false)
    })

    it('should restrict USER to only own activities', () => {
      expect(canViewActivities(UserRole.USER, MODULES.INVENTORY, 'user123', 'user123')).toBe(true)
      expect(canViewActivities(UserRole.USER, MODULES.INVENTORY, 'other123', 'user123')).toBe(false)
    })
  })

  describe('formatActivityDetails', () => {
    it('should format create action correctly', () => {
      const result = formatActivityDetails(ACTIVITY_ACTIONS.CREATE, ENTITY_TYPES.PRODUCT, {})
      expect(result).toBe('Created new product')
    })

    it('should format update action with changed fields', () => {
      const details = {
        changes: {
          name: 'New Name',
          price: 100,
          updatedAt: new Date(),
        },
      }
      const result = formatActivityDetails(ACTIVITY_ACTIONS.UPDATE, ENTITY_TYPES.PRODUCT, details)
      expect(result).toBe('Updated name, price')
    })

    it('should format update action without specific changes', () => {
      const result = formatActivityDetails(ACTIVITY_ACTIONS.UPDATE, ENTITY_TYPES.PRODUCT, {})
      expect(result).toBe('Updated product')
    })

    it('should format stock operations correctly', () => {
      expect(formatActivityDetails(ACTIVITY_ACTIONS.STOCK_IN, ENTITY_TYPES.PRODUCT, { quantity: 10 }))
        .toBe('Added 10 units to inventory')
      
      expect(formatActivityDetails(ACTIVITY_ACTIONS.STOCK_OUT, ENTITY_TYPES.PRODUCT, { quantity: 5 }))
        .toBe('Removed 5 units from inventory')
      
      expect(formatActivityDetails(ACTIVITY_ACTIONS.ADJUST, ENTITY_TYPES.PRODUCT, { quantity: -3 }))
        .toBe('Adjusted inventory by -3 units')
    })

    it('should format payment action correctly', () => {
      const result = formatActivityDetails(ACTIVITY_ACTIONS.PAYMENT, ENTITY_TYPES.INVOICE, { amount: 1000 })
      expect(result).toBe('Processed payment of 1000')
    })

    it('should handle unknown actions', () => {
      const result = formatActivityDetails('unknown_action', ENTITY_TYPES.PRODUCT, {})
      expect(result).toBe('Performed unknown_action on product')
    })
  })

  describe('getActivityIcon', () => {
    it('should return correct icons for actions', () => {
      expect(getActivityIcon(ACTIVITY_ACTIONS.CREATE, MODULES.INVENTORY)).toBe('plus-circle')
      expect(getActivityIcon(ACTIVITY_ACTIONS.UPDATE, MODULES.INVENTORY)).toBe('edit')
      expect(getActivityIcon(ACTIVITY_ACTIONS.DELETE, MODULES.INVENTORY)).toBe('trash-2')
      expect(getActivityIcon(ACTIVITY_ACTIONS.APPROVE, MODULES.INVENTORY)).toBe('check-circle')
      expect(getActivityIcon(ACTIVITY_ACTIONS.REJECT, MODULES.INVENTORY)).toBe('x-circle')
      expect(getActivityIcon(ACTIVITY_ACTIONS.STOCK_IN, MODULES.INVENTORY)).toBe('arrow-up-circle')
      expect(getActivityIcon(ACTIVITY_ACTIONS.STOCK_OUT, MODULES.INVENTORY)).toBe('arrow-down-circle')
      expect(getActivityIcon(ACTIVITY_ACTIONS.PAYMENT, MODULES.ACCOUNTING)).toBe('credit-card')
      expect(getActivityIcon(ACTIVITY_ACTIONS.LOGIN, MODULES.SYSTEM)).toBe('log-in')
      expect(getActivityIcon(ACTIVITY_ACTIONS.LOGOUT, MODULES.SYSTEM)).toBe('log-out')
    })

    it('should return module-specific icons for unknown actions', () => {
      expect(getActivityIcon('unknown', MODULES.INVENTORY)).toBe('package')
      expect(getActivityIcon('unknown', MODULES.SALES)).toBe('shopping-cart')
      expect(getActivityIcon('unknown', MODULES.CUSTOMERS)).toBe('users')
      expect(getActivityIcon('unknown', MODULES.HR)).toBe('user-check')
      expect(getActivityIcon('unknown', MODULES.ACCOUNTING)).toBe('calculator')
      expect(getActivityIcon('unknown', 'unknown_module')).toBe('activity')
    })
  })
})