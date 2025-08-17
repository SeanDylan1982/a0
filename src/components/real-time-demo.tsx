'use client'

import { useSocketActivities, useSocketNotifications, useSocketInventory, useSocketHealth } from '@/hooks/use-socket'
import { NotificationType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Activity, Package, Wifi, WifiOff } from 'lucide-react'

export function RealTimeDemo() {
  const { connected, latency } = useSocketHealth()
  const { activities, subscribed: activitiesSubscribed } = useSocketActivities(['inventory', 'sales'])
  const { 
    notifications, 
    counts, 
    subscribed: notificationsSubscribed,
    markAsRead,
    markAllAsRead 
  } = useSocketNotifications()
  const { alerts, movements, subscribed: inventorySubscribed } = useSocketInventory()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-time System Demo</h2>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge variant="default" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Connected {latency && `(${latency}ms)`}
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Disconnected
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Real-time Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>
              Live activity feed {activitiesSubscribed && '(Subscribed)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activities</p>
              ) : (
                activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="p-2 border rounded-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{activity.action}</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.module}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.entityName} by {activity.user.name || activity.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Live notifications {notificationsSubscribed && '(Subscribed)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Notification Counts */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(counts).map(([type, count]) => (
                  count > 0 && (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type.replace('_', ' ')}: {count}
                    </Badge>
                  )
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => markAllAsRead()}
                >
                  Mark All Read
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => markAllAsRead(NotificationType.INVENTORY_ALERT)}
                >
                  Clear Inventory
                </Button>
              </div>

              {/* Recent Notifications */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications</p>
                ) : (
                  notifications.slice(0, 3).map((notification) => (
                    <div key={notification.id} className="p-2 border rounded-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{notification.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {notification.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleTimeString()}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 px-2 text-xs"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark Read
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Updates
            </CardTitle>
            <CardDescription>
              Live inventory alerts & movements {inventorySubscribed && '(Subscribed)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Stock Alerts */}
              {alerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Stock Alerts</h4>
                  <div className="space-y-2">
                    {alerts.slice(0, 3).map((alert, index) => (
                      <div key={index} className="p-2 border rounded-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{alert.productName}</span>
                          <Badge 
                            variant={alert.alertType === 'CRITICAL' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {alert.alertType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Stock: {alert.currentStock} / Min: {alert.minimumStock}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Movements */}
              {movements.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Recent Movements</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {movements.slice(0, 3).map((movement) => (
                      <div key={movement.id} className="p-2 border rounded-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{movement.productName}</span>
                          <Badge variant="outline" className="text-xs">
                            {movement.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Qty: {movement.quantity} ({movement.beforeQty} → {movement.afterQty})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(movement.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alerts.length === 0 && movements.length === 0 && (
                <p className="text-sm text-muted-foreground">No inventory updates</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status Details */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Real-time connection health and subscription status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {connected ? '✅' : '❌'}
              </div>
              <p className="text-sm text-muted-foreground">Connection</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {latency ? `${latency}ms` : '-'}
              </div>
              <p className="text-sm text-muted-foreground">Latency</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {activitiesSubscribed ? '✅' : '❌'}
              </div>
              <p className="text-sm text-muted-foreground">Activities</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {notificationsSubscribed ? '✅' : '❌'}
              </div>
              <p className="text-sm text-muted-foreground">Notifications</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}