import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  withActivityLogging,
  createCRUDActivityContext,
  extractUserIdFromRequest,
} from '../activity-middleware'

// Mock ActivityLogger
vi.mock('@/lib/services/activity-logger', () => ({
  ActivityLogger: {
    log: vi.fn(),
  },
}))

import { ActivityLogger } from '@/lib/services/activity-logger'

describe('Activity Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('withActivityLogging', () => {
    it('should log activity for successful operations', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new NextResponse(JSON.stringify({ id: 'test123', name: 'Test' }), { status: 200 })
      )

      const mockGetContext = vi.fn().mockReturnValue({
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'test123',
        entityName: 'Test',
      })

      const mockLog = vi.mocked(ActivityLogger.log)

      const wrappedHandler = withActivityLogging(mockHandler, mockGetContext)

      const mockRequest = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const response = await wrappedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, undefined)
      expect(mockGetContext).toHaveBeenCalled()
      expect(mockLog).toHaveBeenCalledWith({
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'test123',
        entityName: 'Test',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })
      expect(response.status).toBe(200)
    })

    it('should not log activity for non-2xx responses', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new NextResponse('Not Found', { status: 404 })
      )

      const mockGetContext = vi.fn()
      const mockLog = vi.mocked(ActivityLogger.log)

      const wrappedHandler = withActivityLogging(mockHandler, mockGetContext)

      const mockRequest = new NextRequest('http://localhost/api/products/nonexistent')

      await wrappedHandler(mockRequest)

      expect(mockGetContext).not.toHaveBeenCalled()
      expect(mockLog).not.toHaveBeenCalled()
    })

    it('should log failed activity when handler throws error', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Database error'))

      const mockGetContext = vi.fn().mockReturnValue({
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'test123',
        entityName: 'Test',
      })

      const mockLog = vi.mocked(ActivityLogger.log)

      const wrappedHandler = withActivityLogging(mockHandler, mockGetContext)

      const mockRequest = new NextRequest('http://localhost/api/products', {
        method: 'POST',
      })

      await expect(wrappedHandler(mockRequest)).rejects.toThrow('Database error')

      expect(mockLog).toHaveBeenCalledWith({
        userId: 'user123',
        module: 'inventory',
        action: 'create_failed',
        entityType: 'product',
        entityId: 'test123',
        entityName: 'Test',
        details: {
          error: 'Database error',
        },
        ipAddress: 'unknown',
        userAgent: undefined,
      })
    })

    it('should handle missing activity context gracefully', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new NextResponse(JSON.stringify({ id: 'test123' }), { status: 200 })
      )

      const mockGetContext = vi.fn().mockReturnValue(null)
      const mockLog = vi.mocked(ActivityLogger.log)

      const wrappedHandler = withActivityLogging(mockHandler, mockGetContext)

      const mockRequest = new NextRequest('http://localhost/api/products')

      await wrappedHandler(mockRequest)

      expect(mockLog).not.toHaveBeenCalled()
    })

    it('should extract IP from various headers', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new NextResponse(JSON.stringify({ id: 'test123' }), { status: 200 })
      )

      const mockGetContext = vi.fn().mockReturnValue({
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'test123',
        entityName: 'Test',
      })

      const mockLog = vi.mocked(ActivityLogger.log)

      const wrappedHandler = withActivityLogging(mockHandler, mockGetContext)

      // Test x-real-ip header
      const mockRequest1 = new NextRequest('http://localhost/api/products', {
        headers: { 'x-real-ip': '10.0.0.1' },
      })

      await wrappedHandler(mockRequest1)

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.1',
        })
      )

      vi.clearAllMocks()

      // Test cf-connecting-ip header
      const mockRequest2 = new NextRequest('http://localhost/api/products', {
        headers: { 'cf-connecting-ip': '203.0.113.1' },
      })

      await wrappedHandler(mockRequest2)

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '203.0.113.1',
        })
      )
    })
  })

  describe('createCRUDActivityContext', () => {
    it('should create context for POST request', () => {
      const entityData = {
        id: 'product123',
        name: 'Test Product',
        price: 100,
      }

      const context = createCRUDActivityContext(
        'user123',
        'inventory',
        'product',
        'POST',
        entityData
      )

      expect(context).toEqual({
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'product123',
        entityName: 'Test Product',
        details: {
          method: 'POST',
          changes: entityData,
        },
      })
    })

    it('should create context for PUT request', () => {
      const entityData = {
        id: 'product123',
        name: 'Updated Product',
      }

      const context = createCRUDActivityContext(
        'user123',
        'inventory',
        'product',
        'PUT',
        entityData
      )

      expect(context?.action).toBe('update')
    })

    it('should create context for DELETE request', () => {
      const entityData = {
        id: 'product123',
        name: 'Product to Delete',
      }

      const context = createCRUDActivityContext(
        'user123',
        'inventory',
        'product',
        'DELETE',
        entityData
      )

      expect(context?.action).toBe('delete')
    })

    it('should return null for GET request', () => {
      const entityData = { id: 'product123', name: 'Test Product' }

      const context = createCRUDActivityContext(
        'user123',
        'inventory',
        'product',
        'GET',
        entityData
      )

      expect(context).toBeNull()
    })

    it('should return null if no userId', () => {
      const entityData = { id: 'product123', name: 'Test Product' }

      const context = createCRUDActivityContext(
        '',
        'inventory',
        'product',
        'POST',
        entityData
      )

      expect(context).toBeNull()
    })

    it('should return null if no entityData', () => {
      const context = createCRUDActivityContext(
        'user123',
        'inventory',
        'product',
        'POST',
        null
      )

      expect(context).toBeNull()
    })

    it('should handle different entity name fields', () => {
      // Test with title field
      const entityData1 = { id: 'note123', title: 'Important Note' }
      const context1 = createCRUDActivityContext(
        'user123',
        'notes',
        'note',
        'POST',
        entityData1
      )
      expect(context1?.entityName).toBe('Important Note')

      // Test with number field
      const entityData2 = { id: 'invoice123', number: 'INV-001' }
      const context2 = createCRUDActivityContext(
        'user123',
        'invoicing',
        'invoice',
        'POST',
        entityData2
      )
      expect(context2?.entityName).toBe('INV-001')

      // Test with email field
      const entityData3 = { id: 'user123', email: 'user@example.com' }
      const context3 = createCRUDActivityContext(
        'admin123',
        'users',
        'user',
        'POST',
        entityData3
      )
      expect(context3?.entityName).toBe('user@example.com')

      // Test fallback to entity type + id
      const entityData4 = { id: 'unknown123' }
      const context4 = createCRUDActivityContext(
        'user123',
        'system',
        'unknown',
        'POST',
        entityData4
      )
      expect(context4?.entityName).toBe('unknown unknown123')
    })
  })

  describe('extractUserIdFromRequest', () => {
    it('should extract user ID from x-user-id header', () => {
      const mockRequest = new NextRequest('http://localhost/api/test', {
        headers: { 'x-user-id': 'user123' },
      })

      const userId = extractUserIdFromRequest(mockRequest)
      expect(userId).toBe('user123')
    })

    it('should return null if no user ID found', () => {
      const mockRequest = new NextRequest('http://localhost/api/test')

      const userId = extractUserIdFromRequest(mockRequest)
      expect(userId).toBeNull()
    })
  })
})