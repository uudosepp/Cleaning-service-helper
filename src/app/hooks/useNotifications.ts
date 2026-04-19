import { useState, useEffect, useCallback } from 'react';
import { notificationsService } from '../services/notifications.service';
import type { Notification } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        notificationsService.getAll(),
        notificationsService.getUnreadCount(),
      ]);
      setNotifications(data);
      setUnreadCount(count);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addNotification = useCallback((n: Notification) => {
    setNotifications(prev => [n, ...prev]);
    if (!n.read) setUnreadCount(prev => prev + 1);
  }, []);

  return { notifications, unreadCount, loading, error, refetch: fetch, addNotification };
}
