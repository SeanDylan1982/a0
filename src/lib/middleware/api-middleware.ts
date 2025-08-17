import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withPermission, withRole, AuthenticatedRequest, PERMISSIONS } from './auth-middleware'
import { withActivityLogging, createCRUDActivityContext, extractUserIdFromRequest } from './activity-middleware'
import { createSyncMiddleware } from './sync-middleware'
import { NotificationManager } from '@/lib/services/notification-manager'
import { translationManager } from '@/lib/services/translation-manager'
import { NotificationType, NotificationPriority, UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { VALIDATION_SCHEMAS } from './route-migrator'

export interface ApiMiddlewareOptions {
  auth?: {
    required?: boolean
    roles?: UserRole[]
    permission?: any
  }
  activity?: {
    module: string
    entityType: string
    skipMethods?: string[]
  }
  sync?: {
    enabled?: boolean
    excludeRoutes?: string[]
  }
  notifications?: {
    triggers?: NotificationTrigger[]
  }
  validation?: {
    schema?: any | Record<string, any>
    translateErrors?: boolean
  }
}

export interface NotificationTrigger {
  condition: (req: NextRequest, response: any) => boolean
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  targetRoles?: UserRole[]
  targetUsers?: string[]
}

/**
 * Comprehensive API middleware composer that integrates all middleware functions
 */
export function withApiMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Apply authentication middleware if required
      let authenticatedHandler = handler
      
      if (options.auth?.required !== false) {
        if (options.auth?.permission) {
          authenticatedHandler = withPermission(options.auth.permission, handler)
        } else if (options.auth?.roles) {
          authenticatedHandler = withRole(options.auth.roles, handler)
        } else {
          authenticatedHandler = withAuth(handler)
        }
      }

      // Apply activity logging middleware
      let activityHandler = authenticatedHandler
      if (options.activity) {
        activityHandler = withActivityLogging(
          authenticatedHandler,
          (req: NextRequest, response?: any) => {
            const userId = extractUserIdFromRequest(req)
            if (!userId) return null

            return createCRUDActivityContext(
              userId,
              options.activity!.module,
              options.activity!.entityType,
              req.method,
              response
            )
          }
        )
      }

      // Apply sync middleware
      let syncHandler = activityHandler
      if (options.sync?.enabled !== false) {
        const syncMiddleware = createSyncMiddleware(options.sync)
        syncHandler = async (req: NextRequest) => {
          const response = await activityHandler(req as AuthenticatedRequest)
          return await syncMiddleware(req, response)
        }
      }

      // Apply validation middleware
      let validationHandler = syncHandler
      if (options.validation?.schema) {
        validationHandler = withValidation(syncHandler, options.validation.schema, options.validation.translateErrors)
      }

      // Apply notification middleware
      let notificationHandler = validationHandler
      if (options.notifications?.triggers) {
        notificationHandler = withNotifications(validationHandler, options.notifications.triggers)
      }

      // Apply error handling middleware
      const errorHandler = withErrorHandling(notificationHandler)

      return await errorHandler(req as AuthenticatedRequest)
    } catch (error) {
      console.error('API middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Validation middleware with translation support
 */
function withValidation(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  schemaConfig: any | Record<string, any>,
  translateErrors: boolean = true
) {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    try {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const body = await req.json()
        
        // Get schema for current method
        let schema = schemaConfig
        if (typeof schemaConfig === 'object' && !schemaConfig.parse) {
          schema = schemaConfig[req.method]
        }
        
        // Validate against schema (assuming Zod schema)
        if (schema && schema.parse) {
          try {
            schema.parse(body)
          } catch (validationError: any) {
            const errors = validationError.errors || [{ message: validationError.message }]
            
            if (translateErrors) {
              const userLanguage = req.headers.get('accept-language')?.split(',')[0] || 'en'
              const translatedErrors = await Promise.all(
                errors.map(async (error: any) => ({
                  ...error,
                  message: await translationManager.translate(
                    `validation.${error.code || 'invalid'}`,
                    userLanguage as any,
                    { field: error.path?.join('.') }
                  )
                }))
              )
              
              return NextResponse.json(
                { 
                  error: await translationManager.translate('validation.failed', userLanguage as any),
                  details: translatedErrors 
                },
                { status: 400 }
              )
            }
            
            return NextResponse.json(
              { error: 'Validation failed', details: errors },
              { status: 400 }
            )
          }
        }
      }

      return await handler(req)
    } catch (error) {
      console.error('Validation middleware error:', error)
      throw error
    }
  }
}

