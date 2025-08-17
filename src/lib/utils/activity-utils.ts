import { ActivityLogger, ActivityLogData } from '@/lib/services/activity-logger'
import { UserRole } from '@prisma/client'

/**
 * Common activity types for consistent logging
 */
export const ACTIVITY_ACTIONS = {
  // CRUD operations
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  
  // Business operations
  APPROVE: 'approve',
  REJECT: 'reject',
  CANCEL: 'cancel',
  CONFIRM: 'confirm',
  SEND: 'send',
  RECEIVE: 'receive',
  
  // Inventory operations
  STOCK_IN: 'stock_in',
  STOCK_OUT: 'stock_out',
  ADJUST: 'adjust',
  RESERVE: 'reserve',
  RELEASE: 'release',
  
  // Financial operations
  PAYMENT: 'payment',
  REFUND: 'refund',
  INVOICE: 'invoice',
  
  // HR operations
  HIRE: 'hire',
  TERMINATE: 'terminate',
  LEAVE_REQUEST: 'leave_request',
  LEAVE_APPROVE: 'leave_approve',
  
  // System operations
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXPORT: 'export',
  IMPORT: 'import',
} as const

/**
 * Module names for consistent categorization
 */
export const MODULES = {
  INVENTORY: 'inventory',
  SALES: 'sales',
  INVOICING: 'invoicing',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  HR: 'hr',
  ACCOUNTING: 'accounting',
  CALENDAR: 'calendar',
  MESSAGING: 'messaging',
  NOTICE_BOARD: 'notice_board',
  USERS: 'users',
  SETTINGS: 'settings',
  DASHBOARD: 'dashboard',
  SYSTEM: 'system',
} as const

/**
 * Entity types for consistent categorization
 */
export const ENTITY_TYPES = {
  USER: 'user',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  PRODUCT: 'product',
  SALE: 'sale',
  INVOICE: 'invoice',
  QUOTE: 'quote',
  CREDIT_NOTE: 'credit_note',
  DELIVERY_NOTE: 'delivery_note',
  PURCHASE: 'purchase',
  PAYMENT: 'payment',
  EMPLOYEE: 'employee',
  LEAVE_REQUEST: 'leave_request',
  EVENT: 'event',
  NOTE: 'note',
  ACCOUNT: 'account',
  TRANSACTION: 'transaction',
  INVENTORY_LOG: 'inventory_log',
  STOCK_MOVEMENT: 'stock_movement',
  STOCK_RESERVATION: 'stock_reservation',
} as const

/**
 * Helper function to log inventory activities
 */
export async function logInventoryActivity(
  userId: string,
  action: string,
  productId: string,
  productName: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await ActivityLogger.log({
    userId,
    module: MODULES.INVENTORY,
    action,
    entityType: ENTITY_TYPES.PRODUCT,
    entityId: productId,
    entityName: productName,
    details,
    ipAddress,
    userAgent,
  })
}

/**
 * Helper function to log sales activities
 */
export async function logSalesActivity(
  userId: string,
  action: string,
  saleId: string,
  customerName: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await ActivityLogger.log({
    userId,
    module: MODULES.SALES,
    action,
    entityType: ENTITY_TYPES.SALE,
    entityId: saleId,
    entityName: `Sale to ${customerName}`,
    details,
    ipAddress,
    userAgent,
  })
}

/**
 * Helper function to log customer activities
 */
export async function logCustomerActivity(
  userId: string,
  action: string,
  customerId: string,
  customerName: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await ActivityLogger.log({
    userId,
    module: MODULES.CUSTOMERS,
    action,
    entityType: ENTITY_TYPES.CUSTOMER,
    entityId: customerId,
    entityName: customerName,
    details,
    ipAddress,
    userAgent,
  })
}

/**
 * Helper function to log HR activities
 */
export async function logHRActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await ActivityLogger.log({
    userId,
    module: MODULES.HR,
    action,
    entityType,
    entityId,
    entityName,
    details,
    ipAddress,
    userAgent,
  })
}

/**
 * Helper function to log system activities
 */
export async function logSystemActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await ActivityLogger.log({
    userId,
    module: MODULES.SYSTEM,
    action,
    entityType,
    entityId,
    entityName,
    details,
    ipAddress,
    userAgent,
  })
}

