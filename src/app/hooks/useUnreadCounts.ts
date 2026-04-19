import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';

interface UnreadCounts {
  notifications: number;
  messages: number;
}

export function useUnreadCounts() {
  const { session } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ notifications: 0, messages: 0 });

  const fetch = useCallback(async () => {
    if (!session?.user?.id) return;

    const [notifResult, msgResult] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false),
      supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id)
        .is('read_at', null),
    ]);

    setCounts({
      notifications: notifResult.count || 0,
      messages: msgResult.count || 0,
    });
  }, [session?.user?.id]);

  useEffect(() => {
    fetch();
    // Poll every 30 seconds
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  // Also listen to realtime
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase.channel('unread-counts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => fetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetch())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => fetch())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, fetch]);

  return counts;
}
