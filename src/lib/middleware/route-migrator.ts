import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, MIDDLEWARE_CONFIGS, ApiMiddlewareOptions } from './api-middleware'
import { AuthenticatedRequest } from './auth-middleware'

/**
 * Route migration utility to help convert existing API routes to use the new middleware
 */
export class RouteMigrator {
  /**
   * Migrate a simple GET/POST route handler
   */
  static migrateSimpleRoute(
    handlers: {
      GET?: (req: NextRequest) => Promise<NextResponse>
      POST?: (req: NextRequest) => Promise<NextResponse>
      PUT?: (req: NextRequest) => Promise<NextResponse>
      DELETE?: (req: NextRequest) => Promise<NextResponse>
      PATCH?: (req: NextRequest) => Promise<NextResponse>
    },
    middlewareConfig: keyof typeof MIDDLEWARE_CONFIGS | ApiMiddlewareOptions,
    overrides?: Partial<ApiMiddlewareOptions>
  ) {
    const config = typeof middlewareConfig === 'string' 
      ? { ...MIDDLEWARE_CONFIGS[middlewareConfig], ...overrides }
      : middlewareConfig

    const migratedHandlers: any = {}

    Object.entries(handlers).forEach(([method, handler]) => {
      if (handler) {
        migratedHandlers[method] = withApiMiddleware(
          handler as (req: AuthenticatedRequest) => Promise<NextResponse>,
          config
        )
      }
    })

    return migratedHandlers
  }

  /**
   * Migrate a CRUD route with standard patterns
   */
  static migrateCRUDRoute(
    module: string,
    entityType: string,
    handlers: {
      GET?: (req: AuthenticatedRequest) => Promise<NextResponse>
      POST?: (req: AuthenticatedRequest) => Promise<NextResponse>
      PUT?: (req: AuthenticatedRequest) => Promise<NextResponse>
      DELETE?: (req: AuthenticatedRequest) => Promise<NextResponse>
    },
    options?: {
      authRequired?: boolean
      roles?: any[]
      permission?: any
      customNotifications?: any[]
    }
  ) {
    const config: ApiMiddlewareOptions = {
      auth: {
        required: options?.authRequired !== false,
        roles: options?.roles,
        permission: options?.permission
      },
      activity: {
        module,
        entityType
      },
      sync: { enabled: true },
      notifications: {
        triggers: options?.customNotifications || []
      }
    }

    return this.migrateSimpleRoute(handlers, config)
  }

  /**
   * Create a wrapper for existing route files
   */
  static wrapExistingRoute(
    originalHandler: (req: NextRequest) => Promise<NextResponse>,
    middlewareConfig: keyof typeof MIDDLEWARE_CONFIGS | ApiMiddlewareOptions
  ) {
    const config = typeof middlewareConfig === 'string' 
      ? MIDDLEWARE_CONFIGS[middlewareConfig]
      : middlewareConfig

    return withApiMiddleware(
      originalHandler as (req: AuthenticatedRequest) => Promise<NextResponse>,
      config
    )
  }

  /**
   * Generate middleware documentation for a route
   */
  static generateDocumentation(
    routePath: string,
    config: ApiMiddlewareOptions,
    methods: string[]
  ): string {
    const docs = [`# API Route: ${routePath}`, '']

    // Authentication
    docs.push('## Authentication')
    if (config.auth?.required === false) {
      docs.push('- **Required**: No')
    } else {
      docs.push('- **Required**: Yes')
      
      if (config.auth?.roles) {
        docs.push(`- **Roles**: ${config.auth.roles.join(', ')}`)
      }
      
      if (config.auth?.permission) {
        docs.push(`- **Permission**: ${config.auth.permission.module}.${config.auth.permission.action}`)
      }
    }
    docs.push('')

    // Activity Logging
    if (config.activity) {
      docs.push('## Activity Logging')
      docs.push(`- **Module**: ${config.activity.module}`)
      docs.push(`- **Entity Type**: ${config.activity.entityType}`)
      docs.push(`- **Logged Methods**: ${methods.filter(m => !config.activity.skipMethods?.includes(m)).join(', ')}`)
      docs.push('')
    }

    // Sync
    docs.push('## Data Synchronization')
    if (config.sync?.enabled === false || config.auth?.required === false) {
      docs.push('- **Enabled**: No')
    } else {
      docs.push('- **Enabled**: Yes')
      docs.push('- **Triggers**: Automatic cross-module data updates')
    }
    docs.push('')

    // Notifications
    if (config.notifications?.triggers?.length) {
      docs.push('## Notifications')
      config.notifications.triggers.forEach((trigger, index) => {
        docs.push(`### Trigger ${index + 1}`)
        docs.push(`- **Type**: ${trigger.type}`)
        docs.push(`- **Priority**: ${trigger.priority}`)
        docs.push(`- **Title**: ${trigger.title}`)
        docs.push(`- **Message**: ${trigger.message}`)
        
        if (trigger.targetRoles) {
          docs.push(`- **Target Roles**: ${trigger.targetRoles.join(', ')}`)
        }
        
        docs.push('')
      })
    }

    // Methods
    docs.push('## Supported Methods')
    methods.forEach(method => {
      docs.push(`- **${method}**: Enabled`)
    })

    return docs.join('\n')
  }
}

