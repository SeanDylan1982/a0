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
  FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/contexts/language-context'
import { PageLayout } from '@/components/page-layout'
import { FlagEmojiZA } from '@/components/flags'

interface DashboardStats {
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

interface RecentActivity {
  id: string
  user: string
  action: string
  time: string
}

interface DashboardData {
  stats: DashboardStats
  recentActivities: RecentActivity[]
  alerts: {
    lowStock: number
    overdueInvoices: number
    databaseError?: boolean
  }
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavigation = (href: string) => {
    window.location.href = href
  }

  const stats = dashboardData?.stats ? [
    { ...dashboardData.stats.totalRevenue, nameKey: 'dashboard.totalRevenue' },
    { ...dashboardData.stats.inventoryValue, nameKey: 'dashboard.inventoryValue' },
    { ...dashboardData.stats.activeCustomers, nameKey: 'dashboard.activeCustomers' },
    { ...dashboardData.stats.pendingOrders, nameKey: 'dashboard.pendingOrders' }
  ] : [
    { 
      nameKey: 'dashboard.totalRevenue', 
      value: 'R 0.00', 
      change: '+0.0%', 
      changeType: 'positive' as const,
      details: 'No data available',
      icon: '💰',
      href: '/accounting',
      color: 'bg-green-50 border-green-200'
    },
    { 
      nameKey: 'dashboard.inventoryValue', 
      value: 'R 0.00', 
      change: '+0%', 
      changeType: 'positive' as const,
      details: 'No data available',
      icon: '📦',
      href: '/inventory',
      color: 'bg-blue-50 border-blue-200'
    },
    { 
      nameKey: 'dashboard.activeCustomers', 
      value: '0', 
      change: '+0.0%', 
      changeType: 'positive' as const,
      details: 'No data available',
      icon: '👥',
      href: '/customers',
      color: 'bg-purple-50 border-purple-200'
    },
    { 
      nameKey: 'dashboard.pendingOrders', 
      value: '0', 
      change: '+0.0%', 
      changeType: 'negative' as const,
      details: 'No data available',
      icon: '📋',
      href: '/sales',
      color: 'bg-orange-50 border-orange-200'
    },
  ]

  const recentActivities = dashboardData?.recentActivities || [
    { id: '1', user: 'System', action: 'No recent activities', time: 'Now' }
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
                  <div className="hidden md:block">
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
                <p className="text-gray-600">Loading dashboard data...</p>
              </div>
            </div>
          )}

          {/* Stats cards */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {stats.map((stat, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-2 ${stat.color} hover:scale-105 ${dashboardData?.alerts.databaseError ? 'border-yellow-300' : ''}`}
                  onClick={() => handleNavigation(stat.href)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{stat.icon}</span>
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {t(`dashboard.${['totalRevenue', 'inventoryValue', 'activeCustomers', 'pendingOrders'][index] as keyof typeof t}`)}
                      </CardTitle>
                    </div>
                    <Badge variant={stat.changeType === 'positive' ? 'default' : 'destructive'}>
                      {stat.change}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <p className="text-xs text-gray-500 mt-1">{stat.details}</p>
                    {dashboardData?.alerts.databaseError && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                          ⚠️ Offline Mode
                        </Badge>
                      </div>
                    )}
                    <div className="mt-3 text-xs text-blue-600 font-medium">
                      Click to view details →
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recent activities */}
          {!isLoading && (
            <div className="grid grid-cols-1 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>📋</span>
                    <span>{t('dashboard.recentActivities')}</span>
                  </CardTitle>
                  <CardDescription>{t('dashboard.latestActions')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                        <Avatar>
                          <AvatarFallback>{activity.user.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.user} {activity.action}
                          </p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick actions */}
          {!isLoading && (
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>⚡</span>
                    <span>{t('dashboard.quickActions')}</span>
                  </CardTitle>
                  <CardDescription>{t('dashboard.commonTasks')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex flex-col hover:bg-blue-50 hover:border-blue-300" onClick={() => handleNavigation('/inventory')}>
                      <Package className="h-6 w-6 mb-2" />
                      <span className="text-sm">{t('dashboard.addProduct')}</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col hover:bg-purple-50 hover:border-purple-300" onClick={() => handleNavigation('/customers')}>
                      <Users className="h-6 w-6 mb-2" />
                      <span className="text-sm">{t('dashboard.addCustomer')}</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col hover:bg-green-50 hover:border-green-300" onClick={() => handleNavigation('/sales')}>
                      <ShoppingCart className="h-6 w-6 mb-2" />
                      <span className="text-sm">{t('dashboard.newSale')}</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col hover:bg-orange-50 hover:border-orange-300" onClick={() => handleNavigation('/invoicing')}>
                      <FileText className="h-6 w-6 mb-2" />
                      <span className="text-sm">{t('dashboard.createInvoice')}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
    </PageLayout>
  )
}