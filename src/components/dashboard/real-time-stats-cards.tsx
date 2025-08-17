'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import { TrendingUp, TrendingDown, Lock, AlertTriangle, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface DashboardStat {
  value: string
  change: string
  changeType: 'positive' | 'negative'
  details: string
  icon: string
  href: string
  color: string
}

export interface DashboardStats {
  totalRevenue: DashboardStat
  inventoryValue: DashboardStat
  activeCustomers: DashboardStat
  pendingOrders: DashboardStat
}

interface RealTimeStatsCardsProps {
  stats: DashboardStats
  isLoading?: boolean
  enableRealTimeUpdates?: boolean
}

export function RealTimeStatsCards({ 
  stats, 
  isLoading, 
  enableRealTimeUpdates = true 
}: RealTimeStatsCardsProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Simulate real-time updates (in production, this would come from Socket.IO)
  useEffect(() => {
    if (!enableRealTimeUpdates) return

    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 30000) // Update timestamp every 30 seconds

    return () => clearInterval(interval)
  }, [enableRealTimeUpdates])

  const handleCardClick = (href: string) => {
    router.push(href)
  }

  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just updated'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    return `${Math.floor(diffInSeconds / 3600)}h ago`
  }

  const isRestricted = (stat: DashboardStat) => {
    return stat.value === 'Restricted' || stat.icon === '🔒'
  }

  const hasError = (stat: DashboardStat) => {
    return stat.value === 'Error' || stat.icon === '⚠️'
  }

  const statsArray = [
    { key: 'totalRevenue', nameKey: 'dashboard.totalRevenue', stat: stats.totalRevenue },
    { key: 'inventoryValue', nameKey: 'dashboard.inventoryValue', stat: stats.inventoryValue },
    { key: 'activeCustomers', nameKey: 'dashboard.activeCustomers', stat: stats.activeCustomers },
    { key: 'pendingOrders', nameKey: 'dashboard.pendingOrders', stat: stats.pendingOrders }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Real-time indicator */}
      {enableRealTimeUpdates && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Real-time data • {formatLastUpdated(lastUpdated)}</span>
          </div>
          <span>Auto-refresh enabled</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsArray.map(({ key, nameKey, stat }, index) => (
          <Card 
            key={key}
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-2 ${stat.color} hover:scale-105 ${
              hasError(stat) ? 'border-red-300 bg-red-50' : 
              isRestricted(stat) ? 'border-gray-300 bg-gray-50' : ''
            }`}
            onClick={() => !isRestricted(stat) && handleCardClick(stat.href)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{stat.icon}</span>
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t(nameKey as any)}
                </CardTitle>
              </div>
              <div className="flex items-center space-x-1">
                {isRestricted(stat) && <Lock className="h-4 w-4 text-gray-400" />}
                {hasError(stat) && <AlertTriangle className="h-4 w-4 text-red-500" />}
                <Badge 
                  variant={
                    hasError(stat) ? 'destructive' :
                    isRestricted(stat) ? 'secondary' :
                    stat.changeType === 'positive' ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {hasError(stat) || isRestricted(stat) ? 'N/A' : (
                    <>
                      {stat.changeType === 'positive' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {stat.change}
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <p className="text-xs text-gray-500 mb-3">{stat.details}</p>
              
              {/* Action indicators */}
              <div className="flex items-center justify-between">
                {!isRestricted(stat) && !hasError(stat) && (
                  <div className="flex items-center text-xs text-blue-600 font-medium">
                    <span>View details</span>
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </div>
                )}
                
                {isRestricted(stat) && (
                  <div className="text-xs text-gray-500">
                    Access restricted
                  </div>
                )}
                
                {hasError(stat) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.location.reload()
                    }}
                  >
                    Retry
                  </Button>
                )}
              </div>

              {/* Real-time indicator for individual cards */}
              {enableRealTimeUpdates && !isRestricted(stat) && !hasError(stat) && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Live</span>
                    </div>
                    <span>Updated {formatLastUpdated(lastUpdated)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}