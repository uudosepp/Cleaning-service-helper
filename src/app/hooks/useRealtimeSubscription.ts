import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  events?: ChangeEvent[];
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeOptions) {
  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const config: Record<string, unknown> = {
      event: '*',
      schema: 'public',
      table,
    };
    if (filter) config.filter = filter;

    channel
      .on('postgres_changes', config as any, (payload: any) => {
        onChange?.(payload);
        if (payload.eventType === 'INSERT') onInsert?.(payload);
        if (payload.eventType === 'UPDATE') onUpdate?.(payload);
        if (payload.eventType === 'DELETE') onDelete?.(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, enabled]);
}
