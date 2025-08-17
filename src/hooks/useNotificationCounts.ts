'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';

interface NotificationCounts {
  calendar: number;
  messaging: number;
  noticeBoard: number;
  total: number;
}

export function useNotificationCounts() {
  const [counts, setCounts] = useState<NotificationCounts>({
    calendar: 0,
    messaging: 0,
    noticeBoard: 0,
    total: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/notifications/all-counts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notification counts');
      }

      const data = await response.json();
      
      setCounts({
        calendar: data.calendar || 0,
        messaging: data.messaging || 0,
        noticeBoard: data.noticeBoard || 0,
        total: data.total || 0,
      });
    } catch (err) {
      console.error('Error fetching notification counts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notification counts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNotificationUpdate = (data: { type: string; count: number }) => {
      setCounts(prev => {
        const newCounts = { ...prev };
        
        switch (data.type) {
          case 'CALENDAR_REMINDER':
            newCounts.calendar = data.count;
            break;
          case 'MESSAGE':
            newCounts.messaging = data.count;
            break;
          case 'NOTICE_BOARD':
            newCounts.noticeBoard = data.count;
            break;
        }
        
        newCounts.total = newCounts.calendar + newCounts.messaging + newCounts.noticeBoard;
        return newCounts;
      });
    };

    const cleanupUpdate = socket.on('notification:update', handleNotificationUpdate);
    const cleanupRead = socket.on('notification:read', handleNotificationUpdate);
    const cleanupNew = socket.on('notification:new', fetchCounts);

    return () => {
      cleanupUpdate();
      cleanupRead();
      cleanupNew();
    };
  }, [socket, fetchCounts]);

  // Initial fetch
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const markAsRead = useCallback(async (notificationId: string, type: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local counts immediately
      setCounts(prev => {
        const newCounts = { ...prev };
        
        switch (type) {
          case 'CALENDAR_REMINDER':
            newCounts.calendar = Math.max(0, newCounts.calendar - 1);
            break;
          case 'MESSAGE':
            newCounts.messaging = Math.max(0, newCounts.messaging - 1);
            break;
          case 'NOTICE_BOARD':
            newCounts.noticeBoard = Math.max(0, newCounts.noticeBoard - 1);
            break;
        }
        
        newCounts.total = newCounts.calendar + newCounts.messaging + newCounts.noticeBoard;
        return newCounts;
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Refetch counts on error to ensure consistency
      fetchCounts();
    }
  }, [fetchCounts]);

  const markAllAsRead = useCallback(async (type?: string) => {
    try {
      const url = type 
        ? `/api/notifications/bulk?action=markRead&type=${type}`
        : '/api/notifications/bulk?action=markRead';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      if (type) {
        setCounts(prev => {
          const newCounts = { ...prev };
          
          switch (type) {
            case 'CALENDAR_REMINDER':
              newCounts.calendar = 0;
              break;
            case 'MESSAGE':
              newCounts.messaging = 0;
              break;
            case 'NOTICE_BOARD':
              newCounts.noticeBoard = 0;
              break;
          }
          
          newCounts.total = newCounts.calendar + newCounts.messaging + newCounts.noticeBoard;
          return newCounts;
        });
      } else {
        setCounts({
          calendar: 0,
          messaging: 0,
          noticeBoard: 0,
          total: 0,
        });
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Refetch counts on error to ensure consistency
      fetchCounts();
    }
  }, [fetchCounts]);

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts,
    markAsRead,
    markAllAsRead,
  };
}