/**
 * Helper function to quickly migrate common route patterns
 */
export function quickMigrate(
  routeType: 'public' | 'authenticated' | 'admin' | 'sales' | 'inventory' | 'customers' | 'settings',
  handlers: any,
  overrides?: Partial<ApiMiddlewareOptions>
) {
  const configMap = {
    public: 'PUBLIC',
    authenticated: 'AUTHENTICATED',
    admin: 'ADMIN_ONLY',
    sales: 'SALES',
    inventory: 'INVENTORY',
    customers: 'CUSTOMERS',
    settings: 'SETTINGS'
  } as const

  return RouteMigrator.migrateSimpleRoute(
    handlers,
    configMap[routeType],
    overrides
  )
}

/**
 * Validation schemas for common entities
 */
import {
  createCustomerSchema,
  updateCustomerSchema,
  createProductSchema,
  updateProductSchema,
  createSaleSchema,
  updateSaleSchema,
  createUserSchema,
  updateUserSchema,
  loginSchema,
  inventoryAdjustmentSchema,
  stockReservationSchema,
  createNotificationSchema,
  bulkNotificationSchema,
  createTranslationSchema,
  bulkTranslationSchema,
  companySettingsSchema,
  paginationSchema,
  activityFilterSchema,
  notificationFilterSchema
} from '@/lib/validation/api-schemas'

export const VALIDATION_SCHEMAS = {
  customer: {
    create: createCustomerSchema,
    update: updateCustomerSchema
  },
  product: {
    create: createProductSchema,
    update: updateProductSchema
  },
  sale: {
    create: createSaleSchema,
    update: updateSaleSchema
  },
  user: {
    create: createUserSchema,
    update: updateUserSchema,
    login: loginSchema
  },
  inventory: {
    adjustment: inventoryAdjustmentSchema,
    reservation: stockReservationSchema
  },
  notification: {
    create: createNotificationSchema,
    bulk: bulkNotificationSchema
  },
  translation: {
    create: createTranslationSchema,
    bulk: bulkTranslationSchema
  },
  settings: {
    company: companySettingsSchema
  },
  query: {
    pagination: paginationSchema,
    activityFilter: activityFilterSchema,
    notificationFilter: notificationFilterSchema
  }
}

/**
 * Common notification triggers
 */
export const COMMON_NOTIFICATIONS = {
  largeTransaction: (threshold: number) => ({
    condition: (req: NextRequest, response: any) => 
      req.method === 'POST' && response?.total > threshold,
    type: 'SYSTEM' as const,
    priority: 'HIGH' as const,
    title: 'Large Transaction Alert',
    message: `Transaction over R${threshold.toLocaleString()} created`,
    targetRoles: ['DIRECTOR', 'MANAGER'] as const
  }),
  
  lowStock: {
    condition: (req: NextRequest, response: any) => 
      response?.product?.quantity <= response?.product?.minStock,
    type: 'INVENTORY_ALERT' as const,
    priority: 'HIGH' as const,
    title: 'Low Stock Alert',
    message: 'Product stock below minimum threshold',
    targetRoles: ['DIRECTOR', 'MANAGER', 'INVENTORY_MANAGER'] as const
  },
  
  newCustomer: {
    condition: (req: NextRequest, response: any) => 
      req.method === 'POST' && !!response?.customer,
    type: 'SYSTEM' as const,
    priority: 'MEDIUM' as const,
    title: 'New Customer Added',
    message: 'A new customer has been registered',
    targetRoles: ['DIRECTOR', 'MANAGER'] as const
  }
}