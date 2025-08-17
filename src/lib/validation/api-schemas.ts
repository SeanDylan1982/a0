import { z } from 'zod'
import { UserRole, CustomerStatus, ProductStatus } from '@prisma/client'

/**
 * Common validation schemas for API endpoints
 */

// Base schemas
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
const emailSchema = z.string().email('Invalid email format')
const phoneSchema = z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,}$/, 'Invalid phone number format')
const currencySchema = z.number().min(0, 'Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places')

// User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Invalid user role' }) }),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
})

export const updateUserSchema = createUserSchema.partial().extend({
  id: objectIdSchema
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Customer schemas
export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().max(100, 'Company name must be less than 100 characters').optional(),
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  city: z.string().max(50, 'City must be less than 50 characters').optional(),
  state: z.string().max(50, 'State must be less than 50 characters').optional(),
  country: z.string().max(50, 'Country must be less than 50 characters').default('South Africa'),
  postalCode: z.string().max(10, 'Postal code must be less than 10 characters').optional(),
  taxId: z.string().max(20, 'Tax ID must be less than 20 characters').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  status: z.nativeEnum(CustomerStatus).default('ACTIVE')
})

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: objectIdSchema
})

// Product schemas
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100, 'Product name must be less than 100 characters'),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU must be less than 50 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  category: z.string().min(1, 'Category is required').max(50, 'Category must be less than 50 characters'),
  price: currencySchema,
  cost: currencySchema,
  quantity: z.number().int().min(0, 'Quantity must be non-negative').default(0),
  minStock: z.number().int().min(0, 'Minimum stock must be non-negative').default(0),
  maxStock: z.number().int().min(1, 'Maximum stock must be positive').default(1000),
  unit: z.string().max(20, 'Unit must be less than 20 characters').default('pcs'),
  barcode: z.string().max(50, 'Barcode must be less than 50 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  supplierId: objectIdSchema.optional(),
  status: z.nativeEnum(ProductStatus).default('ACTIVE')
})

export const updateProductSchema = createProductSchema.partial().extend({
  id: objectIdSchema
})

// Sale schemas
export const saleItemSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: currencySchema,
  discount: z.number().min(0).max(100, 'Discount must be between 0 and 100').default(0)
})

export const createSaleSchema = z.object({
  customerId: objectIdSchema,
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  discount: z.number().min(0).max(100, 'Discount must be between 0 and 100').default(0),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100').default(15) // South African VAT
})

export const updateSaleSchema = createSaleSchema.partial().extend({
  id: objectIdSchema,
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional()
})

// Inventory adjustment schemas
export const inventoryAdjustmentSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int(),
  reason: z.enum([
    'PURCHASE',
    'SALE',
    'ADJUSTMENT',
    'TRANSFER',
    'RETURN',
    'DAMAGE',
    'THEFT',
    'SPILLAGE',
    'BREAKAGE',
    'EXPIRED',
    'LOST',
    'FOUND',
    'CORRECTION'
  ], { errorMap: () => ({ message: 'Invalid adjustment reason' }) }),
  notes: z.string().max(200, 'Notes must be less than 200 characters').optional(),
  reference: z.string().max(50, 'Reference must be less than 50 characters').optional()
})

// Stock reservation schemas
export const stockReservationSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required').max(100, 'Reason must be less than 100 characters'),
  expiresAt: z.string().datetime('Invalid expiration date').optional()
})

