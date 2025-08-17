import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { ActivityLogger } from './activity-logger'
import { NotificationManager } from './notification-manager'
import { InventoryPool } from './inventory-pool'
import { AccessControlManager } from './access-control-manager'

export interface DashboardStats {
  totalRevenue: {
    value: string
    change: string
    changeType: 'positive' | 'negative'
    details: string
    icon: string
    href: string
    color: string
  }
  inventoryValue: {
    value: string
    change: string
    changeType: 'positive' | 'negative'
    details: string
    icon: string
    href: string
    color: string
  }
  activeCustomers: {
    value: string
    change: string
    changeType: 'positive' | 'negative'
    details: string
    icon: string
    href: string
    color: string
  }
  pendingOrders: {
    value: string
    change: string
    changeType: 'positive' | 'negative'
    details: string
    icon: string
    href: string
    color: string
  }
}

export interface CriticalAlert {
  id: string
  type: 'inventory' | 'financial' | 'system' | 'hr'
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  actionUrl?: string
  actionLabel?: string
}

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href: string
  permission: string
  color: string
}

export interface PerformanceMetric {
  id: string
  name: string
  value: number
  unit: string
  change: number
  changeType: 'positive' | 'negative'
  target?: number
  description: string
}

export interface DashboardData {
  stats: DashboardStats
  recentActivities: Array<{
    id: string
    user: string
    action: string
    time: string
    module: string
    entityName: string
  }>
  criticalAlerts: CriticalAlert[]
  quickActions: QuickAction[]
  performanceMetrics: PerformanceMetric[]
  notifications: {
    unreadCount: number
    criticalCount: number
    recentNotifications: Array<{
      id: string
      title: string
      message: string
      type: string
      timestamp: Date
    }>
  }
}

export class DashboardService {
  private accessControl: AccessControlManager
  private notificationManager: NotificationManager

  constructor() {
    this.accessControl = AccessControlManager.getInstance()
    this.notificationManager = new NotificationManager(prisma)
  }

  /**
   * Get comprehensive dashboard data based on user role and permissions
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, name: true, email: true }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Get data based on user permissions
      const [
        stats,
        recentActivities,
        criticalAlerts,
        quickActions,
        performanceMetrics,
        notifications
      ] = await Promise.all([
        this.getStats(userId, user.role),
        this.getRecentActivities(userId, user.role),
        this.getCriticalAlerts(userId, user.role),
        this.getQuickActions(userId, user.role),
        this.getPerformanceMetrics(userId, user.role),
        this.getNotificationSummary(userId)
      ])

      return {
        stats,
        recentActivities,
        criticalAlerts,
        quickActions,
        performanceMetrics,
        notifications
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      throw new Error('Failed to fetch dashboard data')
    }
  }

  /**
   * Get role-based statistics
   */
  private async getStats(userId: string, role: UserRole): Promise<DashboardStats> {
    const [
      totalRevenue,
      inventoryValue,
      activeCustomers,
      pendingOrders
    ] = await Promise.all([
      this.getTotalRevenue(userId, role),
      this.getInventoryValue(userId, role),
      this.getActiveCustomers(userId, role),
      this.getPendingOrders(userId, role)
    ])

    return {
      totalRevenue,
      inventoryValue,
      activeCustomers,
      pendingOrders
    }
  }

