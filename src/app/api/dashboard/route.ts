import { NextRequest, NextResponse } from 'next/server'
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { DashboardService } from '@/lib/services/dashboard-service'

async function handleGET(request: AuthenticatedRequest) {
  try {
    console.log('Dashboard API: Starting enhanced data fetch...')
    
    const userId = request.user?.id || 'mock-user-id'
    const dashboardService = new DashboardService()
    
    const dashboardData = await dashboardService.getDashboardData(userId)
    
    console.log('Dashboard API: Enhanced data fetched successfully')
    
    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Dashboard API: Error fetching dashboard data:', error)
    
    // Return enhanced fallback data when service is not available
    console.log('Dashboard API: Returning fallback data due to service error')
    
    return NextResponse.json({
      stats: {
        totalRevenue: {
          value: 'R 1,234,567.89',
          change: '+12.5%',
          changeType: 'positive',
          details: 'This month • VAT inclusive • Offline Mode',
          icon: '💰',
          href: '/accounting',
          color: 'bg-yellow-50 border-yellow-200'
        },
        inventoryValue: {
          value: 'R 856,420.00',
          change: '+8.2%',
          changeType: 'positive',
          details: '1,234 products • 15% VAT • Offline Mode',
          icon: '📦',
          href: '/inventory',
          color: 'bg-yellow-50 border-yellow-200'
        },
        activeCustomers: {
          value: '847',
          change: '+5.4%',
          changeType: 'positive',
          details: 'POPIA compliant • Offline Mode',
          icon: '👥',
          href: '/customers',
          color: 'bg-yellow-50 border-yellow-200'
        },
        pendingOrders: {
          value: '23',
          change: '-2.1%',
          changeType: 'negative',
          details: '3 overdue • 2 high priority • Offline Mode',
          icon: '📋',
          href: '/sales',
          color: 'bg-yellow-50 border-yellow-200'
        }
      },
      recentActivities: [
        { 
          id: '1', 
          user: 'System', 
          action: 'Service unavailable - showing cached data', 
          time: 'Just now',
          module: 'system',
          entityName: 'Error'
        },
        { 
          id: '2', 
          user: 'John Smith', 
          action: 'created sale for ABC Construction', 
          time: '2 minutes ago',
          module: 'sales',
          entityName: 'Sale #12345'
        },
        { 
          id: '3', 
          user: 'Sarah Johnson', 
          action: 'updated inventory for Product XYZ', 
          time: '15 minutes ago',
          module: 'inventory',
          entityName: 'Product XYZ'
        }
      ],
      criticalAlerts: [
        {
          id: 'system-offline',
          type: 'system',
          title: 'System Offline',
          message: 'Dashboard service is currently unavailable',
          severity: 'high',
          timestamp: new Date().toISOString()
        }
      ],
      quickActions: [
        {
          id: 'add-product',
          title: 'Add Product',
          description: 'Add new product to inventory',
          icon: '📦',
          href: '/inventory/new',
          permission: 'inventory.create',
          color: 'hover:bg-blue-50 hover:border-blue-300'
        }
      ],
      performanceMetrics: [],
      notifications: {
        unreadCount: 0,
        criticalCount: 0,
        recentNotifications: []
      },
      alerts: {
        lowStock: 5,
        overdueInvoices: 3,
        databaseError: true
      }
    })
  }
}

// Apply middleware to handlers
const { GET } = quickMigrate('authenticated', {
  GET: handleGET
})

export { GET }

