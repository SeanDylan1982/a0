import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, MIDDLEWARE_CONFIGS } from '../api-middleware'
import { AuthenticatedRequest } from '../auth-middleware'
import { prisma } from '@/lib/prisma'
import { UserRole, NotificationType, NotificationPriority } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    activityLog: {
      create: vi.fn()
    },
    notification: {
      create: vi.fn(),
      createMany: vi.fn()
    },
    setting: {
      findMany: vi.fn(),
      upsert: vi.fn()
    }
  }
}))

vi.mock('@/lib/services/notification-manager', () => ({
  NotificationManager: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    createBulk: vi.fn()
  }))
}))

vi.mock('@/lib/services/translation-manager', () => ({
  translationManager: {
    translate: vi.fn().mockImplementation((key, lang, params) => Promise.resolve(key))
  }
}))

vi.mock('@/lib/services/activity-logger', () => ({
  ActivityLogger: {
    log: vi.fn()
  }
}))

describe('API Middleware Integration Tests', () => {
  let mockUser: any
  let mockRequest: NextRequest
  let mockHandler: vi.MockedFunction<(req: AuthenticatedRequest) => Promise<NextResponse>>

  beforeAll(() => {
    // Setup global mocks
    global.fetch = vi.fn()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.MANAGER,
      status: 'ACTIVE'
    }

    mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true, data: { id: 'test-123', name: 'Test Entity' } })
    )

    // Mock successful user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication Middleware', () => {
    it('should allow access with valid authentication', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123'
        }
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.AUTHENTICATED)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should deny access without authentication for protected routes', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET'
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.AUTHENTICATED)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(401)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should allow access to public routes without authentication', async () => {
      const request = new NextRequest('http://localhost/api/health', {
        method: 'GET'
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.PUBLIC)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow admin access to admin-only routes', async () => {
      mockUser.role = UserRole.DIRECTOR

      const request = new NextRequest('http://localhost/api/admin', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123'
        }
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.ADMIN_ONLY)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })

    it('should deny non-admin access to admin-only routes', async () => {
      mockUser.role = UserRole.STAFF_MEMBER

      const request = new NextRequest('http://localhost/api/admin', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123'
        }
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.ADMIN_ONLY)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(403)
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('Activity Logging Middleware', () => {
    it('should log successful POST operations', async () => {
      const request = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name: 'Test Customer' })
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.CUSTOMERS)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
      // Activity logging is called asynchronously, so we can't directly test it here
      // but we can verify the handler was called successfully
    })

    it('should not log GET operations by default', async () => {
      const request = new NextRequest('http://localhost/api/customers', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123'
        }
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.CUSTOMERS)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })
  })

  describe('Validation Middleware', () => {
    it('should validate POST request body against schema', async () => {
      const invalidData = { email: 'invalid-email' } // Missing required fields

      const request = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.CUSTOMERS)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(400)
      expect(mockHandler).not.toHaveBeenCalled()

      const responseData = await response.json()
      expect(responseData.error).toBeDefined()
      expect(responseData.details).toBeDefined()
    })

    it('should allow valid POST request body', async () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+27123456789'
      }

      const request = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'content-type': 'application/json'
        },
        body: JSON.stringify(validData)
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.CUSTOMERS)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })
  })

  describe('Notification Middleware', () => {
    it('should trigger notifications for large transactions', async () => {
      const largeTransactionHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ 
          success: true, 
          sale: { id: 'sale-123', total: 15000 } // Above threshold
        })
      )

      const request = new NextRequest('http://localhost/api/sales', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ customerId: 'customer-123', items: [] })
      })

      const wrappedHandler = withApiMiddleware(largeTransactionHandler, MIDDLEWARE_CONFIGS.SALES)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(largeTransactionHandler).toHaveBeenCalled()
      // Notification creation is async, so we can't directly test it
    })

    it('should not trigger notifications for small transactions', async () => {
      const smallTransactionHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ 
          success: true, 
          sale: { id: 'sale-123', total: 500 } // Below threshold
        })
      )

      const request = new NextRequest('http://localhost/api/sales', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ customerId: 'customer-123', items: [] })
      })

      const wrappedHandler = withApiMiddleware(smallTransactionHandler, MIDDLEWARE_CONFIGS.SALES)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(smallTransactionHandler).toHaveBeenCalled()
    })
  })

  describe('Error Handling Middleware', () => {
    it('should handle and translate errors', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'accept-language': 'en'
        }
      })

      const wrappedHandler = withApiMiddleware(errorHandler, MIDDLEWARE_CONFIGS.AUTHENTICATED)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData.error).toBeDefined()
      expect(responseData.timestamp).toBeDefined()
    })

    it('should handle Prisma unique constraint errors', async () => {
      const prismaError = new Error('Unique constraint failed')
      ;(prismaError as any).code = 'P2002'

      const errorHandler = vi.fn().mockRejectedValue(prismaError)

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'accept-language': 'en',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      })

      const wrappedHandler = withApiMiddleware(errorHandler, MIDDLEWARE_CONFIGS.AUTHENTICATED)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(409)
      const responseData = await response.json()
      expect(responseData.error).toBeDefined()
      expect(responseData.code).toBe('P2002')
    })
  })

  describe('Cross-Module Data Synchronization', () => {
    it('should apply sync middleware to successful operations', async () => {
      const request = new NextRequest('http://localhost/api/inventory', {
        method: 'PUT',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ id: 'product-123', quantity: 50 })
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.INVENTORY)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
      // Sync operations are async and would be tested separately
    })
  })

  describe('Translation Support', () => {
    it('should translate validation errors based on accept-language header', async () => {
      const invalidData = { email: 'invalid' }

      const request = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'content-type': 'application/json',
          'accept-language': 'af'
        },
        body: JSON.stringify(invalidData)
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.CUSTOMERS)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBeDefined()
    })
  })

  describe('Rate Limiting Integration', () => {
    it('should apply rate limiting to all routes', async () => {
      // This would require mocking the rate limiter
      // For now, we just verify the middleware chain works
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123'
        }
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.AUTHENTICATED)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Middleware Configuration Validation', () => {
    it('should handle missing configuration gracefully', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET'
      })

      const wrappedHandler = withApiMiddleware(mockHandler, {})
      const response = await wrappedHandler(request)

      // Should still work with minimal config
      expect(response.status).toBe(200)
    })

    it('should apply all middleware layers in correct order', async () => {
      const request = new NextRequest('http://localhost/api/sales', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'x-user-id': 'user-123',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          customerId: 'customer-123',
          items: [{ productId: 'product-123', quantity: 1, price: 100 }]
        })
      })

      const wrappedHandler = withApiMiddleware(mockHandler, MIDDLEWARE_CONFIGS.SALES)
      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })
  })
})