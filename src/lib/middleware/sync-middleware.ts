import { NextRequest, NextResponse } from 'next/server'
import { dataSyncManager } from '@/lib/services/data-sync-manager'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Define sync triggers for different API routes
const SYNC_TRIGGERS = {
  // Sales module triggers
  'POST /api/sales': { module: 'sales', action: 'sale_created' },
  'PUT /api/sales/[id]': { module: 'sales', action: 'sale_updated' },
  'DELETE /api/sales/[id]': { module: 'sales', action: 'sale_deleted' },
  
  // Invoice triggers
  'POST /api/invoices': { module: 'sales', action: 'invoice_created' },
  'PUT /api/invoices/[id]': { module: 'sales', action: 'invoice_updated' },
  'PUT /api/invoices/[id]/status': { module: 'sales', action: 'invoice_status_changed' },
  
  // Inventory triggers
  'POST /api/inventory/products': { module: 'inventory', action: 'product_created' },
  'PUT /api/inventory/products/[id]': { module: 'inventory', action: 'product_updated' },
  'PUT /api/inventory/products/[id]/stock': { module: 'inventory', action: 'stock_updated' },
  'POST /api/inventory/adjustments': { module: 'inventory', action: 'stock_adjusted' },
  
  // Purchase triggers
  'POST /api/purchases': { module: 'purchasing', action: 'purchase_created' },
  'PUT /api/purchases/[id]/receive': { module: 'purchasing', action: 'purchase_received' },
  
  // Customer triggers
  'POST /api/customers': { module: 'customers', action: 'customer_created' },
  'PUT /api/customers/[id]': { module: 'customers', action: 'customer_updated' },
}

interface SyncMiddlewareOptions {
  enabled?: boolean
  excludeRoutes?: string[]
  includeRoutes?: string[]
}

export function createSyncMiddleware(options: SyncMiddlewareOptions = {}) {
  const { enabled = true, excludeRoutes = [], includeRoutes = [] } = options

  return async function syncMiddleware(
    request: NextRequest,
    response: NextResponse,
    data?: any
  ) {
    // Skip if sync is disabled
    if (!enabled) {
      return response
    }

    const method = request.method
    const pathname = request.nextUrl.pathname
    const routeKey = `${method} ${pathname}`

    // Check if route should be excluded
    if (excludeRoutes.some(route => pathname.includes(route))) {
      return response
    }

    // Check if route should be included (if includeRoutes is specified)
    if (includeRoutes.length > 0 && !includeRoutes.some(route => pathname.includes(route))) {
      return response
    }

    // Find matching sync trigger
    const trigger = findMatchingTrigger(routeKey)
    if (!trigger) {
      return response
    }

    // Only trigger sync for successful responses
    if (!response.ok) {
      return response
    }

    try {
      // Get user session for sync tracking
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return response
      }

      // Extract data from response or use provided data
      let syncData = data
      if (!syncData && response.body) {
        try {
          const responseText = await response.text()
          syncData = JSON.parse(responseText)
          
          // Recreate response with the consumed body
          response = new NextResponse(responseText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          })
        } catch (error) {
          console.warn('Failed to parse response body for sync:', error)
        }
      }

      // Trigger sync operation asynchronously
      if (syncData) {
        // Don't await to avoid blocking the response
        dataSyncManager.syncData(
          trigger.module,
          trigger.action,
          syncData,
          session.user.id
        ).catch(error => {
          console.error('Sync middleware error:', error)
        })
      }
    } catch (error) {
      console.error('Sync middleware error:', error)
      // Don't fail the original request due to sync errors
    }

    return response
  }
}

function findMatchingTrigger(routeKey: string) {
  // Direct match
  if (SYNC_TRIGGERS[routeKey as keyof typeof SYNC_TRIGGERS]) {
    return SYNC_TRIGGERS[routeKey as keyof typeof SYNC_TRIGGERS]
  }

  // Pattern matching for dynamic routes
  for (const [pattern, trigger] of Object.entries(SYNC_TRIGGERS)) {
    if (matchesPattern(routeKey, pattern)) {
      return trigger
    }
  }

  return null
}

function matchesPattern(routeKey: string, pattern: string): boolean {
  // Convert pattern to regex
  // Replace [id] with \w+ and escape special characters
  const regexPattern = pattern
    .replace(/\[[\w]+\]/g, '[\\w-]+')
    .replace(/\//g, '\\/')
    .replace(/\./g, '\\.')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(routeKey)
}

// Helper function to wrap API route handlers with sync middleware
export function withSyncMiddleware<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options?: SyncMiddlewareOptions
) {
  const middleware = createSyncMiddleware(options)

  return async function wrappedHandler(...args: T): Promise<NextResponse> {
    const response = await handler(...args)
    
    // Apply sync middleware
    const request = args[0] as NextRequest
    return await middleware(request, response)
  }
}

// Utility function to manually trigger sync from API routes
export async function triggerSync(
  module: string,
  action: string,
  data: any,
  userId: string
) {
  try {
    await dataSyncManager.syncData(module, action, data, userId)
  } catch (error) {
    console.error('Manual sync trigger error:', error)
    throw error
  }
}

// Utility function to get sync status for an entity
export async function getSyncStatus(entityId: string) {
  try {
    return await dataSyncManager.getSyncStatus(entityId)
  } catch (error) {
    console.error('Get sync status error:', error)
    return null
  }
}

// Export the default middleware instance
export const syncMiddleware = createSyncMiddleware()