import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger } from '@/lib/services/activity-logger'

export interface ActivityContext {
  userId: string
  module: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  details?: Record<string, any>
}

/**
 * Middleware to automatically log activities for API routes
 */
export function withActivityLogging(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  getActivityContext?: (req: NextRequest, response?: any) => ActivityContext | null
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    let activityContext: ActivityContext | null = null
    let response: NextResponse

    try {
      // Execute the main handler
      response = await handler(req, context)

      // Only log successful operations (2xx status codes)
      if (response.status >= 200 && response.status < 300) {
        // Try to get activity context
        if (getActivityContext) {
          try {
            const responseData = await response.clone().json().catch(() => null)
            activityContext = getActivityContext(req, responseData)
          } catch (error) {
            console.warn('Failed to extract activity context:', error)
          }
        }

        // If we have activity context, log it
        if (activityContext) {
          await ActivityLogger.log({
            ...activityContext,
            ipAddress: getClientIP(req),
            userAgent: req.headers.get('user-agent') || undefined,
          })
        }
      }

      return response
    } catch (error) {
      // Log error activities if we have context
      if (activityContext) {
        await ActivityLogger.log({
          ...activityContext,
          action: `${activityContext.action}_failed`,
          details: {
            ...activityContext.details,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('user-agent') || undefined,
        })
      }

      throw error
    }
  }
}

/**
 * Extract client IP address from request
 */
function getClientIP(req: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to connection remote address
  return req.ip || 'unknown'
}

/**
 * Helper to create activity context for common CRUD operations
 */
export function createCRUDActivityContext(
  userId: string,
  module: string,
  entityType: string,
  method: string,
  entityData?: any
): ActivityContext | null {
  if (!userId || !entityData) return null

  let action: string
  let entityId: string
  let entityName: string

  switch (method) {
    case 'POST':
      action = 'create'
      break
    case 'PUT':
    case 'PATCH':
      action = 'update'
      break
    case 'DELETE':
      action = 'delete'
      break
    default:
      return null // Don't log GET requests by default
  }

  // Extract entity ID and name from the data
  entityId = entityData.id || entityData._id || 'unknown'
  entityName = entityData.name || entityData.title || entityData.number || entityData.email || `${entityType} ${entityId}`

  return {
    userId,
    module,
    action,
    entityType,
    entityId,
    entityName,
    details: {
      method,
      changes: entityData,
    },
  }
}

/**
 * Helper to extract user ID from request (assumes JWT or session)
 */
export function extractUserIdFromRequest(req: NextRequest): string | null {
  // This would typically extract from JWT token or session
  // For now, we'll check headers or cookies
  
  // Check for user ID in headers (for API calls)
  const userIdHeader = req.headers.get('x-user-id')
  if (userIdHeader) {
    return userIdHeader
  }

  // Check for session cookie or JWT
  // This would need to be implemented based on your auth system
  // For now, return null and let the calling code handle it
  return null
}

/**
 * Decorator for API route handlers to automatically log activities
 */
export function logActivity(
  module: string,
  entityType: string,
  options?: {
    skipMethods?: string[]
    customContext?: (req: NextRequest, response?: any) => ActivityContext | null
  }
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function (req: NextRequest, context?: any) {
      const skipMethods = options?.skipMethods || ['GET']
      
      if (skipMethods.includes(req.method)) {
        return method.call(this, req, context)
      }

      return withActivityLogging(
        method.bind(this),
        options?.customContext || ((req: NextRequest, response?: any) => {
          const userId = extractUserIdFromRequest(req)
          if (!userId) return null

          return createCRUDActivityContext(
            userId,
            module,
            entityType,
            req.method,
            response
          )
        })
      )(req, context)
    }

    return descriptor
  }
}