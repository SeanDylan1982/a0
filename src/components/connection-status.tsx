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
  Activity
} from 'lucide-react'

interface ConnectionStatus {
  isConnected: boolean
  latency: number
  lastChecked: Date
  error?: string
}

export function ConnectionStatus() {
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
      console.error('Connection check failed:', error)
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
    checkConnection()
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [])

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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Activity className="h-4 w-4" />
          <span>Database Connection</span>
          {getStatusIcon()}
        </CardTitle>
        <CardDescription className="text-xs">
          Real-time database status and performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-red-600 font-medium">Error:</p>
              <p className="text-xs text-gray-600">{status.error}</p>
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
          size="sm" 
          className="w-full"
        >
          <RefreshCw className={`h-3 w-3 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Check Connection
        </Button>
      </CardContent>
    </Card>
  )
}

// Compact version for header
interface CompactConnectionStatusProps {
  onClick?: () => void
}

export function CompactConnectionStatus({ onClick }: CompactConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format')
        }
        
        setIsConnected(data.database === 'connected')
      } catch (error) {
        console.error('Compact connection check failed:', error)
        setIsConnected(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isConnected) {
    return (
      <div 
        className="flex items-center space-x-2 text-green-600 cursor-pointer hover:bg-green-50 px-2 py-1 rounded-md transition-colors"
        onClick={onClick}
      >
        <CheckCircle className="h-4 w-4" />
        <span className="text-xs font-medium">Connected</span>
      </div>
    )
  }

  return (
    <div 
      className="flex items-center space-x-2 text-red-600 cursor-pointer hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
      onClick={onClick}
    >
      <XCircle className="h-4 w-4" />
      <span className="text-xs font-medium">Disconnected</span>
    </div>
  )
}