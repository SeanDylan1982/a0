import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { RouteMigrator, quickMigrate, COMMON_NOTIFICATIONS } from '../route-migrator'
import { AuthenticatedRequest } from '../auth-middleware'

// Mock dependencies
vi.mock('../api-middleware', () => ({
  withApiMiddleware: vi.fn((handler, config) => handler),
  MIDDLEWARE_CONFIGS: {
    PUBLIC: { auth: { required: false } },
    AUTHENTICATED: { auth: { required: true } },
    ADMIN_ONLY: { auth: { required: true, roles: ['DIRECTOR', 'MANAGER'] } },
    SALES: { auth: { required: true }, activity: { module: 'sales', entityType: 'sale' } },
    INVENTORY: { auth: { required: true }, activity: { module: 'inventory', entityType: 'product' } },
    CUSTOMERS: { auth: { required: true }, activity: { module: 'customers', entityType: 'customer' } },
    SETTINGS: { auth: { required: true }, activity: { module: 'settings', entityType: 'setting' } }
  }
}))

describe('Route Migrator', () => {
  let mockHandler: vi.MockedFunction<(req: AuthenticatedRequest) => Promise<NextResponse>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
  })

  describe('migrateSimpleRoute', () => {
    it('should migrate GET and POST handlers', () => {
      const handlers = {
        GET: mockHandler,
        POST: mockHandler
      }

      const migrated = RouteMigrator.migrateSimpleRoute(handlers, 'AUTHENTICATED')

      expect(migrated.GET).toBeDefined()
      expect(migrated.POST).toBeDefined()
      expect(typeof migrated.GET).toBe('function')
      expect(typeof migrated.POST).toBe('function')
    })

    it('should handle custom middleware configuration', () => {
      const handlers = {
        GET: mockHandler
      }

      const customConfig = {
        auth: { required: true },
        activity: { module: 'test', entityType: 'test' }
      }

      const migrated = RouteMigrator.migrateSimpleRoute(handlers, customConfig)

      expect(migrated.GET).toBeDefined()
    })

    it('should apply overrides to predefined configurations', () => {
      const handlers = {
        GET: mockHandler
      }

      const overrides = {
        sync: { enabled: false }
      }

      const migrated = RouteMigrator.migrateSimpleRoute(handlers, 'AUTHENTICATED', overrides)

      expect(migrated.GET).toBeDefined()
    })
  })

  describe('migrateCRUDRoute', () => {
    it('should migrate CRUD operations with standard configuration', () => {
      const handlers = {
        GET: mockHandler,
        POST: mockHandler,
        PUT: mockHandler,
        DELETE: mockHandler
      }

      const migrated = RouteMigrator.migrateCRUDRoute('products', 'product', handlers)

      expect(migrated.GET).toBeDefined()
      expect(migrated.POST).toBeDefined()
      expect(migrated.PUT).toBeDefined()
      expect(migrated.DELETE).toBeDefined()
    })

    it('should apply custom options to CRUD routes', () => {
      const handlers = {
        GET: mockHandler,
        POST: mockHandler
      }

      const options = {
        authRequired: true,
        roles: ['DIRECTOR'],
        customNotifications: [COMMON_NOTIFICATIONS.newCustomer]
      }

      const migrated = RouteMigrator.migrateCRUDRoute('customers', 'customer', handlers, options)

      expect(migrated.GET).toBeDefined()
      expect(migrated.POST).toBeDefined()
    })
  })

  describe('wrapExistingRoute', () => {
    it('should wrap existing route handler with middleware', () => {
      const originalHandler = vi.fn().mockResolvedValue(NextResponse.json({ data: 'test' }))

      const wrapped = RouteMigrator.wrapExistingRoute(originalHandler, 'AUTHENTICATED')

      expect(typeof wrapped).toBe('function')
    })
  })

  describe('generateDocumentation', () => {
    it('should generate comprehensive documentation for a route', () => {
      const config = {
        auth: {
          required: true,
          roles: ['DIRECTOR', 'MANAGER'],
          permission: { module: 'sales', action: 'read' }
        },
        activity: {
          module: 'sales',
          entityType: 'sale'
        },
        sync: { enabled: true },
        notifications: {
          triggers: [
            {
              type: 'SYSTEM' as const,
              priority: 'HIGH' as const,
              title: 'Test Notification',
              message: 'Test message',
              condition: () => true,
              targetRoles: ['DIRECTOR'] as const
            }
          ]
        }
      }

      const docs = RouteMigrator.generateDocumentation('/api/sales', config, ['GET', 'POST'])

      expect(docs).toContain('# API Route: /api/sales')
      expect(docs).toContain('## Authentication')
      expect(docs).toContain('- **Required**: Yes')
      expect(docs).toContain('- **Roles**: DIRECTOR, MANAGER')
      expect(docs).toContain('## Activity Logging')
      expect(docs).toContain('- **Module**: sales')
      expect(docs).toContain('- **Entity Type**: sale')
      expect(docs).toContain('## Data Synchronization')
      expect(docs).toContain('- **Enabled**: Yes')
      expect(docs).toContain('## Notifications')
      expect(docs).toContain('- **Type**: SYSTEM')
      expect(docs).toContain('- **Priority**: HIGH')
      expect(docs).toContain('## Supported Methods')
      expect(docs).toContain('- **GET**: Enabled')
      expect(docs).toContain('- **POST**: Enabled')
    })

    it('should handle public routes in documentation', () => {
      const config = {
        auth: { required: false }
      }

      const docs = RouteMigrator.generateDocumentation('/api/health', config, ['GET'])

      expect(docs).toContain('# API Route: /api/health')
      expect(docs).toContain('- **Required**: No')
      // Public routes don't have sync enabled by default
    })
  })

  describe('quickMigrate', () => {
    it('should migrate public routes', () => {
      const handlers = {
        GET: mockHandler
      }

      const migrated = quickMigrate('public', handlers)

      expect(migrated.GET).toBeDefined()
    })

    it('should migrate authenticated routes', () => {
      const handlers = {
        GET: mockHandler,
        POST: mockHandler
      }

      const migrated = quickMigrate('authenticated', handlers)

      expect(migrated.GET).toBeDefined()
      expect(migrated.POST).toBeDefined()
    })

    it('should migrate admin routes', () => {
      const handlers = {
        GET: mockHandler,
        POST: mockHandler,
        PUT: mockHandler,
        DELETE: mockHandler
      }

      const migrated = quickMigrate('admin', handlers)

      expect(migrated.GET).toBeDefined()
      expect(migrated.POST).toBeDefined()
      expect(migrated.PUT).toBeDefined()
      expect(migrated.DELETE).toBeDefined()
    })

    it('should migrate business module routes', () => {
      const handlers = {
        GET: mockHandler,
        POST: mockHandler
      }

      const migrated = quickMigrate('sales', handlers)

      expect(migrated.GET).toBeDefined()
      expect(migrated.POST).toBeDefined()
    })

    it('should apply overrides to quick migration', () => {
      const handlers = {
        GET: mockHandler
      }

      const overrides = {
        notifications: {
          triggers: [COMMON_NOTIFICATIONS.largeTransaction(5000)]
        }
      }

      const migrated = quickMigrate('sales', handlers, overrides)

      expect(migrated.GET).toBeDefined()
    })
  })

  describe('COMMON_NOTIFICATIONS', () => {
    it('should create large transaction notification trigger', () => {
      const trigger = COMMON_NOTIFICATIONS.largeTransaction(10000)

      expect(trigger.type).toBe('SYSTEM')
      expect(trigger.priority).toBe('HIGH')
      expect(trigger.title).toBe('Large Transaction Alert')
      expect(trigger.targetRoles).toContain('DIRECTOR')
      expect(trigger.targetRoles).toContain('MANAGER')

      // Test condition function
      const mockReq = {} as NextRequest
      mockReq.method = 'POST'
      
      const largeResponse = { total: 15000 }
      const smallResponse = { total: 5000 }

      expect(trigger.condition(mockReq, largeResponse)).toBe(true)
      expect(trigger.condition(mockReq, smallResponse)).toBe(false)
    })

    it('should create low stock notification trigger', () => {
      const trigger = COMMON_NOTIFICATIONS.lowStock

      expect(trigger.type).toBe('INVENTORY_ALERT')
      expect(trigger.priority).toBe('HIGH')
      expect(trigger.title).toBe('Low Stock Alert')
      expect(trigger.targetRoles).toContain('INVENTORY_MANAGER')

      // Test condition function
      const mockReq = {} as NextRequest
      
      const lowStockResponse = { product: { quantity: 5, minStock: 10 } }
      const normalStockResponse = { product: { quantity: 20, minStock: 10 } }

      expect(trigger.condition(mockReq, lowStockResponse)).toBe(true)
      expect(trigger.condition(mockReq, normalStockResponse)).toBe(false)
    })

    it('should create new customer notification trigger', () => {
      const trigger = COMMON_NOTIFICATIONS.newCustomer

      expect(trigger.type).toBe('SYSTEM')
      expect(trigger.priority).toBe('MEDIUM')
      expect(trigger.title).toBe('New Customer Added')
      expect(trigger.targetRoles).toContain('DIRECTOR')
      expect(trigger.targetRoles).toContain('MANAGER')

      // Test condition function
      const mockReq = {} as NextRequest
      mockReq.method = 'POST'
      
      const customerResponse = { customer: { id: 'customer-123' } }
      const otherResponse = { sale: { id: 'sale-123' } }

      expect(trigger.condition(mockReq, customerResponse)).toBe(true)
      expect(trigger.condition(mockReq, otherResponse)).toBe(false)
    })
  })

  describe('VALIDATION_SCHEMAS', () => {
    it('should provide schemas for all entity types', async () => {
      // Import the schemas to test they exist
      const { VALIDATION_SCHEMAS } = await import('../route-migrator')

      expect(VALIDATION_SCHEMAS.customer).toBeDefined()
      expect(VALIDATION_SCHEMAS.customer.create).toBeDefined()
      expect(VALIDATION_SCHEMAS.customer.update).toBeDefined()

      expect(VALIDATION_SCHEMAS.product).toBeDefined()
      expect(VALIDATION_SCHEMAS.product.create).toBeDefined()
      expect(VALIDATION_SCHEMAS.product.update).toBeDefined()

      expect(VALIDATION_SCHEMAS.sale).toBeDefined()
      expect(VALIDATION_SCHEMAS.sale.create).toBeDefined()
      expect(VALIDATION_SCHEMAS.sale.update).toBeDefined()

      expect(VALIDATION_SCHEMAS.user).toBeDefined()
      expect(VALIDATION_SCHEMAS.user.create).toBeDefined()
      expect(VALIDATION_SCHEMAS.user.update).toBeDefined()
      expect(VALIDATION_SCHEMAS.user.login).toBeDefined()
    })
  })
})