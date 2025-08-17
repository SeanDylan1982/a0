'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Package, DollarSign, AlertCircle, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'

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

interface CriticalAlertsCardProps {
  alerts: CriticalAlert[]
  isLoading?: boolean
}

const alertIcons = {
  inventory: Package,
  financial: DollarSign,
  system: AlertCircle,
  hr: AlertTriangle
}

const severityColors = {
  low: 'bg-blue-50 border-blue-200 text-blue-800',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  high: 'bg-orange-50 border-orange-200 text-orange-800',
  critical: 'bg-red-50 border-red-200 text-red-800'
}

const severityBadgeColors = {
  low: 'default',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive'
} as const

export function CriticalAlertsCard({ alerts, isLoading }: CriticalAlertsCardProps) {
  const router = useRouter()
  const { t } = useLanguage()

  const handleAlertAction = (alert: CriticalAlert) => {
    if (alert.actionUrl) {
      router.push(alert.actionUrl)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Critical Alerts</span>
          </CardTitle>
          <CardDescription>System-wide alerts requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Critical Alerts</span>
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>System-wide alerts requiring immediate attention</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <p className="text-gray-600 text-sm">No critical alerts at this time</p>
            <p className="text-gray-500 text-xs mt-1">All systems operating normally</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {alerts.map((alert) => {
              const IconComponent = alertIcons[alert.type]
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-2 ${severityColors[alert.severity]} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-5 w-5 mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm">{alert.title}</h4>
                          <Badge variant={severityBadgeColors[alert.severity]} className="text-xs">
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm opacity-90 mb-2">{alert.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-75">
                            {formatTimeAgo(alert.timestamp)}
                          </span>
                          {alert.actionUrl && alert.actionLabel && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAlertAction(alert)}
                              className="text-xs h-7 px-2"
                            >
                              {alert.actionLabel}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}