// Notification schemas
export const createNotificationSchema = z.object({
  userId: objectIdSchema.optional(), // Optional for bulk notifications
  type: z.enum(['ACTIVITY', 'INVENTORY_ALERT', 'CALENDAR_REMINDER', 'MESSAGE', 'NOTICE_BOARD', 'SYSTEM']),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  message: z.string().min(1, 'Message is required').max(500, 'Message must be less than 500 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  data: z.record(z.any()).optional(),
  expiresAt: z.string().datetime('Invalid expiration date').optional()
})

export const bulkNotificationSchema = z.object({
  userIds: z.array(objectIdSchema).min(1, 'At least one user ID is required'),
  type: z.enum(['ACTIVITY', 'INVENTORY_ALERT', 'CALENDAR_REMINDER', 'MESSAGE', 'NOTICE_BOARD', 'SYSTEM']),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  message: z.string().min(1, 'Message is required').max(500, 'Message must be less than 500 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  data: z.record(z.any()).optional(),
  expiresAt: z.string().datetime('Invalid expiration date').optional()
})

// Translation schemas
export const createTranslationSchema = z.object({
  key: z.string().min(1, 'Translation key is required').max(200, 'Key must be less than 200 characters'),
  language: z.enum(['en', 'af', 'zu'], { errorMap: () => ({ message: 'Supported languages: en, af, zu' }) }),
  value: z.string().min(1, 'Translation value is required').max(1000, 'Value must be less than 1000 characters'),
  module: z.string().max(50, 'Module must be less than 50 characters').optional()
})

export const bulkTranslationSchema = z.object({
  translations: z.array(createTranslationSchema).min(1, 'At least one translation is required')
})

// Settings schemas
export const companySettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name must be less than 100 characters'),
  registrationNumber: z.string().max(50, 'Registration number must be less than 50 characters').optional(),
  taxNumber: z.string().max(50, 'Tax number must be less than 50 characters').optional(),
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  city: z.string().max(50, 'City must be less than 50 characters').optional(),
  state: z.string().max(50, 'State must be less than 50 characters').optional(),
  country: z.string().max(50, 'Country must be less than 50 characters').default('South Africa'),
  postalCode: z.string().max(10, 'Postal code must be less than 10 characters').optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  website: z.string().url('Invalid website URL').optional(),
  logo: z.string().url('Invalid logo URL').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').default('ZAR'),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100').default(15),
  language: z.enum(['en', 'af', 'zu']).default('en')
})

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1, 'Page must be at least 1').default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 100, 'Limit must be between 1 and 100').default('10'),
  search: z.string().max(100, 'Search term must be less than 100 characters').optional(),
  sortBy: z.string().max(50, 'Sort field must be less than 50 characters').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const dateRangeSchema = z.object({
  startDate: z.string().datetime('Invalid start date').optional(),
  endDate: z.string().datetime('Invalid end date').optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate)
  }
  return true
}, 'Start date must be before end date')

// Activity filter schemas
export const activityFilterSchema = z.object({
  module: z.string().max(50, 'Module must be less than 50 characters').optional(),
  action: z.string().max(50, 'Action must be less than 50 characters').optional(),
  entityType: z.string().max(50, 'Entity type must be less than 50 characters').optional(),
  userId: objectIdSchema.optional()
}).merge(dateRangeSchema).merge(paginationSchema)

// Notification filter schemas
export const notificationFilterSchema = z.object({
  type: z.enum(['ACTIVITY', 'INVENTORY_ALERT', 'CALENDAR_REMINDER', 'MESSAGE', 'NOTICE_BOARD', 'SYSTEM']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  read: z.string().transform(val => val === 'true').optional()
}).merge(dateRangeSchema).merge(paginationSchema)

/**
 * Schema validation middleware helper
 */
export function validateSchema<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
        
        const validationError = new Error('Validation failed')
        ;(validationError as any).errors = formattedErrors
        ;(validationError as any).code = 'VALIDATION_ERROR'
        throw validationError
      }
      throw error
    }
  }
}

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  objectId: /^[0-9a-fA-F]{24}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[0-9\s\-\(\)]{10,}$/,
  sku: /^[A-Z0-9\-_]{3,50}$/,
  currency: /^\d+(\.\d{1,2})?$/
} as const

/**
 * Error messages for translations
 */
export const VALIDATION_ERROR_KEYS = {
  REQUIRED: 'validation.required',
  INVALID_FORMAT: 'validation.invalid_format',
  TOO_SHORT: 'validation.too_short',
  TOO_LONG: 'validation.too_long',
  INVALID_EMAIL: 'validation.invalid_email',
  INVALID_PHONE: 'validation.invalid_phone',
  INVALID_CURRENCY: 'validation.invalid_currency',
  INVALID_DATE: 'validation.invalid_date',
  INVALID_ENUM: 'validation.invalid_enum',
  DUPLICATE_VALUE: 'validation.duplicate_value',
  NOT_FOUND: 'validation.not_found'
} as const