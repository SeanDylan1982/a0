import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNotifications, useNotificationCount, useNotificationStats } from '../useNotifications'
import { NotificationType, NotificationPriority } from '@prisma/client'
import React from 'react'

// Mock fetch
global.fetch = vi.fn()

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  
  return Wrapper
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('useNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockNotifications = [
        {
          id: 'notif1',
          userId: 'user1',
          type: NotificationType.ACTIVITY,
          title: 'Test Notification',
          message: 'Test message',
          priority: NotificationPriority.MEDIUM,
          read: false,
          createdAt: new Date(),
          expiresAt: null,
          data: {}
        }
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications })
      } as Response)

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.notifications).toEqual(mockNotifications)
      expect(fetch).toHaveBeenCalledWith('/api/notifications?')
    })

    it('should apply filters to API call', async () => {
      const filters = {
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH,
        read: false,
        limit: 10
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] })
      } as Response)

      renderHook(() => useNotifications(filters), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/notifications?type=SYSTEM&priority=HIGH&read=false&limit=10'
        )
      })
    })

    it('should handle fetch error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response)

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should create notification', async () => {
      const mockNotification = {
        id: 'notif1',
        userId: 'user1',
        type: NotificationType.ACTIVITY,
        title: 'New Notification',
        message: 'New message',
        priority: NotificationPriority.MEDIUM,
        read: false,
        createdAt: new Date(),
        expiresAt: null,
        data: {}
      }

      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] })
      } as Response)

      // Mock create notification
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notification: mockNotification })
      } as Response)

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const notificationData = {
        type: NotificationType.ACTIVITY,
        title: 'New Notification',
        message: 'New message'
      }

      result.current.createNotification(notificationData)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notificationData)
        })
      })
    })

    it('should mark notification as read', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] })
      } as Response)

      // Mock mark as read
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const notificationId = 'notif1'
      result.current.markAsRead(notificationId)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/api/notifications/${notificationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'mark_read' })
        })
      })
    })

    it('should delete notification', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] })
      } as Response)

      // Mock delete
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const notificationId = 'notif1'
      result.current.deleteNotification(notificationId)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/api/notifications/${notificationId}`, {
          method: 'DELETE'
        })
      })
    })

    it('should mark all notifications as read', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] })
      } as Response)

      // Mock mark all as read
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 })
      } as Response)

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      result.current.markAllAsRead(NotificationType.ACTIVITY)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/notifications/bulk', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'mark_read', type: NotificationType.ACTIVITY })
        })
      })
    })
  })

  describe('useNotificationCount', () => {
    it('should fetch notification count', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 })
      } as Response)

      const { result } = renderHook(() => useNotificationCount(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.count).toBe(5)
      expect(fetch).toHaveBeenCalledWith('/api/notifications/count?')
    })

    it('should fetch count for specific type', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3 })
      } as Response)

      const { result } = renderHook(() => useNotificationCount(NotificationType.SYSTEM), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.count).toBe(3)
      expect(fetch).toHaveBeenCalledWith('/api/notifications/count?type=SYSTEM')
    })
  })

  describe('useNotificationStats', () => {
    it('should return notification statistics', async () => {
      const mockStats = {
        total: 10,
        unread: 5,
        byType: {
          [NotificationType.ACTIVITY]: 3,
          [NotificationType.SYSTEM]: 2,
          [NotificationType.INVENTORY_ALERT]: 1,
          [NotificationType.CALENDAR_REMINDER]: 2,
          [NotificationType.MESSAGE]: 1,
          [NotificationType.NOTICE_BOARD]: 1
        },
        byPriority: {
          [NotificationPriority.LOW]: 2,
          [NotificationPriority.MEDIUM]: 5,
          [NotificationPriority.HIGH]: 2,
          [NotificationPriority.CRITICAL]: 1
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stats: mockStats })
      } as Response)

      const { result } = renderHook(() => useNotificationStats(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.stats).toEqual(mockStats)
      expect(fetch).toHaveBeenCalledWith('/api/notifications/stats')
    })
  })
})