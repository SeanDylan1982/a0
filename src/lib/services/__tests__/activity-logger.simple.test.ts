import { describe, it, expect } from 'vitest'
import { UserRole } from '@prisma/client'
import {
  ACTIVITY_ACTIONS,
  MODULES,
  ENTITY_TYPES,
  canViewActivities,
  formatActivityDetails,
  getActivityIcon,
} from '../../utils/activity-utils'

describe('Activity Utils', () => {
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

    it('should restrict STAFF_MEMBER to only own activities', () => {
      expect(canViewActivities(UserRole.STAFF_MEMBER, MODULES.INVENTORY, 'staff123', 'staff123')).toBe(true)
      expect(canViewActivities(UserRole.STAFF_MEMBER, MODULES.INVENTORY, 'other123', 'staff123')).toBe(false)
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

    it('should format stock operations correctly', () => {
      expect(formatActivityDetails(ACTIVITY_ACTIONS.STOCK_IN, ENTITY_TYPES.PRODUCT, { quantity: 10 }))
        .toBe('Added 10 units to inventory')
      
      expect(formatActivityDetails(ACTIVITY_ACTIONS.STOCK_OUT, ENTITY_TYPES.PRODUCT, { quantity: 5 }))
        .toBe('Removed 5 units from inventory')
    })
  })

  describe('getActivityIcon', () => {
    it('should return correct icons for actions', () => {
      expect(getActivityIcon(ACTIVITY_ACTIONS.CREATE, MODULES.INVENTORY)).toBe('plus-circle')
      expect(getActivityIcon(ACTIVITY_ACTIONS.UPDATE, MODULES.INVENTORY)).toBe('edit')
      expect(getActivityIcon(ACTIVITY_ACTIONS.DELETE, MODULES.INVENTORY)).toBe('trash-2')
      expect(getActivityIcon(ACTIVITY_ACTIONS.STOCK_IN, MODULES.INVENTORY)).toBe('arrow-up-circle')
    })

    it('should return module-specific icons for unknown actions', () => {
      expect(getActivityIcon('unknown', MODULES.INVENTORY)).toBe('package')
      expect(getActivityIcon('unknown', MODULES.SALES)).toBe('shopping-cart')
      expect(getActivityIcon('unknown', 'unknown_module')).toBe('activity')
    })
  })

  describe('Constants', () => {
    it('should have correct activity actions', () => {
      expect(ACTIVITY_ACTIONS.CREATE).toBe('create')
      expect(ACTIVITY_ACTIONS.UPDATE).toBe('update')
      expect(ACTIVITY_ACTIONS.DELETE).toBe('delete')
      expect(ACTIVITY_ACTIONS.STOCK_IN).toBe('stock_in')
    })

    it('should have correct modules', () => {
      expect(MODULES.INVENTORY).toBe('inventory')
      expect(MODULES.SALES).toBe('sales')
      expect(MODULES.HR).toBe('hr')
    })

    it('should have correct entity types', () => {
      expect(ENTITY_TYPES.PRODUCT).toBe('product')
      expect(ENTITY_TYPES.CUSTOMER).toBe('customer')
      expect(ENTITY_TYPES.SALE).toBe('sale')
    })
  })
})