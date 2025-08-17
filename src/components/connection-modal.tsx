'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Activity,
  X
} from 'lucide-react'

interface ConnectionStatus {
  isConnected: boolean
  latency: number
  lastChecked: Date
  error?: string
}

interface ConnectionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    latency: 0,
    lastChecked: new Date()
  })
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/health')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format')
      }
      
      setStatus({
        isConnected: data.database === 'connected',
        latency: data.latency || 0,
        lastChecked: new Date(),
        error: data.error || undefined
      })
    } catch (error) {
      console.error('Modal connection check failed:', error)
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Connection check failed'
      }))
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkConnection()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      // Check connection every 30 seconds when modal is open
      const interval = setInterval(checkConnection, 30000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="h-4 w-4 animate-spin" />
    if (status.isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = () => {
    if (isChecking) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Checking...
        </Badge>
      )
    }
    
    if (status.isConnected) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <Wifi className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      )
    }
    
    return (
      <Badge variant="destructive">
        <WifiOff className="h-3 w-3 mr-1" />
        Disconnected
      </Badge>
    )
  }

  const getLatencyColor = () => {
    if (status.latency < 100) return 'text-green-600'
    if (status.latency < 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Database Connection Status</span>
            {getStatusIcon()}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            {getStatusBadge()}
          </div>
          
          {status.isConnected && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Latency:</span>
              <span className={`text-sm font-mono ${getLatencyColor()}`}>
                {status.latency}ms
              </span>
            </div>
          )}
          
          {status.error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-600 font-medium">Error:</p>
                <p className="text-xs text-red-700">{status.error}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Last checked:</span>
            <span>{status.lastChecked.toLocaleTimeString()}</span>
          </div>
          
          <Button 
            onClick={checkConnection} 
            disabled={isChecking}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Check Connection
          </Button>
        </div>
      </div>
    </div>
  )
}