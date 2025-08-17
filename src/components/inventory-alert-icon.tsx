'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, AlertTriangle } from 'lucide-react'
import { useSocketInventory } from '@/hooks/use-socket'

interface StockAlert {
  id: string
  severity: 'warning' | 'error' | 'critical'
}

export function InventoryAlertIcon({ onToggleAlerts }: { onToggleAlerts: () => void }) {
  const [alertCount, setAlertCount] = useState(0)
  const [hasUnresolved, setHasUnresolved] = useState(false)
  const { alerts, subscribed } = useSocketInventory()

  useEffect(() => {
    fetchAlertStatus()
  }, [])

  // Update alert count when socket alerts change
  useEffect(() => {
    if (alerts.length > 0) {
      setAlertCount(alerts.length)
      setHasUnresolved(true)
    } else {
      // Fallback to API if no socket alerts
      fetchAlertStatus()
    }
  }, [alerts])

  // Fallback polling when socket is not subscribed
  useEffect(() => {
    if (!subscribed) {
      const interval = setInterval(fetchAlertStatus, 30000) // 30s
      return () => clearInterval(interval)
    }
  }, [subscribed])

  const fetchAlertStatus = async () => {
    try {
      const response = await fetch('/api/inventory/alerts')
      if (response.ok) {
        const data = await response.json()
        const alerts = data.alerts || []
        setAlertCount(alerts.length)
        setHasUnresolved(alerts.length > 0)
      }
    } catch (error) {
      console.error('Failed to fetch alert status:', error)
    }
  }

  if (!hasUnresolved) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggleAlerts}
      className="relative p-2"
    >
      <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
      {alertCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {alertCount > 9 ? '9+' : alertCount}
        </Badge>
      )}
    </Button>
  )
}