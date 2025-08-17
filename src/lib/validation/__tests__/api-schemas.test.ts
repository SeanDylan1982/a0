import { describe, it, expect } from 'vitest'
import {
  createUserSchema,
  updateUserSchema,
  loginSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createProductSchema,
  updateProductSchema,
  createSaleSchema,
  updateSaleSchema,
  inventoryAdjustmentSchema,
  stockReservationSchema,
  createNotificationSchema,
  bulkNotificationSchema,
  createTranslationSchema,
  bulkTranslationSchema,
  companySettingsSchema,
  paginationSchema,
  dateRangeSchema,
  activityFilterSchema,
  notificationFilterSchema,
  validateSchema,
  VALIDATION_PATTERNS
} from '../api-schemas'
import { UserRole, CustomerStatus, ProductStatus } from '@prisma/client'

describe('API Validation Schemas', () => {
  describe('User Schemas', () => {
    describe('createUserSchema', () => {
      it('should validate valid user data', () => {
        const validUser = {
          email: 'test@example.com',
          name: 'Test User',
          role: UserRole.MANAGER,
          status: 'ACTIVE'
        }

        expect(() => createUserSchema.parse(validUser)).not.toThrow()
      })

      it('should reject invalid email', () => {
        const invalidUser = {
          email: 'invalid-email',
          name: 'Test User',
          role: UserRole.MANAGER
        }

        expect(() => createUserSchema.parse(invalidUser)).toThrow()
      })

      it('should reject short name', () => {
        const invalidUser = {
          email: 'test@example.com',
          name: 'T',
          role: UserRole.MANAGER
        }

        expect(() => createUserSchema.parse(invalidUser)).toThrow()
      })

      it('should reject invalid role', () => {
        const invalidUser = {
          email: 'test@example.com',
          name: 'Test User',
          role: 'INVALID_ROLE'
        }

        expect(() => createUserSchema.parse(invalidUser)).toThrow()
      })
    })

    describe('loginSchema', () => {
      it('should validate valid login data', () => {
        const validLogin = {
          email: 'test@example.com',
          password: 'password123'
        }

        expect(() => loginSchema.parse(validLogin)).not.toThrow()
      })

      it('should reject missing password', () => {
        const invalidLogin = {
          email: 'test@example.com'
        }

        expect(() => loginSchema.parse(invalidLogin)).toThrow()
      })
    })
  })

  describe('Customer Schemas', () => {
    describe('createCustomerSchema', () => {
      it('should validate valid customer data', () => {
        const validCustomer = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+27123456789',
          company: 'Test Company',
          country: 'South Africa'
        }

        expect(() => createCustomerSchema.parse(validCustomer)).not.toThrow()
      })

      it('should require firstName and lastName', () => {
        const invalidCustomer = {
          email: 'john@example.com'
        }

        expect(() => createCustomerSchema.parse(invalidCustomer)).toThrow()
      })

      it('should default country to South Africa', () => {
        const customer = {
          firstName: 'John',
          lastName: 'Doe'
        }

        const result = createCustomerSchema.parse(customer)
        expect(result.country).toBe('South Africa')
      })

      it('should validate phone number format', () => {
        const invalidCustomer = {
          firstName: 'John',
          lastName: 'Doe',
          phone: '123' // Too short
        }

        expect(() => createCustomerSchema.parse(invalidCustomer)).toThrow()
      })
    })
  })

  describe('Product Schemas', () => {
    describe('createProductSchema', () => {
      it('should validate valid product data', () => {
        const validProduct = {
          name: 'Test Product',
          sku: 'TEST-001',
          category: 'Electronics',
          price: 99.99,
          cost: 50.00,
          quantity: 100,
          minStock: 10,
          maxStock: 1000
        }

        expect(() => createProductSchema.parse(validProduct)).not.toThrow()
      })

      it('should require name, sku, category, price, and cost', () => {
        const invalidProduct = {
          name: 'Test Product'
          // Missing required fields
        }

        expect(() => createProductSchema.parse(invalidProduct)).toThrow()
      })

      it('should validate currency amounts', () => {
        const invalidProduct = {
          name: 'Test Product',
          sku: 'TEST-001',
          category: 'Electronics',
          price: -10, // Negative price
          cost: 50.00
        }

        expect(() => createProductSchema.parse(invalidProduct)).toThrow()
      })

      it('should validate stock quantities', () => {
        const invalidProduct = {
          name: 'Test Product',
          sku: 'TEST-001',
          category: 'Electronics',
          price: 99.99,
          cost: 50.00,
          quantity: -5 // Negative quantity
        }

        expect(() => createProductSchema.parse(invalidProduct)).toThrow()
      })
    })
  })

  describe('Sale Schemas', () => {
    describe('createSaleSchema', () => {
      it('should validate valid sale data', () => {
        const validSale = {
          customerId: '507f1f77bcf86cd799439011',
          items: [
            {
              productId: '507f1f77bcf86cd799439012',
              quantity: 2,
              price: 99.99
            }
          ]
        }

        expect(() => createSaleSchema.parse(validSale)).not.toThrow()
      })

      it('should require at least one item', () => {
        const invalidSale = {
          customerId: '507f1f77bcf86cd799439011',
          items: []
        }

        expect(() => createSaleSchema.parse(invalidSale)).toThrow()
      })

      it('should validate ObjectId format', () => {
        const invalidSale = {
          customerId: 'invalid-id',
          items: [
            {
              productId: '507f1f77bcf86cd799439012',
              quantity: 2,
              price: 99.99
            }
          ]
        }

        expect(() => createSaleSchema.parse(invalidSale)).toThrow()
      })

      it('should default tax rate to 15%', () => {
        const sale = {
          customerId: '507f1f77bcf86cd799439011',
          items: [
            {
              productId: '507f1f77bcf86cd799439012',
              quantity: 2,
              price: 99.99
            }
          ]
        }

        const result = createSaleSchema.parse(sale)
        expect(result.taxRate).toBe(15)
      })
    })
  })

  describe('Inventory Schemas', () => {
    describe('inventoryAdjustmentSchema', () => {
      it('should validate valid adjustment data', () => {
        const validAdjustment = {
          productId: '507f1f77bcf86cd799439011',
          quantity: -5,
          reason: 'DAMAGE',
          notes: 'Product damaged during handling'
        }

        expect(() => inventoryAdjustmentSchema.parse(validAdjustment)).not.toThrow()
      })

      it('should require valid adjustment reason', () => {
        const invalidAdjustment = {
          productId: '507f1f77bcf86cd799439011',
          quantity: -5,
          reason: 'INVALID_REASON'
        }

        expect(() => inventoryAdjustmentSchema.parse(invalidAdjustment)).toThrow()
      })
    })

    describe('stockReservationSchema', () => {
      it('should validate valid reservation data', () => {
        const validReservation = {
          productId: '507f1f77bcf86cd799439011',
          quantity: 10,
          reason: 'Sales order reservation'
        }

        expect(() => stockReservationSchema.parse(validReservation)).not.toThrow()
      })

      it('should require positive quantity', () => {
        const invalidReservation = {
          productId: '507f1f77bcf86cd799439011',
          quantity: 0,
          reason: 'Sales order reservation'
        }

        expect(() => stockReservationSchema.parse(invalidReservation)).toThrow()
      })
    })
  })

  describe('Notification Schemas', () => {
    describe('createNotificationSchema', () => {
      it('should validate valid notification data', () => {
        const validNotification = {
          userId: '507f1f77bcf86cd799439011',
          type: 'SYSTEM',
          title: 'Test Notification',
          message: 'This is a test notification',
          priority: 'MEDIUM'
        }

        expect(() => createNotificationSchema.parse(validNotification)).not.toThrow()
      })

      it('should default priority to MEDIUM', () => {
        const notification = {
          userId: '507f1f77bcf86cd799439011',
          type: 'SYSTEM',
          title: 'Test Notification',
          message: 'This is a test notification'
        }

        const result = createNotificationSchema.parse(notification)
        expect(result.priority).toBe('MEDIUM')
      })
    })

    describe('bulkNotificationSchema', () => {
      it('should validate bulk notification data', () => {
        const validBulkNotification = {
          userIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
          type: 'SYSTEM',
          title: 'Bulk Notification',
          message: 'This is a bulk notification'
        }

        expect(() => bulkNotificationSchema.parse(validBulkNotification)).not.toThrow()
      })

      it('should require at least one user ID', () => {
        const invalidBulkNotification = {
          userIds: [],
          type: 'SYSTEM',
          title: 'Bulk Notification',
          message: 'This is a bulk notification'
        }

        expect(() => bulkNotificationSchema.parse(invalidBulkNotification)).toThrow()
      })
    })
  })

  describe('Translation Schemas', () => {
    describe('createTranslationSchema', () => {
      it('should validate valid translation data', () => {
        const validTranslation = {
          key: 'common.save',
          language: 'en',
          value: 'Save',
          module: 'common'
        }

        expect(() => createTranslationSchema.parse(validTranslation)).not.toThrow()
      })

      it('should only allow supported languages', () => {
        const invalidTranslation = {
          key: 'common.save',
          language: 'fr', // Not supported
          value: 'Sauvegarder'
        }

        expect(() => createTranslationSchema.parse(invalidTranslation)).toThrow()
      })
    })
  })

  describe('Settings Schemas', () => {
    describe('companySettingsSchema', () => {
      it('should validate valid company settings', () => {
        const validSettings = {
          companyName: 'Test Company Ltd',
          registrationNumber: '2023/123456/07',
          taxNumber: '9876543210',
          country: 'South Africa',
          currency: 'ZAR',
          taxRate: 15
        }

        expect(() => companySettingsSchema.parse(validSettings)).not.toThrow()
      })

      it('should default to South African settings', () => {
        const settings = {
          companyName: 'Test Company Ltd'
        }

        const result = companySettingsSchema.parse(settings)
        expect(result.country).toBe('South Africa')
        expect(result.currency).toBe('ZAR')
        expect(result.taxRate).toBe(15)
        expect(result.language).toBe('en')
      })

      it('should validate tax rate range', () => {
        const invalidSettings = {
          companyName: 'Test Company Ltd',
          taxRate: 150 // Invalid tax rate
        }

        expect(() => companySettingsSchema.parse(invalidSettings)).toThrow()
      })
    })
  })

  describe('Query Parameter Schemas', () => {
    describe('paginationSchema', () => {
      it('should validate and transform pagination parameters', () => {
        const validPagination = {
          page: '2',
          limit: '20',
          search: 'test query',
          sortBy: 'createdAt',
          sortOrder: 'asc'
        }

        const result = paginationSchema.parse(validPagination)
        expect(result.page).toBe(2)
        expect(result.limit).toBe(20)
        expect(result.search).toBe('test query')
        expect(result.sortOrder).toBe('asc')
      })

      it('should apply defaults', () => {
        const result = paginationSchema.parse({})
        expect(result.page).toBe(1)
        expect(result.limit).toBe(10)
        expect(result.sortOrder).toBe('desc')
      })

      it('should validate limit range', () => {
        const invalidPagination = {
          limit: '200' // Exceeds maximum
        }

        expect(() => paginationSchema.parse(invalidPagination)).toThrow()
      })
    })

    describe('dateRangeSchema', () => {
      it('should validate date range', () => {
        const validDateRange = {
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-12-31T23:59:59Z'
        }

        expect(() => dateRangeSchema.parse(validDateRange)).not.toThrow()
      })

      it('should reject invalid date range', () => {
        const invalidDateRange = {
          startDate: '2023-12-31T23:59:59Z',
          endDate: '2023-01-01T00:00:00Z' // End before start
        }

        expect(() => dateRangeSchema.parse(invalidDateRange)).toThrow()
      })
    })
  })

  describe('validateSchema helper', () => {
    it('should validate data successfully', () => {
      const validator = validateSchema(createUserSchema)
      const validUser = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.MANAGER
      }

      expect(() => validator(validUser)).not.toThrow()
    })

    it('should throw formatted validation error', () => {
      const validator = validateSchema(createUserSchema)
      const invalidUser = {
        email: 'invalid-email',
        name: 'T' // Too short
      }

      try {
        validator(invalidUser)
        expect.fail('Should have thrown validation error')
      } catch (error: any) {
        expect(error.message).toBe('Validation failed')
        expect(error.code).toBe('VALIDATION_ERROR')
        expect(error.errors).toBeDefined()
        expect(Array.isArray(error.errors)).toBe(true)
      }
    })
  })

  describe('VALIDATION_PATTERNS', () => {
    it('should provide correct regex patterns', () => {
      expect(VALIDATION_PATTERNS.objectId.test('507f1f77bcf86cd799439011')).toBe(true)
      expect(VALIDATION_PATTERNS.objectId.test('invalid-id')).toBe(false)

      expect(VALIDATION_PATTERNS.email.test('test@example.com')).toBe(true)
      expect(VALIDATION_PATTERNS.email.test('invalid-email')).toBe(false)

      expect(VALIDATION_PATTERNS.phone.test('+27123456789')).toBe(true)
      expect(VALIDATION_PATTERNS.phone.test('123')).toBe(false)

      expect(VALIDATION_PATTERNS.sku.test('PROD-001')).toBe(true)
      expect(VALIDATION_PATTERNS.sku.test('invalid sku')).toBe(false)

      expect(VALIDATION_PATTERNS.currency.test('99.99')).toBe(true)
      expect(VALIDATION_PATTERNS.currency.test('99.999')).toBe(false)
    })
  })
})