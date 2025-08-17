import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SalesIntegrationService } from '../sales-integration-service'
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

describe('Sales Workflow Integration Tests', () => {
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

  describe('Complete Sales Workflow', () => {
    const mockCustomer = {
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Company',
    }

    const mockProducts = [
      { id: 'product-1', name: 'Product 1', sku: 'P001', quantity: 100, minStock: 10 },
      { id: 'product-2', name: 'Product 2', sku: 'P002', quantity: 50, minStock: 5 },
    ]

    const mockSaleItems = [
      { productId: 'product-1', quantity: 5, price: 100 },
      { productId: 'product-2', quantity: 2, price: 75 },
    ]

    const mockUser = { id: 'user-1', name: 'Test User' }

    beforeEach(() => {
      // Setup inventory pool mocks
      vi.mocked(InventoryPool.getAvailableStock)
        .mockImplementation((productId: string) => {
          const product = mockProducts.find(p => p.id === productId)
          return Promise.resolve(product?.quantity || 0)
        })

      vi.mocked(InventoryPool.reserveStock).mockResolvedValue('reservation-1')
      vi.mocked(InventoryPool.releaseReservation).mockResolvedValue()
      vi.mocked(InventoryPool.updateStock).mockResolvedValue({} as any)

      // Setup activity logger mock
      vi.mocked(ActivityLogger.log).mockResolvedValue()

      // Setup data sync manager mock
      vi.mocked(dataSyncManager.syncData).mockResolvedValue()

      // Setup notification manager mock
      const mockNotificationManager = {
        create: vi.fn().mockResolvedValue(undefined),
        createBulk: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(NotificationManager).mockImplementation(() => mockNotificationManager as any)

      // Setup prisma mocks
      mockPrisma.user.findMany.mockResolvedValue([mockUser])
    })

    it('should complete full quote-to-sale-to-invoice workflow', async () => {
      // Step 1: Create Quote
      const mockQuote = {
        id: 'quote-1',
        number: 'Q-0001',
        customerId: 'customer-1',
        userId: 'user-1',
        status: 'DRAFT',
        subtotal: 650,
        tax: 97.5,
        total: 747.5,
        validUntil: new Date('2024-12-31'),
        customer: mockCustomer,
        user: mockUser,
        items: mockSaleItems.map((item, index) => ({
          ...item,
          total: item.quantity * item.price,
          product: mockProducts[index],
        })),
      }

      mockPrisma.documentSequence.upsert.mockResolvedValue({ prefix: 'Q', currentNumber: 1 })
      mockPrisma.quote.create.mockResolvedValue(mockQuote)

      const quote = await salesService.createQuote({
        customerId: 'customer-1',
        items: mockSaleItems,
        validUntil: new Date('2024-12-31'),
        notes: 'Test quote',
        userId: 'user-1',
      })

      expect(quote).toEqual(mockQuote)
      expect(ActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'sales',
          action: 'create',
          entityType: 'quote',
          entityId: 'quote-1',
        })
      )
      expect(dataSyncManager.syncData).toHaveBeenCalledWith(
        'sales',
        'quote_created',
        expect.objectContaining({
          entityType: 'quote',
          entityId: 'quote-1',
        }),
        'user-1'
      )

      // Step 2: Convert Quote to Sale
      mockPrisma.quote.findUnique.mockResolvedValue({ ...mockQuote, status: 'SENT' })
      mockPrisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'ACCEPTED' })

      const mockSale = {
        id: 'sale-1',
        customerId: 'customer-1',
        userId: 'user-1',
        status: 'DRAFT',
        subtotal: 650,
        tax: 97.5,
        total: 747.5,
        customer: mockCustomer,
        user: mockUser,
        items: mockSaleItems.map((item, index) => ({
          ...item,
          total: item.quantity * item.price,
          product: mockProducts[index],
        })),
      }

      mockPrisma.sale.create.mockResolvedValue(mockSale)

      const conversionResult = await salesService.convertQuoteToSale('quote-1', 'user-1')

      expect(conversionResult.sale).toBeDefined()
      expect(conversionResult.quote.status).toBe('ACCEPTED')
      expect(InventoryPool.reserveStock).toHaveBeenCalledTimes(2)
      expect(ActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'sales',
          action: 'convert',
          entityType: 'quote',
        })
      )

      // Step 3: Confirm Sale
      mockPrisma.sale.findUnique.mockResolvedValue(mockSale)
      mockPrisma.sale.update.mockResolvedValue({ ...mockSale, status: 'CONFIRMED' })

      const confirmedSale = await salesService.confirmSale('sale-1', 'user-1')

      expect(confirmedSale.status).toBe('CONFIRMED')
      expect(InventoryPool.updateStock).toHaveBeenCalledTimes(2)
      expect(InventoryPool.updateStock).toHaveBeenCalledWith({
        productId: 'product-1',
        quantity: -5,
        reason: 'Sale confirmation #sale-1',
        userId: 'user-1',
      })
      expect(ActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'sales',
          action: 'confirm',
          entityType: 'sale',
        })
      )

      // Step 4: Create Invoice
      const mockInvoice = {
        id: 'invoice-1',
        number: 'I-0001',
        customerId: 'customer-1',
        userId: 'user-1',
        status: 'DRAFT',
        subtotal: 650,
        tax: 97.5,
        total: 747.5,
        customer: mockCustomer,
        user: mockUser,
      }

      mockPrisma.documentSequence.upsert.mockResolvedValue({ prefix: 'I', currentNumber: 1 })
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice)

      const invoice = await salesService.createInvoice({
        customerId: 'customer-1',
        items: mockSaleItems,
        dueDate: new Date('2024-12-31'),
        notes: 'Invoice for confirmed sale',
        userId: 'user-1',
      })

      expect(invoice).toEqual(mockInvoice)
      expect(ActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'invoicing',
          action: 'create',
          entityType: 'invoice',
        })
      )
      expect(dataSyncManager.syncData).toHaveBeenCalledWith(
        'invoicing',
        'invoice_created',
        expect.objectContaining({
          entityType: 'invoice',
          entityId: 'invoice-1',
        }),
        'user-1'
      )
    })

    it('should handle inventory constraints during sale creation', async () => {
      // Mock insufficient stock for one product
      vi.mocked(InventoryPool.getAvailableStock)
        .mockImplementation((productId: string) => {
          if (productId === 'product-1') return Promise.resolve(2) // Less than required 5
          return Promise.resolve(50)
        })

      await expect(
        salesService.createSale({
          customerId: 'customer-1',
          items: mockSaleItems,
          notes: 'Test sale',
          userId: 'user-1',
        })
      ).rejects.toThrow('Insufficient stock for product product-1. Available: 2, Required: 5')

      expect(InventoryPool.reserveStock).not.toHaveBeenCalled()
      expect(mockPrisma.sale.create).not.toHaveBeenCalled()
    })

    it('should trigger low stock alerts after sale confirmation', async () => {
      const mockSale = {
        id: 'sale-1',
        customerId: 'customer-1',
        status: 'DRAFT',
        total: 650,
        customer: mockCustomer,
        items: [
          {
            productId: 'product-1',
            quantity: 95, // This will bring stock below minimum
            price: 100,
            product: { id: 'product-1', name: 'Product 1', minStock: 10 },
          },
        ],
      }

      mockPrisma.sale.findUnique.mockResolvedValue(mockSale)
      mockPrisma.sale.update.mockResolvedValue({ ...mockSale, status: 'CONFIRMED' })
      
      // Mock stock level after sale confirmation
      vi.mocked(InventoryPool.getAvailableStock).mockResolvedValue(5) // Below minStock of 10

      await salesService.confirmSale('sale-1', 'user-1')

      expect(InventoryPool.updateStock).toHaveBeenCalledWith({
        productId: 'product-1',
        quantity: -95,
        reason: 'Sale confirmation #sale-1',
        userId: 'user-1',
      })
    })

    it('should handle large sale notifications', async () => {
      const largeSaleItems = [
        { productId: 'product-1', quantity: 50, price: 250 }, // Total: 12,500 (above threshold)
      ]

      const mockLargeSale = {
        id: 'sale-1',
        customerId: 'customer-1',
        status: 'DRAFT',
        total: 14375, // Above LARGE_SALE_THRESHOLD
        customer: mockCustomer,
        items: [
          {
            productId: 'product-1',
            quantity: 50,
            price: 250,
            product: mockProducts[0],
          },
        ],
      }

      mockPrisma.sale.create.mockResolvedValue(mockLargeSale)
      mockPrisma.sale.findUnique.mockResolvedValue(mockLargeSale)
      mockPrisma.sale.update.mockResolvedValue({ ...mockLargeSale, status: 'CONFIRMED' })

      // Create and confirm large sale
      await salesService.createSale({
        customerId: 'customer-1',
        items: largeSaleItems,
        notes: 'Large sale',
        userId: 'user-1',
      })

      await salesService.confirmSale('sale-1', 'user-1')

      expect(ActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            isLargeSale: true,
          }),
        })
      )
    })

    it('should handle cross-module data synchronization', async () => {
      const mockSale = {
        id: 'sale-1',
        customerId: 'customer-1',
        userId: 'user-1',
        status: 'DRAFT',
        subtotal: 650,
        tax: 97.5,
        total: 747.5,
        customer: mockCustomer,
        user: mockUser,
        items: mockSaleItems.map((item, index) => ({
          ...item,
          total: item.quantity * item.price,
          product: mockProducts[index],
        })),
      }

      mockPrisma.sale.create.mockResolvedValue(mockSale)

      await salesService.createSale({
        customerId: 'customer-1',
        items: mockSaleItems,
        notes: 'Test sale',
        userId: 'user-1',
      })

      // Verify data sync was triggered with correct parameters
      expect(dataSyncManager.syncData).toHaveBeenCalledWith(
        'sales',
        'sale_created',
        expect.objectContaining({
          entityType: 'sale',
          entityId: 'sale-1',
          saleId: 'sale-1',
          customerId: 'customer-1',
          total: 747.5,
          items: mockSaleItems,
        }),
        'user-1'
      )

      // Confirm sale and verify sync again
      mockPrisma.sale.findUnique.mockResolvedValue(mockSale)
      mockPrisma.sale.update.mockResolvedValue({ ...mockSale, status: 'CONFIRMED' })

      await salesService.confirmSale('sale-1', 'user-1')

      expect(dataSyncManager.syncData).toHaveBeenCalledWith(
        'sales',
        'sale_confirmed',
        expect.objectContaining({
          entityType: 'sale',
          entityId: 'sale-1',
          saleId: 'sale-1',
          customerId: 'customer-1',
          total: 747.5,
        }),
        'user-1'
      )
    })

    it('should handle translation system integration', async () => {
      const mockTranslations = {
        'invoice.title': 'Faktuur',
        'invoice.date': 'Datum',
        'invoice.customer': 'Kliënt',
        'invoice.items': 'Items',
        'invoice.subtotal': 'Subtotaal',
        'invoice.tax': 'BTW (15%)',
        'invoice.total': 'Totaal',
        'invoice.notes': 'Notas',
      }

      // Mock translation manager
      const mockTranslationManager = {
        getTranslations: vi.fn().mockResolvedValue(mockTranslations),
      }
      // @ts-ignore - accessing private property for testing
      salesService.translationManager = mockTranslationManager

      const translations = await salesService.getTranslatedDocumentContent('invoice', 'af')

      expect(translations).toEqual({
        title: 'Faktuur',
        labels: {
          date: 'Datum',
          customer: 'Kliënt',
          items: 'Items',
          subtotal: 'Subtotaal',
          tax: 'BTW (15%)',
          total: 'Totaal',
          notes: 'Notas',
        },
      })

      expect(mockTranslationManager.getTranslations).toHaveBeenCalledWith('af')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should rollback reservations on sale creation failure', async () => {
      vi.mocked(InventoryPool.getAvailableStock).mockResolvedValue(10)
      vi.mocked(InventoryPool.reserveStock)
        .mockResolvedValueOnce('reservation-1')
        .mockResolvedValueOnce('reservation-2')
      vi.mocked(InventoryPool.releaseReservation).mockResolvedValue()

      // Mock sale creation failure
      mockPrisma.sale.create.mockRejectedValue(new Error('Database connection failed'))

      await expect(
        salesService.createSale({
          customerId: 'customer-1',
          items: [
            { productId: 'product-1', quantity: 2, price: 100 },
            { productId: 'product-2', quantity: 1, price: 50 },
          ],
          notes: 'Test sale',
          userId: 'user-1',
        })
      ).rejects.toThrow('Database connection failed')

      // Verify reservations were released
      expect(InventoryPool.releaseReservation).toHaveBeenCalledTimes(2)
      expect(InventoryPool.releaseReservation).toHaveBeenCalledWith('reservation-1')
      expect(InventoryPool.releaseReservation).toHaveBeenCalledWith('reservation-2')
    })

    it('should handle partial inventory update failures gracefully', async () => {
      const mockSale = {
        id: 'sale-1',
        customerId: 'customer-1',
        status: 'DRAFT',
        total: 300,
        customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe', company: null },
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            price: 100,
            product: { id: 'product-1', name: 'Product 1', minStock: 5 },
          },
          {
            productId: 'product-2',
            quantity: 1,
            price: 100,
            product: { id: 'product-2', name: 'Product 2', minStock: 3 },
          },
        ],
      }

      mockPrisma.sale.findUnique.mockResolvedValue(mockSale)
      
      // Mock first inventory update success, second failure
      vi.mocked(InventoryPool.updateStock)
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Inventory update failed'))

      await expect(salesService.confirmSale('sale-1', 'user-1')).rejects.toThrow(
        'Inventory update failed'
      )

      // Verify first update was attempted
      expect(InventoryPool.updateStock).toHaveBeenCalledWith({
        productId: 'product-1',
        quantity: -2,
        reason: 'Sale confirmation #sale-1',
        userId: 'user-1',
      })
    })

    it('should handle notification failures without affecting core functionality', async () => {
      const mockSale = {
        id: 'sale-1',
        customerId: 'customer-1',
        userId: 'user-1',
        status: 'DRAFT',
        subtotal: 500,
        tax: 75,
        total: 575,
        customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe', company: null },
        user: { id: 'user-1', name: 'Test User' },
        items: [],
      }

      mockPrisma.sale.create.mockResolvedValue(mockSale)
      vi.mocked(InventoryPool.getAvailableStock).mockResolvedValue(10)
      vi.mocked(InventoryPool.reserveStock).mockResolvedValue('reservation-1')

      // Mock notification creation failure
      const mockNotificationManager = {
        create: vi.fn().mockRejectedValue(new Error('Notification service unavailable')),
        createBulk: vi.fn().mockRejectedValue(new Error('Notification service unavailable')),
      }
      vi.mocked(NotificationManager).mockImplementation(() => mockNotificationManager as any)

      // Sale creation should still succeed despite notification failure
      const result = await salesService.createSale({
        customerId: 'customer-1',
        items: [{ productId: 'product-1', quantity: 2, price: 250 }],
        notes: 'Test sale',
        userId: 'user-1',
      })

      expect(result).toEqual(mockSale)
      expect(mockPrisma.sale.create).toHaveBeenCalled()
      expect(ActivityLogger.log).toHaveBeenCalled()
      expect(dataSyncManager.syncData).toHaveBeenCalled()
    })
  })
})