'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, AlertTriangle, XCircle, Package, Eye, X } from 'lucide-react'
import { useSocketInventory } from '@/hooks/use-socket'
import { TooltipButton } from '@/components/tooltip-button'

interface StockAlert {
  id: string
  productId: string
  product: {
    sku: string
    name: string
    quantity: number
    minStock: number
    category: string
  }
  type: 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK'
  message: string
  severity: 'warning' | 'error' | 'critical'
  createdAt: string
}

export function InventoryAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [lastDismissed, setLastDismissed] = useState<number>(0)
  const { alerts: socketAlerts, subscribed } = useSocketInventory()

  // Expose toggle function to parent
  useEffect(() => {
    if (window) {
      (window as any).toggleInventoryAlerts = () => setIsVisible(true)
    }
  }, [])

  useEffect(() => {
    const dismissed = localStorage.getItem('inventory-alerts-dismissed')
    if (dismissed) {
      setLastDismissed(parseInt(dismissed))
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [])

  // Handle socket alerts
  useEffect(() => {
    if (socketAlerts.length > 0) {
      // Convert socket alerts to our StockAlert format
      const convertedAlerts = socketAlerts.map(alert => ({
        id: `${alert.productId}-${alert.timestamp}`,
        productId: alert.productId,
        product: {
          sku: alert.productId, // Using productId as SKU for now
          name: alert.productName,
          quantity: alert.currentStock,
          minStock: alert.minimumStock,
          category: 'Unknown' // Not available in socket alert
        },
        type: alert.alertType === 'LOW_STOCK' ? 'LOW_STOCK' as const : 
              alert.alertType === 'OUT_OF_STOCK' ? 'OUT_OF_STOCK' as const : 'CRITICAL_STOCK' as const,
        message: `Stock level: ${alert.currentStock} (Min: ${alert.minimumStock})`,
        severity: alert.alertType === 'CRITICAL' ? 'critical' as const : 
                 alert.alertType === 'OUT_OF_STOCK' ? 'error' as const : 'warning' as const,
        createdAt: alert.timestamp.toISOString()
      }))

      setAlerts(prev => {
        // Merge with existing alerts, avoiding duplicates
        const existingIds = prev.map(a => a.id)
        const newAlerts = convertedAlerts.filter(a => !existingIds.includes(a.id))
        return [...newAlerts, ...prev]
      })

      // Show alerts if new ones arrived and enough time has passed
      if (convertedAlerts.length > 0) {
        const now = Date.now()
        if (now - lastDismissed > 24 * 60 * 60 * 1000) {
          setIsVisible(true)
        }
      }
    }
  }, [socketAlerts, lastDismissed])

  // Lightweight polling fallback when sockets are disabled/unavailable
  useEffect(() => {
    if (subscribed) return // Don't poll if socket is working
    const interval = setInterval(() => {
      fetchAlerts()
    }, 30000) // 30s
    return () => clearInterval(interval)
  }, [subscribed])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/inventory/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts)
        if (data.alerts.length > 0) {
          setIsVisible(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-800'
      case 'error': return 'bg-orange-100 border-orange-500 text-orange-800'
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800'
      default: return 'bg-gray-100 border-gray-500 text-gray-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return XCircle
      case 'error': return AlertTriangle
      case 'warning': return Bell
      default: return Package
    }
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const errorAlerts = alerts.filter(a => a.severity === 'error')
  const warningAlerts = alerts.filter(a => a.severity === 'warning')

  // Don't show if dismissed within 24 hours unless manually opened
  const now = Date.now()
  const shouldAutoShow = now - lastDismissed > 24 * 60 * 60 * 1000
  
  if (!isVisible || (!shouldAutoShow && alerts.length > 0)) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-red-500" />
              <span>Inventory Alerts</span>
              <Badge variant="destructive">{alerts.length}</Badge>
            </CardTitle>
            <TooltipButton
              tooltip="Close alerts panel"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false)
                const now = Date.now()
                setLastDismissed(now)
                localStorage.setItem('inventory-alerts-dismissed', now.toString())
              }}
            >
              <X className="h-4 w-4" />
            </TooltipButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Critical Alerts */}
          {criticalAlerts.map(alert => {
            const IconComponent = getSeverityIcon(alert.severity)
            return (
              <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                <IconComponent className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{alert.product.name}</div>
                    <div className="text-sm">{alert.message}</div>
                    <div className="text-xs mt-1">
                      SKU: {alert.product.sku} | Category: {alert.product.category}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )
          })}

          {/* Error Alerts */}
          {errorAlerts.map(alert => {
            const IconComponent = getSeverityIcon(alert.severity)
            return (
              <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                <IconComponent className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{alert.product.name}</div>
                    <div className="text-sm">{alert.message}</div>
                    <div className="text-xs mt-1">
                      SKU: {alert.product.sku} | Category: {alert.product.category}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )
          })}

          {/* Warning Alerts */}
          {warningAlerts.map(alert => {
            const IconComponent = getSeverityIcon(alert.severity)
            return (
              <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                <IconComponent className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{alert.product.name}</div>
                    <div className="text-sm">{alert.message}</div>
                    <div className="text-xs mt-1">
                      SKU: {alert.product.sku} | Category: {alert.product.category}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )
          })}

          <div className="pt-2 border-t">
            <TooltipButton 
              tooltip="Go to inventory management"
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => window.location.href = '/inventory'}
            >
              <Package className="h-4 w-4 mr-2" />
              Manage Inventory
            </TooltipButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}