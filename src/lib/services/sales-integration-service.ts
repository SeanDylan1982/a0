import { prisma } from '@/lib/prisma'
import { InventoryPool } from './inventory-pool'
import { ActivityLogger } from './activity-logger'
import { NotificationManager } from './notification-manager'
import { AccessControlManager } from './access-control-manager'
import { TranslationManager, SupportedLanguage } from './translation-manager'
import { dataSyncManager } from './data-sync-manager'
import { 
  createNotificationFromTemplate, 
  createBulkNotificationsFromTemplate
} from '@/lib/utils/notification-utils'

// Large sale threshold for notifications (R10,000)
export const LARGE_SALE_THRESHOLD = 10000

export interface SaleItem {
  productId: string
  quantity: number
  price: number
  total?: number
}

export interface SaleData {
  customerId: string
  items: SaleItem[]
  notes?: string
  userId: string
  activityContext?: {
    ipAddress?: string
    userAgent?: string
  }
}

export interface InvoiceData {
  customerId: string
  items: SaleItem[]
  dueDate?: Date
  notes?: string
  userId: string
  activityContext?: {
    ipAddress?: string
    userAgent?: string
  }
}

export interface QuoteData {
  customerId: string
  items: SaleItem[]
  validUntil: Date
  notes?: string
  userId: string
  activityContext?: {
    ipAddress?: string
    userAgent?: string
  }
}

export class SalesIntegrationService {
  private notificationManager: NotificationManager
  private accessControl: AccessControlManager
  private translationManager: TranslationManager

  constructor() {
    this.notificationManager = new NotificationManager()
    this.accessControl = new AccessControlManager()
    this.translationManager = new TranslationManager()
  }

  /**
   * Create a sale with full integration
   */
  async createSale(saleData: SaleData) {
    const { customerId, items, notes, userId, activityContext } = saleData

    // Validate stock availability and reserve inventory
    const reservations: string[] = []
    try {
      for (const item of items) {
        const availableStock = await InventoryPool.getAvailableStock(item.productId)
        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}. Available: ${availableStock}, Required: ${item.quantity}`)
        }

        // Reserve stock for this sale
        const reservationId = await InventoryPool.reserveStock({
          productId: item.productId,
          quantity: item.quantity,
          reason: 'Sale reservation',
          userId,
          expirationMinutes: 30
        })
        reservations.push(reservationId)
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
      const tax = subtotal * 0.15 // 15% VAT for South Africa
      const total = subtotal + tax

      // Create the sale
      const sale = await prisma.sale.create({
        data: {
          customerId,
          userId,
          status: 'DRAFT',
          subtotal,
          tax,
          total,
          notes,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.quantity * item.price,
            }))
          }
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                }
              }
            }
          }
        }
      })

      // Log activity
      await ActivityLogger.log({
        userId,
        module: 'sales',
        action: 'create',
        entityType: 'sale',
        entityId: sale.id,
        entityName: `Sale #${sale.id}`,
        details: {
          customerId,
          customerName: sale.customer.company || `${sale.customer.firstName} ${sale.customer.lastName}`,
          subtotal,
          tax,
          total,
          itemCount: items.length,
          status: 'DRAFT'
        },
        ipAddress: activityContext?.ipAddress,
        userAgent: activityContext?.userAgent
      })

      // Trigger data sync
      await dataSyncManager.syncData('sales', 'sale_created', {
        entityType: 'sale',
        entityId: sale.id,
        saleId: sale.id,
        customerId,
        total,
        items
      }, userId)

