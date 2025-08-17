'use client'

import { useState, useEffect } from 'react'
import { useDataSync } from '@/hooks/useDataSync'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Settings,
  Zap,
  Database,
  TrendingUp
} from 'lucide-react'

interface SyncRule {
  id: string
  sourceModule: string
  targetModules: string[]
  trigger: string
  priority: number
  enabled: boolean
}

export function DataSyncMonitor() {
  const { 
    healthStatus, 
    getSyncRules, 
    detectConflicts, 
    resolveConflict,
    refreshHealthStatus,
    error 
  } = useDataSync()
  
  const [rules, setRules] = useState<SyncRule[]>([])
  const [conflicts, setConflicts] = useState<any[]>([])
  const [isLoadingRules, setIsLoadingRules] = useState(false)
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(false)

  useEffect(() => {
    loadSyncRules()
  }, [])

  const loadSyncRules = async () => {
    setIsLoadingRules(true)
    try {
      const syncRules = await getSyncRules()
      setRules(syncRules)
    } catch (err) {
      console.error('Failed to load sync rules:', err)
    } finally {
      setIsLoadingRules(false)
    }
  }

  const loadConflicts = async () => {
    setIsLoadingConflicts(true)
    try {
      // This would typically load conflicts for specific entities
      // For demo purposes, we'll show a placeholder
      setConflicts([])
    } catch (err) {
      console.error('Failed to load conflicts:', err)
    } finally {
      setIsLoadingConflicts(false)
    }
  }

  const handleResolveConflict = async (conflictId: string, resolution: string) => {
    try {
      await resolveConflict(conflictId, resolution as any)
      await loadConflicts() // Refresh conflicts
    } catch (err) {
      console.error('Failed to resolve conflict:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getHealthColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-500' : 'text-red-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Sync Monitor</h2>
          <p className="text-muted-foreground">
            Monitor cross-module data synchronization and resolve conflicts
          </p>
        </div>
        <Button onClick={refreshHealthStatus} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Health Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className={`h-4 w-4 ${getHealthColor(healthStatus?.isHealthy ?? false)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus?.isHealthy ? 'Healthy' : 'Issues'}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall sync system status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Length</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus?.queueLength ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending sync operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Settings className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus?.activeRules ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Enabled sync rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Zap className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus?.isProcessing ? 'Active' : 'Idle'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current processing status
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Sync Rules</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Rules</CardTitle>
              <CardDescription>
                Configure how data flows between different modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRules ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading sync rules...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{rule.id}</h4>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline">Priority {rule.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {rule.sourceModule} → {rule.targetModules.join(', ')} 
                          <span className="ml-2">on {rule.trigger}</span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  ))}
                  
                  {rules.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No sync rules configured
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Conflicts</CardTitle>
              <CardDescription>
                Resolve data synchronization conflicts between modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConflicts ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading conflicts...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {conflicts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No Conflicts</h3>
                      <p className="text-muted-foreground">
                        All data synchronization is working smoothly
                      </p>
                    </div>
                  ) : (
                    conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <h4 className="font-medium">
                              {conflict.sourceModule} → {conflict.targetModule}
                            </h4>
                            <Badge variant="destructive">{conflict.conflictType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Entity: {conflict.entityType} ({conflict.entityId})
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveConflict(conflict.id, 'source_wins')}
                          >
                            Use Source
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveConflict(conflict.id, 'target_wins')}
                          >
                            Use Target
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activity</CardTitle>
              <CardDescription>
                Monitor recent data synchronization operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sync activity monitoring coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}