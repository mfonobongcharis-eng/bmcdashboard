// BMC Command Center - useNotifications Hook
// Notification state management

import { useState, useCallback, useEffect } from 'react';
import type { Notification } from '../types';
import { notificationService } from '../services/taskService';
import { useAuth } from './useAuth';
import { supabase } from '../services/authService';

export function useNotifications(autoLoad = true) {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const notifs = await notificationService.getNotifications(user.id);
      setNotifications(notifs);

      // Count unread
      const unread = notifs.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load notifications';
      setError(errorMessage);
      console.error('Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load on mount
  useEffect(() => {
    if (autoLoad && user) {
      loadNotifications();
    }
  }, [user, autoLoad, loadNotifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new && payload.new.user_id === user.id) {
            // New notification
            setNotifications((prev) => [payload.new, ...prev]);
            if (!payload.new.is_read) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Mark as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      setError(null);
      try {
        const updated = await notificationService.markAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? updated : n))
        );

        // Update unread count
        if (!updated.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        return updated;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to mark notification as read';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');

    setError(null);
    try {
      const success = await notificationService.markAllAsRead(user.id);
      if (success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
      return success;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to mark all as read';
      setError(errorMessage);
      throw err;
    }
  }, [user]);

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Get unread notifications
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((n) => !n.is_read);
  }, [notifications]);

  // Delete notification (clear it from UI)
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    getUnreadNotifications,
    removeNotification,
    clearAll,
  };
}