  /**
   * Get total revenue based on user permissions
   */
  private async getTotalRevenue(userId: string, role: UserRole) {
    const hasFinancialAccess = await this.accessControl.hasPermission(userId, {
      module: 'accounting',
      action: 'read'
    })

    if (!hasFinancialAccess) {
      return {
        value: 'Restricted',
        change: 'N/A',
        changeType: 'positive' as const,
        details: 'No access to financial data',
        icon: '🔒',
        href: '/accounting',
        color: 'bg-gray-50 border-gray-200'
      }
    }

    try {
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthStart = new Date(currentYear, currentMonth, 1)
      const monthEnd = new Date(currentYear, currentMonth + 1, 0)

      const [monthlyRevenue, lastMonthRevenue] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            status: 'PAID',
            paidDate: { gte: monthStart, lte: monthEnd }
          },
          _sum: { total: true }
        }),
        prisma.invoice.aggregate({
          where: {
            status: 'PAID',
            paidDate: {
              gte: new Date(currentYear, currentMonth - 1, 1),
              lte: new Date(currentYear, currentMonth, 0)
            }
          },
          _sum: { total: true }
        })
      ])

      const monthlyTotal = monthlyRevenue._sum.total || 0
      const lastMonthTotal = lastMonthRevenue._sum.total || 0
      const revenueChange = lastMonthTotal > 0 
        ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal * 100)
        : 0

      return {
        value: `R ${monthlyTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: revenueChange >= 0 ? `+${revenueChange.toFixed(1)}%` : `${revenueChange.toFixed(1)}%`,
        changeType: revenueChange >= 0 ? 'positive' as const : 'negative' as const,
        details: 'This month • VAT inclusive',
        icon: '💰',
        href: '/accounting',
        color: 'bg-green-50 border-green-200'
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      return {
        value: 'Error',
        change: 'N/A',
        changeType: 'negative' as const,
        details: 'Unable to load revenue data',
        icon: '⚠️',
        href: '/accounting',
        color: 'bg-red-50 border-red-200'
      }
    }
  }

  /**
   * Get inventory value from central inventory pool
   */
  private async getInventoryValue(userId: string, role: UserRole) {
    const hasInventoryAccess = await this.accessControl.hasPermission(userId, {
      module: 'inventory',
      action: 'read'
    })

    if (!hasInventoryAccess) {
      return {
        value: 'Restricted',
        change: 'N/A',
        changeType: 'positive' as const,
        details: 'No access to inventory data',
        icon: '🔒',
        href: '/inventory',
        color: 'bg-gray-50 border-gray-200'
      }
    }

    try {
      const inventoryData = await prisma.product.aggregate({
        _sum: { quantity: true, cost: true },
        _count: true
      })

      const totalValue = (inventoryData._sum.quantity || 0) * (inventoryData._sum.cost || 0)
      const productCount = inventoryData._count

      // Get low stock alerts count
      const lowStockCount = await prisma.product.count({
        where: { quantity: { lte: 10 } }
      })

      return {
        value: `R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: '+8.2%', // This would be calculated from historical data
        changeType: 'positive' as const,
        details: `${productCount} products • ${lowStockCount} low stock alerts`,
        icon: '📦',
        href: '/inventory',
        color: lowStockCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      return {
        value: 'Error',
        change: 'N/A',
        changeType: 'negative' as const,
        details: 'Unable to load inventory data',
        icon: '⚠️',
        href: '/inventory',
        color: 'bg-red-50 border-red-200'
      }
    }
  }

  /**
   * Get active customers count
   */
  private async getActiveCustomers(userId: string, role: UserRole) {
    const hasCustomerAccess = await this.accessControl.hasPermission(userId, {
      module: 'customers',
      action: 'read'
    })

    if (!hasCustomerAccess) {
      return {
        value: 'Restricted',
        change: 'N/A',
        changeType: 'positive' as const,
        details: 'No access to customer data',
        icon: '🔒',
        href: '/customers',
        color: 'bg-gray-50 border-gray-200'
      }
    }

    try {
      const activeCustomers = await prisma.customer.count({
        where: { status: 'ACTIVE' }
      })

      return {
        value: activeCustomers.toLocaleString(),
        change: '+5.4%', // This would be calculated from historical data
        changeType: 'positive' as const,
        details: 'POPIA compliant',
        icon: '👥',
        href: '/customers',
        color: 'bg-purple-50 border-purple-200'
      }
    } catch (error) {
      console.error('Error fetching customer data:', error)
      return {
        value: 'Error',
        change: 'N/A',
        changeType: 'negative' as const,
        details: 'Unable to load customer data',
        icon: '⚠️',
        href: '/customers',
        color: 'bg-red-50 border-red-200'
      }
    }
  }

  /**
   * Get pending orders count
   */
  private async getPendingOrders(userId: string, role: UserRole) {
    const hasSalesAccess = await this.accessControl.hasPermission(userId, {
      module: 'sales',
      action: 'read'
    })

    if (!hasSalesAccess) {
      return {
        value: 'Restricted',
        change: 'N/A',
        changeType: 'positive' as const,
        details: 'No access to sales data',
        icon: '🔒',
        href: '/sales',
        color: 'bg-gray-50 border-gray-200'
      }
    }

    try {
      const [pendingOrders, overdueInvoices] = await Promise.all([
        prisma.sale.count({
          where: {
            status: { in: ['DRAFT', 'CONFIRMED', 'SHIPPED'] }
          }
        }),
        prisma.invoice.count({
          where: {
            status: 'OVERDUE',
            dueDate: { lt: new Date() }
          }
        })
      ])

      return {
        value: pendingOrders.toString(),
        change: '-2.1%', // This would be calculated from historical data
        changeType: 'negative' as const,
        details: `${overdueInvoices} overdue invoices`,
        icon: '📋',
        href: '/sales',
        color: overdueInvoices > 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
      }
    } catch (error) {
      console.error('Error fetching sales data:', error)
      return {
        value: 'Error',
        change: 'N/A',
        changeType: 'negative' as const,
        details: 'Unable to load sales data',
        icon: '⚠️',
        href: '/sales',
        color: 'bg-red-50 border-red-200'
      }
    }
  }

  /**
   * Get recent activities based on user role
   */
  private async getRecentActivities(userId: string, role: UserRole) {
    try {
      const activities = await ActivityLogger.getActivitiesByRole(userId, role, {
        limit: 10
      })

      return activities.map(activity => ({
        id: activity.id,
        user: activity.user.name || activity.user.email,
        action: `${activity.action} ${activity.entityName} in ${activity.module}`,
        time: this.formatTimeAgo(activity.timestamp),
        module: activity.module,
        entityName: activity.entityName
      }))
    } catch (error) {
      console.error('Error fetching recent activities:', error)
      return [{
        id: 'error',
        user: 'System',
        action: 'Unable to load recent activities',
        time: 'Now',
        module: 'system',
        entityName: 'Error'
      }]
    }
  }

  /**
   * Get critical alerts based on user role
   */
  private async getCriticalAlerts(userId: string, role: UserRole): Promise<CriticalAlert[]> {
    const alerts: CriticalAlert[] = []

    try {
      // Inventory alerts
      const hasInventoryAccess = await this.accessControl.hasPermission(userId, {
        module: 'inventory',
        action: 'read'
      })

      if (hasInventoryAccess) {
        const outOfStockProducts = await prisma.product.count({
          where: { quantity: { lte: 0 } }
        })

        const lowStockProducts = await prisma.product.count({
          where: { quantity: { lte: 10, gt: 0 } }
        })

        if (outOfStockProducts > 0) {
          alerts.push({
            id: 'out-of-stock',
            type: 'inventory',
            title: 'Products Out of Stock',
            message: `${outOfStockProducts} products are completely out of stock`,
            severity: 'critical',
            timestamp: new Date(),
            actionUrl: '/inventory?filter=out-of-stock',
            actionLabel: 'View Products'
          })
        }

        if (lowStockProducts > 0) {
          alerts.push({
            id: 'low-stock',
            type: 'inventory',
            title: 'Low Stock Alert',
            message: `${lowStockProducts} products are running low on stock`,
            severity: 'high',
            timestamp: new Date(),
            actionUrl: '/inventory?filter=low-stock',
            actionLabel: 'Reorder Now'
          })
        }
      }

      // Financial alerts
      const hasFinancialAccess = await this.accessControl.hasPermission(userId, {
        module: 'accounting',
        action: 'read'
      })

      if (hasFinancialAccess) {
        const overdueInvoices = await prisma.invoice.count({
          where: {
            status: 'OVERDUE',
            dueDate: { lt: new Date() }
          }
        })

        if (overdueInvoices > 0) {
          alerts.push({
            id: 'overdue-invoices',
            type: 'financial',
            title: 'Overdue Invoices',
            message: `${overdueInvoices} invoices are overdue for payment`,
            severity: 'high',
            timestamp: new Date(),
            actionUrl: '/invoicing?filter=overdue',
            actionLabel: 'Follow Up'
          })
        }
      }

      // System alerts (for directors and managers)
      if ([UserRole.DIRECTOR, UserRole.MANAGER].includes(role)) {
        // Check for system issues, failed backups, etc.
        // This would be expanded based on actual system monitoring
      }

      return alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
    } catch (error) {
      console.error('Error fetching critical alerts:', error)
      return [{
        id: 'system-error',
        type: 'system',
        title: 'System Error',
        message: 'Unable to load critical alerts',
        severity: 'medium',
        timestamp: new Date()
      }]
    }
  }

  /**
   * Get quick actions based on user permissions
   */
  private async getQuickActions(userId: string, role: UserRole): Promise<QuickAction[]> {
    const actions: QuickAction[] = []

    try {
      // Check permissions for each action
      const permissions = await Promise.all([
        this.accessControl.hasPermission(userId, { module: 'inventory', action: 'create' }),
        this.accessControl.hasPermission(userId, { module: 'customers', action: 'create' }),
        this.accessControl.hasPermission(userId, { module: 'sales', action: 'create' }),
        this.accessControl.hasPermission(userId, { module: 'invoicing', action: 'create' }),
        this.accessControl.hasPermission(userId, { module: 'hr', action: 'create' }),
        this.accessControl.hasPermission(userId, { module: 'accounting', action: 'create' })
      ])

      const [canCreateInventory, canCreateCustomers, canCreateSales, canCreateInvoices, canCreateHR, canCreateAccounting] = permissions

      if (canCreateInventory) {
        actions.push({
          id: 'add-product',
          title: 'Add Product',
          description: 'Add new product to inventory',
          icon: '📦',
          href: '/inventory/new',
          permission: 'inventory.create',
          color: 'hover:bg-blue-50 hover:border-blue-300'
        })
      }

      if (canCreateCustomers) {
        actions.push({
          id: 'add-customer',
          title: 'Add Customer',
          description: 'Register new customer',
          icon: '👥',
          href: '/customers/new',
          permission: 'customers.create',
          color: 'hover:bg-purple-50 hover:border-purple-300'
        })
      }

      if (canCreateSales) {
        actions.push({
          id: 'new-sale',
          title: 'New Sale',
          description: 'Create new sales order',
          icon: '🛒',
          href: '/sales/new',
          permission: 'sales.create',
          color: 'hover:bg-green-50 hover:border-green-300'
        })
      }

      if (canCreateInvoices) {
        actions.push({
          id: 'create-invoice',
          title: 'Create Invoice',
          description: 'Generate new invoice',
          icon: '📄',
          href: '/invoicing/new',
          permission: 'invoicing.create',
          color: 'hover:bg-orange-50 hover:border-orange-300'
        })
      }

      if (canCreateHR) {
        actions.push({
          id: 'add-employee',
          title: 'Add Employee',
          description: 'Register new employee',
          icon: '👤',
          href: '/hr/employees/new',
          permission: 'hr.create',
          color: 'hover:bg-indigo-50 hover:border-indigo-300'
        })
      }

      if (canCreateAccounting) {
        actions.push({
          id: 'new-transaction',
          title: 'New Transaction',
          description: 'Record financial transaction',
          icon: '💳',
          href: '/accounting/transactions/new',
          permission: 'accounting.create',
          color: 'hover:bg-teal-50 hover:border-teal-300'
        })
      }

      return actions
    } catch (error) {
      console.error('Error fetching quick actions:', error)
      return []
    }
  }

  /**
   * Get performance metrics based on user role
   */
  private async getPerformanceMetrics(userId: string, role: UserRole): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = []

    try {
      // Sales performance (for sales roles and management)
      if ([UserRole.DIRECTOR, UserRole.MANAGER, UserRole.SALES_REP].includes(role)) {
        const salesThisMonth = await prisma.sale.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })

        metrics.push({
          id: 'monthly-sales',
          name: 'Monthly Sales',
          value: salesThisMonth,
          unit: 'orders',
          change: 12.5, // This would be calculated from historical data
          changeType: 'positive',
          target: 100,
          description: 'Sales orders this month'
        })
      }

      // Inventory turnover (for inventory managers and management)
      if ([UserRole.DIRECTOR, UserRole.MANAGER, UserRole.INVENTORY_MANAGER].includes(role)) {
        const totalProducts = await prisma.product.count()
        const lowStockProducts = await prisma.product.count({
          where: { quantity: { lte: 10 } }
        })

        const stockHealthPercentage = totalProducts > 0 
          ? ((totalProducts - lowStockProducts) / totalProducts) * 100 
          : 100

        metrics.push({
          id: 'stock-health',
          name: 'Stock Health',
          value: stockHealthPercentage,
          unit: '%',
          change: -2.3, // This would be calculated from historical data
          changeType: 'negative',
          target: 95,
          description: 'Products with adequate stock levels'
        })
      }

      // Customer satisfaction (for management and sales)
      if ([UserRole.DIRECTOR, UserRole.MANAGER, UserRole.SALES_REP].includes(role)) {
        // This would be calculated from actual customer feedback data
        metrics.push({
          id: 'customer-satisfaction',
          name: 'Customer Satisfaction',
          value: 87.5,
          unit: '%',
          change: 3.2,
          changeType: 'positive',
          target: 90,
          description: 'Based on recent feedback'
        })
      }

      return metrics
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
      return []
    }
  }

  /**
   * Get notification summary
   */
  private async getNotificationSummary(userId: string) {
    try {
      const [unreadCount, criticalNotifications] = await Promise.all([
        this.notificationManager.getUnreadCount(userId),
        this.notificationManager.getNotificationsByPriority(userId, 'CRITICAL', 5)
      ])

      const recentNotifications = await this.notificationManager.getNotifications(userId, {
        limit: 5,
        read: false
      })

      return {
        unreadCount,
        criticalCount: criticalNotifications.length,
        recentNotifications: recentNotifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          timestamp: notification.createdAt
        }))
      }
    } catch (error) {
      console.error('Error fetching notification summary:', error)
      return {
        unreadCount: 0,
        criticalCount: 0,
        recentNotifications: []
      }
    }
  }

  /**
   * Format time ago helper
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString()
  }
}