import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dashboard from '@/app/page'
import { LanguageProvider } from '@/contexts/language-context'

// Mock the hooks and services
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    permissions: [],
    hasPermission: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    isLoading: false,
    error: null
  }),
  useHasPermission: vi.fn(() => true),
  useHasRole: vi.fn(() => true),
  useIsAdmin: vi.fn(() => true),
  useIsManagement: vi.fn(() => true)
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    isLoading: false,
    error: null,
    createNotification: vi.fn(),
    markAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    markAllAsRead: vi.fn()
  }),
  useNotificationCount: () => ({
    count: 0,
    isLoading: false,
    error: null
  }),
  useNotificationStats: () => ({
    stats: {
      total: 0,
      unread: 0,
      byType: {},
      byPriority: {}
    },
    isLoading: false,
    error: null
  })
}))

vi.mock('@/hooks/useInventoryAlerts', () => ({
  useInventoryAlerts: () => ({
    alerts: [],
    alertCounts: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    },
    alertsByType: {
      outOfStock: [],
      lowStock: [],
      critical: []
    },
    isLoading: false,
    error: null,
    canViewAlerts: true,
    isRealtimeConnected: true,
    acknowledgeAlert: vi.fn(),
    refetch: vi.fn(),
    refresh: vi.fn()
  }),
  useInventoryAlertSummary: () => ({
    hasCriticalAlerts: false,
    hasHighPriorityAlerts: false,
    totalUnacknowledgedAlerts: 0,
    mostUrgentAlert: null,
    alertCounts: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    },
    isLoading: false,
    canViewAlerts: true
  })
}))

// Mock fetch for dashboard API
const mockDashboardData = {
  stats: {
    totalRevenue: {
      value: 'R 1,234,567.89',
      change: '+12.5%',
      changeType: 'positive',
      details: 'This month • VAT inclusive',
      icon: '💰',
      href: '/accounting',
      color: 'bg-green-50 border-green-200'
    },
    inventoryValue: {
      value: 'R 856,420.00',
      change: '+8.2%',
      changeType: 'positive',
      details: '1,234 products • 15% VAT',
      icon: '📦',
      href: '/inventory',
      color: 'bg-blue-50 border-blue-200'
    },
    activeCustomers: {
      value: '847',
      change: '+5.4%',
      changeType: 'positive',
      details: 'POPIA compliant',
      icon: '👥',
      href: '/customers',
      color: 'bg-purple-50 border-purple-200'
    },
    pendingOrders: {
      value: '23',
      change: '-2.1%',
      changeType: 'negative',
      details: '3 overdue invoices',
      icon: '📋',
      href: '/sales',
      color: 'bg-orange-50 border-orange-200'
    }
  },
  recentActivities: [
    {
      id: '1',
      user: 'John Smith',
      action: 'created sale for ABC Construction',
      time: '2 minutes ago',
      module: 'sales',
      entityName: 'Sale #12345'
    },
    {
      id: '2',
      user: 'Sarah Johnson',
      action: 'updated inventory for Product XYZ',
      time: '15 minutes ago',
      module: 'inventory',
      entityName: 'Product XYZ'
    }
  ],
  criticalAlerts: [
    {
      id: 'low-stock-alert',
      type: 'inventory',
      title: 'Low Stock Alert',
      message: '5 products are running low on stock',
      severity: 'high',
      timestamp: new Date().toISOString(),
      actionUrl: '/inventory?filter=low-stock',
      actionLabel: 'Reorder Now'
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
    },
    {
      id: 'add-customer',
      title: 'Add Customer',
      description: 'Register new customer',
      icon: '👥',
      href: '/customers/new',
      permission: 'customers.create',
      color: 'hover:bg-purple-50 hover:border-purple-300'
    }
  ],
  performanceMetrics: [
    {
      id: 'monthly-sales',
      name: 'Monthly Sales',
      value: 85,
      unit: 'orders',
      change: 12.5,
      changeType: 'positive',
      target: 100,
      description: 'Sales orders this month'
    },
    {
      id: 'stock-health',
      name: 'Stock Health',
      value: 92.3,
      unit: '%',
      change: -2.3,
      changeType: 'negative',
      target: 95,
      description: 'Products with adequate stock levels'
    }
  ],
  notifications: {
    unreadCount: 3,
    criticalCount: 1,
    recentNotifications: [
      {
        id: '1',
        title: 'Low Stock Alert',
        message: 'Product XYZ is running low',
        type: 'INVENTORY_ALERT',
        timestamp: new Date()
      }
    ]
  }
}

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}