      return sale

    } catch (error) {
      // Release any reservations if sale creation fails
      for (const reservationId of reservations) {
        try {
          await InventoryPool.releaseReservation(reservationId)
        } catch (releaseError) {
          console.error('Failed to release reservation:', releaseError)
        }
      }
      throw error
    }
  }

  /**
   * Confirm a sale and update inventory
   */
  async confirmSale(saleId: string, userId: string, activityContext?: { ipAddress?: string; userAgent?: string }) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!sale) {
      throw new Error('Sale not found')
    }

    if (sale.status !== 'DRAFT') {
      throw new Error('Sale is not in draft status')
    }

    // Update inventory for each item
    for (const item of sale.items) {
      await InventoryPool.updateStock({
        productId: item.productId,
        quantity: -item.quantity,
        reason: `Sale confirmation #${sale.id}`,
        userId
      })

      // Check for low stock alerts
      const currentStock = await InventoryPool.getAvailableStock(item.productId)
      if (currentStock <= item.product.minStock) {
        await this.handleLowStockAlert(item.productId, item.product.name, currentStock, item.product.minStock)
      }
    }

    // Update sale status
    const updatedSale = await prisma.sale.update({
      where: { id: saleId },
      data: { status: 'CONFIRMED' },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Handle large sale notifications
    if (sale.total >= LARGE_SALE_THRESHOLD) {
      await this.handleLargeSaleNotification(
        sale.id,
        sale.total,
        sale.customer.company || `${sale.customer.firstName} ${sale.customer.lastName}`,
        userId
      )
    }

    // Log activity
    await ActivityLogger.log({
      userId,
      module: 'sales',
      action: 'confirm',
      entityType: 'sale',
      entityId: sale.id,
      entityName: `Sale #${sale.id}`,
      details: {
        customerId: sale.customerId,
        customerName: sale.customer.company || `${sale.customer.firstName} ${sale.customer.lastName}`,
        total: sale.total,
        itemCount: sale.items.length,
        previousStatus: 'DRAFT',
        newStatus: 'CONFIRMED',
        isLargeSale: sale.total >= LARGE_SALE_THRESHOLD
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })

    // Trigger cross-module sync
    await dataSyncManager.syncData('sales', 'sale_confirmed', {
      entityType: 'sale',
      entityId: sale.id,
      saleId: sale.id,
      customerId: sale.customerId,
      total: sale.total,
      items: sale.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    }, userId)

    return updatedSale
  }

  /**
   * Create an invoice with full integration
   */
  async createInvoice(invoiceData: InvoiceData) {
    const { customerId, items, dueDate, notes, userId, activityContext } = invoiceData

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const tax = subtotal * 0.15
    const total = subtotal + tax

    // Generate invoice number
    const invoiceNumber = await this.generateDocumentNumber('INVOICE')

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        customerId,
        userId,
        status: 'DRAFT',
        subtotal,
        tax,
        total,
        dueDate,
        notes,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Log activity
    await ActivityLogger.log({
      userId,
      module: 'invoicing',
      action: 'create',
      entityType: 'invoice',
      entityId: invoice.id,
      entityName: `Invoice ${invoice.number}`,
      details: {
        customerId,
        customerName: invoice.customer.company || `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        subtotal,
        tax,
        total,
        itemCount: items.length,
        status: 'DRAFT',
        dueDate: dueDate?.toISOString()
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })

    // Notify accounting staff
    await this.handleInvoiceCreatedNotification(invoice.id, invoice.number, total, userId)

    // Trigger data sync
    await dataSyncManager.syncData('invoicing', 'invoice_created', {
      entityType: 'invoice',
      entityId: invoice.id,
      invoiceId: invoice.id,
      customerId,
      total,
      items
    }, userId)

    return invoice
  }

  /**
   * Create a quote with full integration
   */
  async createQuote(quoteData: QuoteData) {
    const { customerId, items, validUntil, notes, userId, activityContext } = quoteData

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const tax = subtotal * 0.15
    const total = subtotal + tax

    // Generate quote number
    const quoteNumber = await this.generateDocumentNumber('QUOTE')

    // Create the quote
    const quote = await prisma.quote.create({
      data: {
        number: quoteNumber,
        customerId,
        userId,
        status: 'DRAFT',
        subtotal,
        tax,
        total,
        validUntil,
        notes,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          }))
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              }
            }
          }
        }
      }
    })

    // Log activity
    await ActivityLogger.log({
      userId,
      module: 'sales',
      action: 'create',
      entityType: 'quote',
      entityId: quote.id,
      entityName: `Quote ${quote.number}`,
      details: {
        customerId,
        customerName: quote.customer.company || `${quote.customer.firstName} ${quote.customer.lastName}`,
        subtotal,
        tax,
        total,
        itemCount: items.length,
        status: 'DRAFT',
        validUntil: validUntil.toISOString()
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })

    // Trigger data sync
    await dataSyncManager.syncData('sales', 'quote_created', {
      entityType: 'quote',
      entityId: quote.id,
      quoteId: quote.id,
      customerId,
      total,
      items
    }, userId)

    return quote
  }

  /**
   * Convert quote to sale
   */
  async convertQuoteToSale(quoteId: string, userId: string, activityContext?: { ipAddress?: string; userAgent?: string }) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!quote) {
      throw new Error('Quote not found')
    }

    if (quote.status !== 'SENT' && quote.status !== 'DRAFT') {
      throw new Error('Quote cannot be converted to sale')
    }

    // Create sale from quote
    const saleData: SaleData = {
      customerId: quote.customerId,
      items: quote.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      notes: `Converted from Quote ${quote.number}`,
      userId,
      activityContext
    }

    const sale = await this.createSale(saleData)

    // Update quote status
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'ACCEPTED' }
    })

    // Log conversion activity
    await ActivityLogger.log({
      userId,
      module: 'sales',
      action: 'convert',
      entityType: 'quote',
      entityId: quoteId,
      entityName: `Quote ${quote.number}`,
      details: {
        convertedToSaleId: sale.id,
        customerId: quote.customerId,
        customerName: quote.customer.company || `${quote.customer.firstName} ${quote.customer.lastName}`,
        total: quote.total,
        previousStatus: quote.status,
        newStatus: 'ACCEPTED'
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })

    return { sale, quote: updatedQuote }
  }

  /**
   * Handle large sale notifications
   */
  private async handleLargeSaleNotification(saleId: string, amount: number, customerName: string, userId: string) {
    // Get sales managers and directors
    const salesManagers = await prisma.user.findMany({
      where: {
        role: {
          in: ['MANAGER', 'DIRECTOR', 'SALES_REP']
        },
        status: 'ACTIVE'
      },
      select: { id: true }
    })

    if (salesManagers.length > 0) {
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        'LARGE_SALE',
        salesManagers.map(u => u.id),
        {
          saleNumber: `#${saleId}`,
          amount: `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          customerName
        },
        {
          saleId,
          transactionType: 'sale',
          isLargeSale: true
        }
      )
    }
  }

  /**
   * Handle invoice created notifications
   */
  private async handleInvoiceCreatedNotification(invoiceId: string, invoiceNumber: string, total: number, userId: string) {
    // Get accounting staff
    const accountingStaff = await prisma.user.findMany({
      where: {
        role: {
          in: ['ACCOUNTANT', 'MANAGER', 'DIRECTOR']
        },
        status: 'ACTIVE'
      },
      select: { id: true }
    })

    if (accountingStaff.length > 0) {
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        'INVOICE_CREATED',
        accountingStaff.map(u => u.id),
        {
          invoiceNumber,
          amount: `R ${total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
        },
        {
          invoiceId,
          transactionType: 'invoice'
        }
      )
    }
  }

  /**
   * Handle low stock alerts
   */
  private async handleLowStockAlert(productId: string, productName: string, currentStock: number, minStock: number) {
    // Get inventory managers
    const inventoryManagers = await prisma.user.findMany({
      where: {
        role: {
          in: ['INVENTORY_MANAGER', 'MANAGER', 'DIRECTOR']
        },
        status: 'ACTIVE'
      },
      select: { id: true }
    })

    const templateKey = currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
    
    if (inventoryManagers.length > 0) {
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        templateKey,
        inventoryManagers.map(u => u.id),
        {
          productName,
          currentStock: currentStock.toString(),
          minStock: minStock.toString()
        },
        {
          productId,
          alertType: templateKey,
          currentStock,
          minStock
        }
      )
    }
  }

  /**
   * Generate document number
   */
  private async generateDocumentNumber(type: string): Promise<string> {
    const currentYear = new Date().getFullYear()
    
    const sequence = await prisma.documentSequence.upsert({
      where: { type },
      update: {
        currentNumber: { increment: 1 }
      },
      create: {
        type,
        prefix: type.charAt(0),
        currentNumber: 1,
        year: currentYear
      }
    })

    return `${sequence.prefix}-${sequence.currentNumber.toString().padStart(4, '0')}`
  }

  /**
   * Get translated document content
   */
  async getTranslatedDocumentContent(documentType: 'invoice' | 'quote' | 'sale', language: SupportedLanguage = 'en') {
    const translations = await this.translationManager.getTranslations(language)
    
    return {
      title: translations[`${documentType}.title`] || documentType.toUpperCase(),
      labels: {
        date: translations[`${documentType}.date`] || 'Date',
        customer: translations[`${documentType}.customer`] || 'Customer',
        items: translations[`${documentType}.items`] || 'Items',
        subtotal: translations[`${documentType}.subtotal`] || 'Subtotal',
        tax: translations[`${documentType}.tax`] || 'VAT (15%)',
        total: translations[`${documentType}.total`] || 'Total',
        notes: translations[`${documentType}.notes`] || 'Notes'
      }
    }
  }
}

export default SalesIntegrationService