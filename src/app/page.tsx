'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Package, 
  Users, 
  ShoppingCart, 
  FileText,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/contexts/language-context'
import { PageLayout } from '@/components/page-layout'
import { FlagEmojiZA } from '@/components/flags'
import { RealTimeStatsCards, type DashboardStats } from '@/components/dashboard/real-time-stats-cards'
import { CriticalAlertsCard, type CriticalAlert } from '@/components/dashboard/critical-alerts-card'
import { PerformanceMetricsCard, type PerformanceMetric } from '@/components/dashboard/performance-metrics-card'
import { EnhancedQuickActions, type QuickAction } from '@/components/dashboard/enhanced-quick-actions'

interface RecentActivity {
  id: string
  user: string
  action: string
  time: string
  module: string
  entityName: string
}

interface DashboardData {
  stats: DashboardStats
  recentActivities: RecentActivity[]
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
  alerts?: {
    lowStock: number
    overdueInvoices: number
    databaseError?: boolean
  }
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const { toast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    fetchDashboardData()
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData(true) // Silent refresh
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      
      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      const data = await response.json()
      setDashboardData(data)
      setLastRefresh(new Date())
      
      if (!silent) {
        toast({
          title: "Dashboard Updated",
          description: "Latest data has been loaded successfully.",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive"
        })
      }
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchDashboardData()
  }

  const handleNavigation = (href: string) => {
    window.location.href = href
  }

  // Fallback stats for when data is not available
  const fallbackStats: DashboardStats = {
    totalRevenue: { 
      value: 'R 0.00', 
      change: '+0.0%', 
      changeType: 'positive',
      details: 'No data available',
      icon: '💰',
      href: '/accounting',
      color: 'bg-green-50 border-green-200'
    },
    inventoryValue: { 
      value: 'R 0.00', 
      change: '+0%', 
      changeType: 'positive',
      details: 'No data available',
      icon: '📦',
      href: '/inventory',
      color: 'bg-blue-50 border-blue-200'
    },
    activeCustomers: { 
      value: '0', 
      change: '+0.0%', 
      changeType: 'positive',
      details: 'No data available',
      icon: '👥',
      href: '/customers',
      color: 'bg-purple-50 border-purple-200'
    },
    pendingOrders: { 
      value: '0', 
      change: '+0.0%', 
      changeType: 'negative',
      details: 'No data available',
      icon: '📋',
      href: '/sales',
      color: 'bg-orange-50 border-orange-200'
    }
  }

  const stats = dashboardData?.stats || fallbackStats
  const recentActivities = dashboardData?.recentActivities || [
    { 
      id: '1', 
      user: 'System', 
      action: 'No recent activities', 
      time: 'Now',
      module: 'system',
      entityName: 'N/A'
    }
  ]

  return (
    <PageLayout currentPage="/" breadcrumbs={[{ name: 'Home' }, { name: 'Dashboard' }]}>
      {/* Page header with card styling */}
      <div className="mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500 shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('nav.dashboard')}</h1>
                <p className="text-gray-600 text-sm mb-2">{t('dashboard.welcome')}</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                  <FlagEmojiZA className="h-4 w-4 mr-1" /> {t('dashboard.compliant')}
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl">📊</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading enhanced dashboard data...</p>
          </div>
        </div>
      )}

      {/* Enhanced Stats cards with real-time updates */}
      {!isLoading && (
        <div className="mb-8">
          <RealTimeStatsCards 
            stats={stats} 
            isLoading={isLoading}
            enableRealTimeUpdates={true}
          />
        </div>
      )}

      {/* Dashboard content grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left column - Critical Alerts */}
          <div className="lg:col-span-1">
            <CriticalAlertsCard 
              alerts={dashboardData?.criticalAlerts || []}
              isLoading={isLoading}
            />
          </div>

          {/* Middle column - Recent Activities */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>📋</span>
                    <span>{t('dashboard.recentActivities')}</span>
                  </div>
                  <Badge variant="secondary">
                    {recentActivities.length}
                  </Badge>
                </CardTitle>
                <CardDescription>Latest actions across all modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {activity.user.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.user} {activity.action}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {activity.module}
                          </Badge>
                          <span className="text-xs text-gray-500">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Performance Metrics */}
          <div className="lg:col-span-1">
            <PerformanceMetricsCard 
              metrics={dashboardData?.performanceMetrics || []}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Bottom section - Quick Actions */}
      {!isLoading && (
        <div className="mb-6">
          <EnhancedQuickActions 
            actions={dashboardData?.quickActions || []}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* System status indicator */}
      {!isLoading && dashboardData?.alerts?.databaseError && (
        <div className="mt-6">
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2 text-yellow-800">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-medium">System Status: Offline Mode</p>
                  <p className="text-sm">Some features may be limited. Showing cached data where available.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  )
}