import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getStockSummary } from '../route'
import { POST as reserveStock, DELETE as releaseReservation } from '../reserve/route'
import { POST as recordMovement, GET as getMovements } from '../movements/route'
import { POST as validateStock } from '../validate/route'
import { POST as cleanupReservations } from '../cleanup/route'
import { prisma as db } from '@/lib/prisma'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

const mockSession = {
  user: {
    id: 'test-user-id',
    role: 'INVENTORY_MANAGER'
  }
}

describe('Inventory Pool API Routes', () => {
  let testProductId: string
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const testUser = await db.user.create({
      data: {
        email: 'test-api@inventory.com',
        password: 'password',
        name: 'Test API User',
        role: 'INVENTORY_MANAGER'
      }
    })
    testUserId = testUser.id
    mockSession.user.id = testUserId

    // Create test product
    const testProduct = await db.product.create({
      data: {
        sku: 'TEST-API-001',
        name: 'Test API Product',
        description: 'Product for API testing',
        category: 'Test',
        price: 100,
        cost: 50,
        quantity: 100,
        minStock: 10,
        unit: 'pcs'
      }
    })
    testProductId = testProduct.id
  })

  afterAll(async () => {
    // Clean up test data
    await db.stockReservation.deleteMany({ where: { productId: testProductId } })
    await db.stockMovement.deleteMany({ where: { productId: testProductId } })
    await db.product.delete({ where: { id: testProductId } })
    await db.user.delete({ where: { id: testUserId } })
  })

  beforeEach(async () => {
    // Reset product quantity and clean up
    await db.product.update({
      where: { id: testProductId },
      data: { quantity: 100 }
    })
    await db.stockReservation.deleteMany({ where: { productId: testProductId } })
    await db.stockMovement.deleteMany({ where: { productId: testProductId } })

    // Mock successful authentication
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
  })

  describe('GET /api/inventory/pool', () => {
    it('should return stock summary for valid product', async () => {
      const request = new NextRequest(`http://localhost/api/inventory/pool?productId=${testProductId}`)
      const response = await getStockSummary(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.productId).toBe(testProductId)
      expect(data.data.totalStock).toBe(100)
      expect(data.data.availableStock).toBe(100)
    })

    it('should return 400 for missing product ID', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool')
      const response = await getStockSummary(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Product ID is required')
    })

    it('should return 401 for unauthenticated request', async () => {
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest(`http://localhost/api/inventory/pool?productId=${testProductId}`)
      const response = await getStockSummary(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST /api/inventory/pool/reserve', () => {
    it('should create stock reservation successfully', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/reserve', {
        method: 'POST',
        body: JSON.stringify({
          productId: testProductId,
          quantity: 25,
          reason: 'API test reservation'
        })
      })

      const response = await reserveStock(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.reservationId).toBeDefined()
    })

    it('should return 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/reserve', {
        method: 'POST',
        body: JSON.stringify({
          productId: testProductId,
          quantity: -5, // Invalid negative quantity
          reason: 'Invalid test'
        })
      })

      const response = await reserveStock(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
    })
  })

  describe('DELETE /api/inventory/pool/reserve', () => {
    it('should release reservation successfully', async () => {
      // First create a reservation
      const createRequest = new NextRequest('http://localhost/api/inventory/pool/reserve', {
        method: 'POST',
        body: JSON.stringify({
          productId: testProductId,
          quantity: 15,
          reason: 'To be released'
        })
      })

      const createResponse = await reserveStock(createRequest)
      const createData = await createResponse.json()
      const reservationId = createData.data.reservationId

      // Then release it
      const releaseRequest = new NextRequest(`http://localhost/api/inventory/pool/reserve?reservationId=${reservationId}`, {
        method: 'DELETE'
      })

      const response = await releaseReservation(releaseRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 for missing reservation ID', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/reserve', {
        method: 'DELETE'
      })

      const response = await releaseReservation(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Reservation ID is required')
    })
  })

  describe('POST /api/inventory/pool/movements', () => {
    it('should record stock movement successfully', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/movements', {
        method: 'POST',
        body: JSON.stringify({
          action: 'record',
          productId: testProductId,
          type: 'PURCHASE',
          quantity: 50,
          reason: 'API test purchase'
        })
      })

      const response = await recordMovement(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.type).toBe('PURCHASE')
      expect(data.data.quantity).toBe(50)
    })

    it('should adjust stock successfully', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/movements', {
        method: 'POST',
        body: JSON.stringify({
          action: 'adjust',
          productId: testProductId,
          quantity: -10,
          reason: 'BREAKAGE'
        })
      })

      const response = await recordMovement(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.type).toBe('ADJUSTMENT')
    })

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/movements', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid',
          productId: testProductId
        })
      })

      const response = await recordMovement(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })
  })

  describe('GET /api/inventory/pool/movements', () => {
    beforeEach(async () => {
      // Create some test movements
      const createRequest = new NextRequest('http://localhost/api/inventory/pool/movements', {
        method: 'POST',
        body: JSON.stringify({
          action: 'record',
          productId: testProductId,
          type: 'PURCHASE',
          quantity: 20,
          reason: 'Test movement'
        })
      })
      await recordMovement(createRequest)
    })

    it('should return stock movements for product', async () => {
      const request = new NextRequest(`http://localhost/api/inventory/pool/movements?productId=${testProductId}`)
      const response = await getMovements(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should return 400 for missing product ID', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/movements')
      const response = await getMovements(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Product ID is required')
    })
  })

  describe('POST /api/inventory/pool/validate', () => {
    it('should validate stock operation successfully', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/validate', {
        method: 'POST',
        body: JSON.stringify({
          productId: testProductId,
          quantity: 50,
          operation: 'reserve'
        })
      })

      const response = await validateStock(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.valid).toBe(true)
      expect(data.data.availableStock).toBe(100)
    })

    it('should return validation failure for insufficient stock', async () => {
      const request = new NextRequest('http://localhost/api/inventory/pool/validate', {
        method: 'POST',
        body: JSON.stringify({
          productId: testProductId,
          quantity: 150, // More than available
          operation: 'reduce'
        })
      })

      const response = await validateStock(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.valid).toBe(false)
    })
  })

  describe('POST /api/inventory/pool/cleanup', () => {
    it('should cleanup expired reservations for authorized user', async () => {
      // Create an expired reservation manually
      await db.stockReservation.create({
        data: {
          productId: testProductId,
          quantity: 20,
          reason: 'Expired test',
          userId: testUserId,
          expiresAt: new Date(Date.now() - 60000) // 1 minute ago
        }
      })

      const request = new NextRequest('http://localhost/api/inventory/pool/cleanup', {
        method: 'POST'
      })

      const response = await cleanupReservations(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cleanedReservations).toBeGreaterThanOrEqual(1)
    })

    it('should return 403 for unauthorized user role', async () => {
      // Mock user with insufficient permissions
      const { getServerSession } = await import('next-auth')
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: testUserId, role: 'USER' }
      })

      const request = new NextRequest('http://localhost/api/inventory/pool/cleanup', {
        method: 'POST'
      })

      const response = await cleanupReservations(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
    })
  })
})