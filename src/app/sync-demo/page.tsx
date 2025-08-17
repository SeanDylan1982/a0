'use client'

import { useState } from 'react'
import { DataSyncMonitor } from '@/components/data-sync-monitor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDataSync } from '@/hooks/useDataSync'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

export default function SyncDemoPage() {
  const { triggerSync, healthStatus, isLoading, error } = useDataSync()
  const [saleData, setSaleData] = useState({
    productId: 'product-1',
    quantity: 5,
    saleId: 'demo-sale-' + Date.now(),
    customerId: 'customer-1',
    total: 100
  })
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const handleTriggerSync = async () => {
    try {
      setSyncResult(null)
      await triggerSync('sales', 'sale_created', {
        entityType: 'sale',
        entityId: saleData.saleId,
        ...saleData
      })
      setSyncResult('Sync triggered successfully!')
    } catch (err) {
      setSyncResult(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleTriggerInvoiceSync = async () => {
    try {
      setSyncResult(null)
      await triggerSync('sales', 'invoice_created', {
        entityType: 'invoice',
        entityId: 'demo-invoice-' + Date.now(),
        total: saleData.total,
        invoiceNumber: 'INV-' + Date.now(),
        customerId: saleData.customerId,
        createdAt: new Date()
      })
      setSyncResult('Invoice sync triggered successfully!')
    } catch (err) {
      setSyncResult(`Invoice sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Data Sync Demo</h1>
        <p className="text-muted-foreground">
          Demonstrate cross-module data synchronization functionality
        </p>
      </div>

      <Tabs defaultValue="demo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="demo">Sync Demo</TabsTrigger>
          <TabsTrigger value="monitor">Sync Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          {/* Health Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                {healthStatus?.isHealthy ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
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
                  Pending operations
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
                  Current status
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Demo Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales to Inventory Sync</CardTitle>
                <CardDescription>
                  Trigger a sale that will automatically update inventory levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Product ID</Label>
                    <Input
                      id="productId"
                      value={saleData.productId}
                      onChange={(e) => setSaleData(prev => ({ ...prev, productId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={saleData.quantity}
                      onChange={(e) => setSaleData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerId">Customer ID</Label>
                    <Input
                      id="customerId"
                      value={saleData.customerId}
                      onChange={(e) => setSaleData(prev => ({ ...prev, customerId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total">Total Amount</Label>
                    <Input
                      id="total"
                      type="number"
                      value={saleData.total}
                      onChange={(e) => setSaleData(prev => ({ ...prev, total: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleTriggerSync} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Trigger Sale Sync
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales to Accounting Sync</CardTitle>
                <CardDescription>
                  Trigger an invoice that will create accounting transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  This will create an accounting transaction for the invoice amount.
                </div>
                <div className="space-y-2">
                  <Label>Invoice Amount</Label>
                  <div className="text-2xl font-bold">R {saleData.total.toFixed(2)}</div>
                </div>
                <Button 
                  onClick={handleTriggerInvoiceSync} 
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Trigger Invoice Sync
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {syncResult && (
            <Alert variant={syncResult.includes('failed') ? 'destructive' : 'default'}>
              {syncResult.includes('failed') ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{syncResult}</AlertDescription>
            </Alert>
          )}

          {/* Explanation */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Sales to Inventory</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Sale is created in sales module</li>
                    <li>• Sync rule triggers automatically</li>
                    <li>• Product stock is reduced</li>
                    <li>• Stock movement is logged</li>
                    <li>• Real-time notifications sent</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Sales to Accounting</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Invoice is created in sales module</li>
                    <li>• Sync rule transforms data</li>
                    <li>• Revenue transaction created</li>
                    <li>• Customer account updated</li>
                    <li>• Financial reports updated</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor">
          <DataSyncMonitor />
        </TabsContent>
      </Tabs>
    </div>
  )
}