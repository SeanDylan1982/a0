import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useNotificationCounts } from '../useNotificationCounts'
import { useSocket } from '../use-socket'

// Mock the useSocket hook
vi.mock('../use-socket')
const mockUseSocket = vi.mocked(useSocket)

// Mock fetch
global.fetch = vi.fn()
const mockFetch = vi.mocked(fetch)

// Mock socket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn()
}

describe('useNotificationCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSocket.mockReturnValue(mockSocket as any)
  })

  it('fetches initial notification counts on mount', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 2 })
      } as Response)

    const { result } = renderHook(() => useNotificationCounts())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/count?type=CALENDAR_REMINDER')
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/count?type=MESSAGE')
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/count?type=NOTICE_BOARD')

    expect(result.current.counts).toEqual({
      calendar: 3,
      messaging: 5,
      noticeBoard: 2,
      total: 10
    })
    expect(result.current.error).toBeNull()
  })

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.counts).toEqual({
      calendar: 0,
      messaging: 0,
      noticeBoard: 0,
      total: 0
    })
  })

  it('handles HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    } as Response)

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to fetch notification counts')
  })

  it('sets up socket event listeners', () => {
    renderHook(() => useNotificationCounts())

    expect(mockSocket.on).toHaveBeenCalledWith('notification:count-update', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('notification:read', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function))
  })

  it('cleans up socket event listeners on unmount', () => {
    const { unmount } = renderHook(() => useNotificationCounts())

    unmount()

    expect(mockSocket.off).toHaveBeenCalledWith('notification:count-update', expect.any(Function))
    expect(mockSocket.off).toHaveBeenCalledWith('notification:read', expect.any(Function))
    expect(mockSocket.off).toHaveBeenCalledWith('notification:new', expect.any(Function))
  })

  it('updates counts when receiving socket events', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 2 })
      } as Response)

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate socket event
    const countUpdateHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'notification:count-update'
    )?.[1]

    if (countUpdateHandler) {
      countUpdateHandler({ type: 'CALENDAR_REMINDER', count: 7 })
    }

    await waitFor(() => {
      expect(result.current.counts.calendar).toBe(7)
      expect(result.current.counts.total).toBe(14) // 7 + 5 + 2
    })
  })

  it('marks notification as read successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 2 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.markAsRead('notification-id', 'CALENDAR_REMINDER')

    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/notification-id', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ read: true }),
    })

    // Should update local count
    expect(result.current.counts.calendar).toBe(2) // 3 - 1
    expect(result.current.counts.total).toBe(9) // 10 - 1
  })

  it('marks all notifications as read successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 2 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.markAllAsRead('CALENDAR_REMINDER')

    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/bulk?action=markRead&type=CALENDAR_REMINDER', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Should update local count to 0 for calendar
    expect(result.current.counts.calendar).toBe(0)
    expect(result.current.counts.total).toBe(7) // 5 + 2
  })

  it('marks all notifications as read for all types', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 2 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      } as Response)

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.markAllAsRead()

    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/bulk?action=markRead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Should update all counts to 0
    expect(result.current.counts).toEqual({
      calendar: 0,
      messaging: 0,
      noticeBoard: 0,
      total: 0
    })
  })

  it('refetches counts on error during mark as read', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 2 })
      } as Response)
      .mockRejectedValueOnce(new Error('Network error'))
      // Refetch calls
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 2 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 4 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 1 })
      } as Response)

    const { result } = renderHook(() => useNotificationCounts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.markAsRead('notification-id', 'CALENDAR_REMINDER')

    // Should have refetched after error
    await waitFor(() => {
      expect(result.current.counts).toEqual({
        calendar: 2,
        messaging: 4,
        noticeBoard: 1,
        total: 7
      })
    })
  })
})