describe('Dashboard Integration', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      })
    ) as any

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: '',
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with all components', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Check if main dashboard elements are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Welcome to Account Zero - Your South African Business Management Solution')).toBeInTheDocument()
  })

  it('displays real-time stats cards with correct data', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Check stats values
    expect(screen.getByText('R 1,234,567.89')).toBeInTheDocument()
    expect(screen.getByText('R 856,420.00')).toBeInTheDocument()
    expect(screen.getByText('847')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()

    // Check change indicators
    expect(screen.getByText('+12.5%')).toBeInTheDocument()
    expect(screen.getByText('+8.2%')).toBeInTheDocument()
    expect(screen.getByText('+5.4%')).toBeInTheDocument()
    expect(screen.getByText('-2.1%')).toBeInTheDocument()
  })

  it('displays critical alerts correctly', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Check critical alerts
    expect(screen.getByText('Critical Alerts')).toBeInTheDocument()
    expect(screen.getByText('Low Stock Alert')).toBeInTheDocument()
    expect(screen.getByText('5 products are running low on stock')).toBeInTheDocument()
    expect(screen.getByText('Reorder Now')).toBeInTheDocument()
  })

  it('displays recent activities with module badges', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Check recent activities
    expect(screen.getByText('John Smith created sale for ABC Construction')).toBeInTheDocument()
    expect(screen.getByText('Sarah Johnson updated inventory for Product XYZ')).toBeInTheDocument()
    
    // Check module badges
    expect(screen.getByText('sales')).toBeInTheDocument()
    expect(screen.getByText('inventory')).toBeInTheDocument()
  })

  it('displays performance metrics with progress indicators', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Check performance metrics
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument()
    expect(screen.getByText('Monthly Sales')).toBeInTheDocument()
    expect(screen.getByText('Stock Health')).toBeInTheDocument()
    expect(screen.getByText('85 orders')).toBeInTheDocument()
    expect(screen.getByText('92.3%')).toBeInTheDocument()
  })

  it('displays quick actions based on permissions', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Check quick actions
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Add Product')).toBeInTheDocument()
    expect(screen.getByText('Add Customer')).toBeInTheDocument()
    expect(screen.getByText('Add new product to inventory')).toBeInTheDocument()
    expect(screen.getByText('Register new customer')).toBeInTheDocument()
  })

  it('handles refresh functionality', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Find and click refresh button
    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    // Verify fetch was called again
    expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + refresh
  })

  it('handles navigation from stats cards', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Find a stats card and click it
    const revenueCard = screen.getByText('R 1,234,567.89').closest('div[role="button"], button, [onclick]')
    if (revenueCard) {
      fireEvent.click(revenueCard)
      // In a real test, you'd verify navigation occurred
    }
  })

  it('displays real-time indicators', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Check for real-time indicators
    expect(screen.getByText('Real-time data')).toBeInTheDocument()
    expect(screen.getByText('Auto-refresh enabled')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('API Error'))
    ) as any

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Should display fallback data
    expect(screen.getByText('R 0.00')).toBeInTheDocument()
  })

  it('displays role-based content correctly', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading enhanced dashboard data...')).not.toBeInTheDocument()
    })

    // Check that role-based content is displayed
    // This would be more specific based on actual role permissions
    expect(screen.getByText('2 available')).toBeInTheDocument() // Quick actions count
  })
})