/**
 * Helper function to determine if a user can view activities based on role
 */
export function canViewActivities(userRole: UserRole, activityModule: string, activityUserId: string, currentUserId: string): boolean {
  switch (userRole) {
    case UserRole.DIRECTOR:
      return true // Directors can see all activities
    
    case UserRole.MANAGER:
      // Managers can see activities in their functional area
      // This would need more specific business logic
      return true
    
    case UserRole.HOD:
      // HODs can see activities in their department
      return true
    
    case UserRole.SALES_REP:
    case UserRole.INTERNAL_CONSULTANT:
      // Sales reps can see sales activities and their own
      return activityModule === MODULES.SALES || activityUserId === currentUserId
    
    case UserRole.INVENTORY_MANAGER:
      // Inventory managers can see inventory activities
      return activityModule === MODULES.INVENTORY || activityUserId === currentUserId
    
    case UserRole.HR_STAFF:
      // HR staff can see HR activities
      return activityModule === MODULES.HR || activityUserId === currentUserId
    
    case UserRole.ACCOUNTANT:
      // Accountants can see financial activities
      return [MODULES.ACCOUNTING, MODULES.INVOICING, MODULES.SALES].includes(activityModule as any) || activityUserId === currentUserId
    
    case UserRole.STAFF_MEMBER:
    case UserRole.USER:
    default:
      // Regular users can only see their own activities
      return activityUserId === currentUserId
  }
}

/**
 * Format activity details for display
 */
export function formatActivityDetails(action: string, entityType: string, details: Record<string, any>): string {
  switch (action) {
    case ACTIVITY_ACTIONS.CREATE:
      return `Created new ${entityType}`
    
    case ACTIVITY_ACTIONS.UPDATE:
      const changes = details.changes || {}
      const changedFields = Object.keys(changes).filter(key => key !== 'id' && key !== 'updatedAt')
      if (changedFields.length > 0) {
        return `Updated ${changedFields.join(', ')}`
      }
      return `Updated ${entityType}`
    
    case ACTIVITY_ACTIONS.DELETE:
      return `Deleted ${entityType}`
    
    case ACTIVITY_ACTIONS.APPROVE:
      return `Approved ${entityType}`
    
    case ACTIVITY_ACTIONS.REJECT:
      return `Rejected ${entityType}`
    
    case ACTIVITY_ACTIONS.STOCK_IN:
      return `Added ${details.quantity || 'stock'} units to inventory`
    
    case ACTIVITY_ACTIONS.STOCK_OUT:
      return `Removed ${details.quantity || 'stock'} units from inventory`
    
    case ACTIVITY_ACTIONS.ADJUST:
      return `Adjusted inventory by ${details.quantity || 'unknown'} units`
    
    case ACTIVITY_ACTIONS.PAYMENT:
      return `Processed payment of ${details.amount || 'unknown amount'}`
    
    default:
      return `Performed ${action} on ${entityType}`
  }
}

/**
 * Get activity icon based on action and module
 */
export function getActivityIcon(action: string, module: string): string {
  // Return icon names that can be used with Lucide React
  switch (action) {
    case ACTIVITY_ACTIONS.CREATE:
      return 'plus-circle'
    case ACTIVITY_ACTIONS.UPDATE:
      return 'edit'
    case ACTIVITY_ACTIONS.DELETE:
      return 'trash-2'
    case ACTIVITY_ACTIONS.APPROVE:
      return 'check-circle'
    case ACTIVITY_ACTIONS.REJECT:
      return 'x-circle'
    case ACTIVITY_ACTIONS.STOCK_IN:
      return 'arrow-up-circle'
    case ACTIVITY_ACTIONS.STOCK_OUT:
      return 'arrow-down-circle'
    case ACTIVITY_ACTIONS.PAYMENT:
      return 'credit-card'
    case ACTIVITY_ACTIONS.LOGIN:
      return 'log-in'
    case ACTIVITY_ACTIONS.LOGOUT:
      return 'log-out'
    default:
      switch (module) {
        case MODULES.INVENTORY:
          return 'package'
        case MODULES.SALES:
          return 'shopping-cart'
        case MODULES.CUSTOMERS:
          return 'users'
        case MODULES.HR:
          return 'user-check'
        case MODULES.ACCOUNTING:
          return 'calculator'
        default:
          return 'activity'
      }
  }
}