/**
 * Notification middleware for triggering business event notifications
 */
function withNotifications(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  triggers: NotificationTrigger[]
) {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    const response = await handler(req)
    
    // Only process notifications for successful responses
    if (response.status >= 200 && response.status < 300) {
      try {
        const responseData = await response.clone().json().catch(() => null)
        
        for (const trigger of triggers) {
          if (trigger.condition(req, responseData)) {
            await processNotificationTrigger(req, trigger, responseData)
          }
        }
      } catch (error) {
        console.error('Notification middleware error:', error)
        // Don't fail the request due to notification errors
      }
    }
    
    return response
  }
}

/**
 * Process a notification trigger
 */
async function processNotificationTrigger(
  req: AuthenticatedRequest,
  trigger: NotificationTrigger,
  responseData: any
) {
  const notificationManager = new NotificationManager(prisma)
  
  try {
    // Determine target users
    let targetUserIds: string[] = []
    
    if (trigger.targetUsers) {
      targetUserIds = trigger.targetUsers
    } else if (trigger.targetRoles) {
      // Find users with specified roles
      const users = await prisma.user.findMany({
        where: {
          role: { in: trigger.targetRoles }
        },
        select: { id: true }
      })
      targetUserIds = users.map(u => u.id)
    }
    
    // Create notifications for each target user
    const notifications = targetUserIds.map(userId => ({
      userId,
      type: trigger.type,
      title: trigger.title,
      message: trigger.message,
      priority: trigger.priority,
      data: {
        sourceRequest: {
          method: req.method,
          url: req.url,
          timestamp: new Date().toISOString()
        },
        responseData: responseData
      }
    }))
    
    if (notifications.length > 0) {
      await notificationManager.createBulk(notifications)
    }
  } catch (error) {
    console.error('Error processing notification trigger:', error)
  }
}

/**
 * Error handling middleware with translation support
 */
function withErrorHandling(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    try {
      return await handler(req)
    } catch (error: any) {
      console.error('API error:', error)
      
      const userLanguage = req.headers.get('accept-language')?.split(',')[0] || 'en'
      
      // Translate error messages
      let errorMessage = 'Internal server error'
      let statusCode = 500
      
      if (error.code === 'P2002') {
        // Prisma unique constraint error
        errorMessage = await translationManager.translate(
          'error.duplicate_entry',
          userLanguage as any
        )
        statusCode = 409
      } else if (error.code === 'P2025') {
        // Prisma record not found error
        errorMessage = await translationManager.translate(
          'error.not_found',
          userLanguage as any
        )
        statusCode = 404
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: error.code,
          timestamp: new Date().toISOString()
        },
        { status: statusCode }
      )
    }
  }
}

/**
 * Predefined middleware configurations for common use cases
 */
