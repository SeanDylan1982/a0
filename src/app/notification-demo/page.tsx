'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationBadge } from '@/components/notification-badge'
import { useNotificationCounts } from '@/hooks/useNotificationCounts'
import { Badge } from '@/components/ui/badge'
import { Calendar, MessageSquare, Megaphone, RefreshCw } from 'lucide-react'

export default function NotificationDemoPage() {
  const { counts, loading, error, refetch, markAsRead, markAllAsRead } = useNotificationCounts()
  const [testCount, setTestCount] = useState(5)

  const createTestNotification = async (type: 'CALENDAR_REMINDER' | 'MESSAGE' | 'NOTICE_BOARD') => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          title: `Test ${type} Notification`,
          message: `This is a test notification of type ${type}`,
          priority: 'MEDIUM'
        }),
      })

      if (response.ok) {
        // Refetch counts to see the update
        refetch()
      }
    } catch (error) {
      console.error('Error creating test notification:', error)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Indicators Demo</h1>
          <p className="text-gray-600 mt-2">
            Test the sidebar notification indicators and badge components
          </p>
        </div>
        <Button onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Counts
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Current Counts */}
        <Card>
          <CardHeader>
            <CardTitle>Current Notification Counts</CardTitle>
            <CardDescription>
              Real-time notification counts from the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-amber-600" />
                <span>Calendar</span>
              </div>
              <div className="relative">
                <Badge variant="outline">{counts.calendar}</Badge>
                {counts.calendar > 0 && (
                  <NotificationBadge count={counts.calendar} className="absolute -top-2 -right-2" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <span>Messaging</span>
              </div>
              <div className="relative">
                <Badge variant="outline">{counts.messaging}</Badge>
                {counts.messaging > 0 && (
                  <NotificationBadge count={counts.messaging} className="absolute -top-2 -right-2" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Megaphone className="h-5 w-5 text-orange-600" />
                <span>Notice Board</span>
              </div>
              <div className="relative">
                <Badge variant="outline">{counts.noticeBoard}</Badge>
                {counts.noticeBoard > 0 && (
                  <NotificationBadge count={counts.noticeBoard} className="absolute -top-2 -right-2" />
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <Badge variant="default">{counts.total}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badge Component Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Badge Component Tests</CardTitle>
            <CardDescription>
              Test different badge configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Small count (5)</span>
              <div className="relative w-8 h-8 bg-gray-100 rounded">
                <NotificationBadge count={5} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Large count (150)</span>
              <div className="relative w-8 h-8 bg-gray-100 rounded">
                <NotificationBadge count={150} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Custom max (250, max 200)</span>
              <div className="relative w-8 h-8 bg-gray-100 rounded">
                <NotificationBadge count={250} maxCount={200} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Zero with showZero</span>
              <div className="relative w-8 h-8 bg-gray-100 rounded">
                <NotificationBadge count={0} showZero />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Test count ({testCount})</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTestCount(Math.max(0, testCount - 1))}
                >
                  -
                </Button>
                <div className="relative w-8 h-8 bg-gray-100 rounded">
                  <NotificationBadge count={testCount} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTestCount(testCount + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>
              Create test notifications and manage counts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => createTestNotification('CALENDAR_REMINDER')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create Calendar Notification
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => createTestNotification('MESSAGE')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Create Message Notification
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => createTestNotification('NOTICE_BOARD')}
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Create Notice Notification
            </Button>

            <div className="pt-2 border-t space-y-2">
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => markAllAsRead('CALENDAR_REMINDER')}
                disabled={counts.calendar === 0}
              >
                Mark All Calendar Read
              </Button>

              <Button
                className="w-full"
                variant="secondary"
                onClick={() => markAllAsRead('MESSAGE')}
                disabled={counts.messaging === 0}
              >
                Mark All Messages Read
              </Button>

              <Button
                className="w-full"
                variant="secondary"
                onClick={() => markAllAsRead('NOTICE_BOARD')}
                disabled={counts.noticeBoard === 0}
              >
                Mark All Notices Read
              </Button>

              <Button
                className="w-full"
                variant="destructive"
                onClick={() => markAllAsRead()}
                disabled={counts.total === 0}
              >
                Mark All Read
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <h4>Features Implemented:</h4>
            <ul>
              <li>✅ NotificationBadge component with count formatting (99+ for large numbers)</li>
              <li>✅ Real-time notification count updates via Socket.IO</li>
              <li>✅ Sidebar integration with calendar, messaging, and notice board indicators</li>
              <li>✅ Proper accessibility attributes (aria-label, role="status")</li>
              <li>✅ Automatic count updates when notifications are read</li>
              <li>✅ Support for both collapsed and expanded sidebar states</li>
            </ul>

            <h4>How it works:</h4>
            <ul>
              <li>The useNotificationCounts hook fetches initial counts on mount</li>
              <li>Socket.IO events update counts in real-time when notifications are created/read</li>
              <li>The NotificationBadge component handles display logic and accessibility</li>
              <li>The Header component integrates badges into both mobile and desktop sidebars</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}