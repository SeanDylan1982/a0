import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { SalesIntegrationService, LARGE_SALE_THRESHOLD } from '../sales-integration-service'
import { InventoryPool } from '../inventory-pool'
import { ActivityLogger } from '../activity-logger'
import { NotificationManager } from '../notification-manager'
import { dataSyncManager } from '../data-sync-manager'
import { prisma } from '@/lib/prisma'

// Mock all dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    sale: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
    },
    quote: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    documentSequence: {
      upsert: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../inventory-pool')
vi.mock('../activity-logger')
vi.mock('../notification-manager')
vi.mock('../data-sync-manager')
vi.mock('@/lib/utils/notification-utils')

describe('SalesIntegrationService', () => {
  let salesService: SalesIntegrationService
  let mockPrisma: any

  beforeEach(() => {
    salesService = new SalesIntegrationService()
    mockPrisma = prisma as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createSale', () => {
    const mockSaleData = {
      customerId: 'customer-1',
      items: [
        { productId: 'product-1', quantity: 2, price: 100 },
        { productId: 'product-2', quantity: 1, price: 50 },
      ],
      notes: 'Test sale',
      userId: 'user-1',
      activityContext: {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
    }

    const mockSale = {
      id: 'sale-1',
      customerId: 'customer-1',
      userId: 'user-1',
      status: 'DRAFT',
      subtotal: 250,
      tax: 37.5,
      total: 287.5,
      notes: 'Test sale',
      customer: {
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
        company: null,
      },
      user: {
        id: 'user-1',
        name: 'Test User',
      },
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          price: 100,
          total: 200,
          product: { id: 'product-1', name: 'Product 1', sku: 'P001' },
        },
        {
          productId: 'product-2',
          quantity: 1,
          price: 50,
          total: 50,
          product: { id: 'product-2', name: 'Product 2', sku: 'P002' },
        },
      ],
    }

    beforeEach(() => {
      // Mock inventory pool methods
      vi.mocked(InventoryPool.getAvailableStock).mockResolvedValue(10)
      vi.mocked(InventoryPool.reserveStock).mockResolvedValue('reservation-1')
      vi.mocked(InventoryPool.releaseReservation).mockResolvedValue()

      // Mock prisma sale creation
      mockPrisma.sale.create.mockResolvedValue(mockSale)

      // Mock activity logger
      vi.mocked(ActivityLogger.log).mockResolvedValue()

      // Mock data sync manager
      vi.mocked(dataSyncManager.syncData).mockResolvedValue()
    })

    it('should create a sale successfully', async () => {
      const result = await salesService.createSale(mockSaleData)

      expect(result).toEqual(mockSale)
      expect(InventoryPool.getAvailableStock).toHaveBeenCalledTimes(2)
      expect(InventoryPool.reserveStock).toHaveBeenCalledTimes(2)
      expect(mockPrisma.sale.create).toHaveBeenCalledWith({
        data: {
          customerId: 'customer-1',
          userId: 'user-1',
          status: 'DRAFT',
          subtotal: 250,
          tax: 37.5,
          total: 287.5,
          notes: 'Test sale',
          items: {
            create: [
              { productId: 'product-1', quantity: 2, price: 100, total: 200 },
              { productId: 'product-2', quantity: 1, price: 50, total: 50 },
            ],
          },
        },
        include: expect.any(Object),
      })
      expect(ActivityLogger.log).toHaveBeenCalledWith({
        userId: 'user-1',
        module: 'sales',
        action: 'create',
        entityType: 'sale',
        entityId: 'sale-1',
        entityName: 'Sale #sale-1',
        details: expect.objectContaining({
          customerId: 'customer-1',
          customerName: 'John Doe',
          subtotal: 250,
          tax: 37.5,
          total: 287.5,
          itemCount: 2,
          status: 'DRAFT',
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      })
      expect(dataSyncManager.syncData).toHaveBeenCalledWith(
        'sales',
        'sale_created',
        expect.objectContaining({
          entityType: 'sale',
          entityId: 'sale-1',
          saleId: 'sale-1',
          customerId: 'customer-1',
          total: 287.5,
        }),
        'user-1'
      )
    })

    it('should throw error if insufficient stock', async () => {
      vi.mocked(InventoryPool.getAvailableStock).mockResolvedValue(1) // Less than required

      await expect(salesService.createSale(mockSaleData)).rejects.toThrow(
        'Insufficient stock for product product-1. Available: 1, Required: 2'
      )

      expect(InventoryPool.reserveStock).not.toHaveBeenCalled()
      expect(mockPrisma.sale.create).not.toHaveBeenCalled()
    })

    it('should release reservations if sale creation fails', async () => {
      mockPrisma.sale.create.mockRejectedValue(new Error('Database error'))

      await expect(salesService.createSale(mockSaleData)).rejects.toThrow('Database error')

      expect(InventoryPool.releaseReservation).toHaveBeenCalledTimes(2)
      expect(InventoryPool.releaseReservation).toHaveBeenCalledWith('reservation-1')
    })
  })

  describe('confirmSale', () => {
    const mockSale = {
      id: 'sale-1',
      customerId: 'customer-1',
      status: 'DRAFT',
      total: 287.5,
      customer: {
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
        company: null,
      },
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          price: 100,
          product: { id: 'product-1', name: 'Product 1', minStock: 5 },
        },
      ],
    }

    const mockUpdatedSale = {
      ...mockSale,
      status: 'CONFIRMED',
    }

    beforeEach(() => {
      mockPrisma.sale.findUnique.mockResolvedValue(mockSale)
      mockPrisma.sale.update.mockResolvedValue(mockUpdatedSale)
      mockPrisma.user.findMany.mockResolvedValue([])
      vi.mocked(InventoryPool.updateStock).mockResolvedValue({} as any)
      vi.mocked(InventoryPool.getAvailableStock).mockResolvedValue(10)
      vi.mocked(ActivityLogger.log).mockResolvedValue()
      vi.mocked(dataSyncManager.syncData).mockResolvedValue()
    })

    it('should confirm a sale successfully', async () => {
      const result = await salesService.confirmSale('sale-1', 'user-1')

      expect(result).toEqual(mockUpdatedSale)
      expect(InventoryPool.updateStock).toHaveBeenCalledWith({
        productId: 'product-1',
        quantity: -2,
        reason: 'Sale confirmation #sale-1',
        userId: 'user-1',
      })
      expect(mockPrisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        data: { status: 'CONFIRMED' },
        include: expect.any(Object),
      })
      expect(ActivityLogger.log).toHaveBeenCalledWith({
        userId: 'user-1',
        module: 'sales',
        action: 'confirm',
        entityType: 'sale',
        entityId: 'sale-1',
        entityName: 'Sale #sale-1',
        details: expect.objectContaining({
          customerId: 'customer-1',
          customerName: 'John Doe',
          total: 287.5,
          itemCount: 1,
          previousStatus: 'DRAFT',
          newStatus: 'CONFIRMED',
          isLargeSale: false,
        }),
      })
    })

    it('should throw error if sale not found', async () => {
      mockPrisma.sale.findUnique.mockResolvedValue(null)

      await expect(salesService.confirmSale('sale-1', 'user-1')).rejects.toThrow('Sale not found')
    })

    it('should throw error if sale is not in draft status', async () => {
      mockPrisma.sale.findUnique.mockResolvedValue({ ...mockSale, status: 'CONFIRMED' })

      await expect(salesService.confirmSale('sale-1', 'user-1')).rejects.toThrow(
        'Sale is not in draft status'
      )
    })

    it('should handle large sale notifications', async () => {
      const largeSale = { ...mockSale, total: LARGE_SALE_THRESHOLD + 1000 }
      mockPrisma.sale.findUnique.mockResolvedValue(largeSale)
      mockPrisma.sale.update.mockResolvedValue({ ...largeSale, status: 'CONFIRMED' })

      await salesService.confirmSale('sale-1', 'user-1')

      expect(ActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            isLargeSale: true,
          }),
        })
      )
    })
  })

  describe('createInvoice', () => {
    const mockInvoiceData = {
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 2, price: 100 }],
      dueDate: new Date('2024-12-31'),
      notes: 'Test invoice',
      userId: 'user-1',
      activityContext: {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
    }

    const mockInvoice = {
      id: 'invoice-1',
      number: 'I-0001',
      customerId: 'customer-1',
      userId: 'user-1',
      status: 'DRAFT',
      subtotal: 200,
      tax: 30,
      total: 230,
      dueDate: new Date('2024-12-31'),
      notes: 'Test invoice',
      customer: {
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
        company: null,
      },
      user: {
        id: 'user-1',
        name: 'Test User',
      },
    }

    beforeEach(() => {
      mockPrisma.documentSequence.upsert.mockResolvedValue({
        prefix: 'I',
        currentNumber: 1,
      })
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice)
      mockPrisma.user.findMany.mockResolvedValue([])
      vi.mocked(ActivityLogger.log).mockResolvedValue()
      vi.mocked(dataSyncManager.syncData).mockResolvedValue()
    })

    it('should create an invoice successfully', async () => {
      const result = await salesService.createInvoice(mockInvoiceData)

      expect(result).toEqual(mockInvoice)
      expect(mockPrisma.documentSequence.upsert).toHaveBeenCalled()
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
        data: {
          number: 'I-0001',
          customerId: 'customer-1',
          userId: 'user-1',
          status: 'DRAFT',
          subtotal: 200,
          tax: 30,
          total: 230,
          dueDate: new Date('2024-12-31'),
          notes: 'Test invoice',
        },
        include: expect.any(Object),
      })
      expect(ActivityLogger.log).toHaveBeenCalledWith({
        userId: 'user-1',
        module: 'invoicing',
        action: 'create',
        entityType: 'invoice',
        entityId: 'invoice-1',
        entityName: 'Invoice I-0001',
        details: expect.objectContaining({
          customerId: 'customer-1',
          customerName: 'John Doe',
          subtotal: 200,
          tax: 30,
          total: 230,
          itemCount: 1,
          status: 'DRAFT',
        }),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      })
    })
  })

  describe('createQuote', () => {
    const mockQuoteData = {
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 2, price: 100 }],
      validUntil: new Date('2024-12-31'),
      notes: 'Test quote',
      userId: 'user-1',
      activityContext: {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
    }

    const mockQuote = {
      id: 'quote-1',
      number: 'Q-0001',
      customerId: 'customer-1',
      userId: 'user-1',
      status: 'DRAFT',
      subtotal: 200,
      tax: 30,
      total: 230,
      validUntil: new Date('2024-12-31'),
      notes: 'Test quote',
      customer: {
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
        company: null,
      },
      user: {
        id: 'user-1',
        name: 'Test User',
      },
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          price: 100,
          total: 200,
          product: { id: 'product-1', name: 'Product 1', sku: 'P001' },
        },
      ],
    }

    beforeEach(() => {
      mockPrisma.documentSequence.upsert.mockResolvedValue({
        prefix: 'Q',
        currentNumber: 1,
      })
      mockPrisma.quote.create.mockResolvedValue(mockQuote)
      vi.mocked(ActivityLogger.log).mockResolvedValue()
      vi.mocked(dataSyncManager.syncData).mockResolvedValue()
    })

    it('should create a quote successfully', async () => {
      const result = await salesService.createQuote(mockQuoteData)

      expect(result).toEqual(mockQuote)
      expect(mockPrisma.quote.create).toHaveBeenCalledWith({
        data: {
          number: 'Q-0001',
          customerId: 'customer-1',
          userId: 'user-1',
          status: 'DRAFT',
          subtotal: 200,
          tax: 30,
          total: 230,
          validUntil: new Date('2024-12-31'),
          notes: 'Test quote',
          items: {
            create: [{ productId: 'product-1', quantity: 2, price: 100, total: 200 }],
          },
        },
        include: expect.any(Object),
      })
    })
  })

  describe('convertQuoteToSale', () => {
    const mockQuote = {
      id: 'quote-1',
      number: 'Q-0001',
      customerId: 'customer-1',
      status: 'SENT',
      total: 230,
      customer: {
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
        company: null,
      },
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          price: 100,
          product: { id: 'product-1', name: 'Product 1' },
        },
      ],
    }

    const mockSale = {
      id: 'sale-1',
      customerId: 'customer-1',
      status: 'DRAFT',
      total: 230,
    }

    beforeEach(() => {
      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote)
      
      // Mock the createSale method
      vi.spyOn(salesService, 'createSale').mockResolvedValue(mockSale as any)
      vi.mocked(ActivityLogger.log).mockResolvedValue()
    })

    it('should convert quote to sale successfully', async () => {
      mockPrisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'ACCEPTED' })
      
      const result = await salesService.convertQuoteToSale('quote-1', 'user-1')

      expect(result.sale).toEqual(mockSale)
      expect(result.quote.status).toBe('ACCEPTED')
      expect(salesService.createSale).toHaveBeenCalledWith({
        customerId: 'customer-1',
        items: [{ productId: 'product-1', quantity: 2, price: 100 }],
        notes: 'Converted from Quote Q-0001',
        userId: 'user-1',
        activityContext: undefined,
      })
      expect(mockPrisma.quote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: { status: 'ACCEPTED' },
      })
    })

    it('should throw error if quote not found', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(null)

      await expect(salesService.convertQuoteToSale('quote-1', 'user-1')).rejects.toThrow(
        'Quote not found'
      )
    })

    it('should throw error if quote cannot be converted', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue({ ...mockQuote, status: 'ACCEPTED' })

      await expect(salesService.convertQuoteToSale('quote-1', 'user-1')).rejects.toThrow(
        'Quote cannot be converted to sale'
      )
    })
  })

  describe('getTranslatedDocumentContent', () => {
    beforeEach(() => {
      const mockTranslationManager = {
        getTranslations: vi.fn().mockResolvedValue({
          'invoice.title': 'Faktuur',
          'invoice.date': 'Datum',
          'invoice.customer': 'Kliënt',
        }),
      }
      // @ts-ignore - accessing private property for testing
      salesService.translationManager = mockTranslationManager
    })

    it('should return translated document content', async () => {
      const result = await salesService.getTranslatedDocumentContent('invoice', 'af')

      expect(result).toEqual({
        title: 'Faktuur',
        labels: {
          date: 'Datum',
          customer: 'Kliënt',
          items: 'Items',
          subtotal: 'Subtotal',
          tax: 'VAT (15%)',
          total: 'Total',
          notes: 'Notes',
        },
      })
    })

    it('should fallback to default values for missing translations', async () => {
      const mockTranslationManager = {
        getTranslations: vi.fn().mockResolvedValue({}),
      }
      // @ts-ignore - accessing private property for testing
      salesService.translationManager = mockTranslationManager

      const result = await salesService.getTranslatedDocumentContent('invoice', 'en')

      expect(result).toEqual({
        title: 'INVOICE',
        labels: {
          date: 'Date',
          customer: 'Customer',
          items: 'Items',
          subtotal: 'Subtotal',
          tax: 'VAT (15%)',
          total: 'Total',
          notes: 'Notes',
        },
      })
    })
  })
})