export const MIDDLEWARE_CONFIGS = {
  // Public endpoints (no auth required)
  PUBLIC: {
    auth: { required: false },
    activity: undefined,
    sync: { enabled: false }
  },
  
  // Basic authenticated endpoints
  AUTHENTICATED: {
    auth: { required: true },
    sync: { enabled: true }
  },
  
  // Admin-only endpoints
  ADMIN_ONLY: {
    auth: { 
      required: true,
      roles: [UserRole.DIRECTOR, UserRole.MANAGER]
    },
    sync: { enabled: true }
  },
  
  // Management endpoints
  MANAGEMENT: {
    auth: {
      required: true,
      roles: [UserRole.DIRECTOR, UserRole.MANAGER, UserRole.HOD]
    },
    sync: { enabled: true }
  },
  
  // Sales endpoints
  SALES: {
    auth: {
      required: true,
      permission: PERMISSIONS.SALES_READ
    },
    activity: {
      module: 'sales',
      entityType: 'sale'
    },
    sync: { enabled: true },
    validation: {
      schema: {
        POST: VALIDATION_SCHEMAS.sale.create,
        PUT: VALIDATION_SCHEMAS.sale.update,
        PATCH: VALIDATION_SCHEMAS.sale.update
      },
      translateErrors: true
    },
    notifications: {
      triggers: [
        {
          condition: (req, response) => req.method === 'POST' && response?.sale?.total > 10000,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.HIGH,
          title: 'Large Sale Created',
          message: 'A sale over R10,000 has been created',
          targetRoles: [UserRole.DIRECTOR, UserRole.MANAGER]
        }
      ]
    }
  },
  
  // Inventory endpoints
  INVENTORY: {
    auth: {
      required: true,
      permission: PERMISSIONS.INVENTORY_READ
    },
    activity: {
      module: 'inventory',
      entityType: 'product'
    },
    sync: { enabled: true },
    validation: {
      schema: {
        POST: VALIDATION_SCHEMAS.product.create,
        PUT: VALIDATION_SCHEMAS.product.update,
        PATCH: VALIDATION_SCHEMAS.product.update
      },
      translateErrors: true
    },
    notifications: {
      triggers: [
        {
          condition: (req, response) => req.method === 'PUT' && response?.product?.quantity <= response?.product?.minStock,
          type: NotificationType.INVENTORY_ALERT,
          priority: NotificationPriority.HIGH,
          title: 'Low Stock Alert',
          message: 'Product stock has fallen below minimum threshold',
          targetRoles: [UserRole.DIRECTOR, UserRole.MANAGER, UserRole.INVENTORY_MANAGER]
        }
      ]
    }
  },
  
  // Customer endpoints
  CUSTOMERS: {
    auth: {
      required: true,
      permission: PERMISSIONS.CUSTOMERS_READ
    },
    activity: {
      module: 'customers',
      entityType: 'customer'
    },
    sync: { enabled: true },
    validation: {
      schema: {
        POST: VALIDATION_SCHEMAS.customer.create,
        PUT: VALIDATION_SCHEMAS.customer.update,
        PATCH: VALIDATION_SCHEMAS.customer.update
      },
      translateErrors: true
    }
  },
  
  // Settings endpoints (admin only)
  SETTINGS: {
    auth: {
      required: true,
      permission: PERMISSIONS.SETTINGS_UPDATE
    },
    activity: {
      module: 'settings',
      entityType: 'setting'
    },
    sync: { enabled: true },
    validation: {
      schema: {
        PUT: VALIDATION_SCHEMAS.settings.company,
        PATCH: VALIDATION_SCHEMAS.settings.company
      },
      translateErrors: true
    },
    notifications: {
      triggers: [
        {
          condition: (req, response) => req.method === 'PUT',
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.MEDIUM,
          title: 'System Settings Updated',
          message: 'System settings have been modified',
          targetRoles: [UserRole.DIRECTOR]
        }
      ]
    }
  },

  // User management endpoints
  USERS: {
    auth: {
      required: true,
      roles: [UserRole.DIRECTOR, UserRole.MANAGER]
    },
    activity: {
      module: 'users',
      entityType: 'user'
    },
    sync: { enabled: true },
    validation: {
      schema: {
        POST: VALIDATION_SCHEMAS.user.create,
        PUT: VALIDATION_SCHEMAS.user.update,
        PATCH: VALIDATION_SCHEMAS.user.update
      },
      translateErrors: true
    }
  },

  // Authentication endpoints
  AUTH: {
    auth: { required: false },
    validation: {
      schema: {
        POST: VALIDATION_SCHEMAS.user.login
      },
      translateErrors: true
    }
  }
} as const

/**
 * Helper function to create middleware with predefined config
 */
export function withPredefinedMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  configName: keyof typeof MIDDLEWARE_CONFIGS,
  overrides?: Partial<ApiMiddlewareOptions>
) {
  const config = { ...MIDDLEWARE_CONFIGS[configName], ...overrides }
  return withApiMiddleware(handler, config)
}