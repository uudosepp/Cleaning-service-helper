import { supabase } from '@/lib/supabase';
import type { Notification, NotificationType } from '../types';

export const notificationsService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pole sisse logitud');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data as Notification[];
  },

  async getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pole sisse logitud');

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  async markRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pole sisse logitud');

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) throw error;
  },

  async create(notification: {
    tenant_id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body?: string;
    reference_id?: string;
  }) {
    // No .select() — sender might not have SELECT rights on recipient's notification
    const { error } = await supabase
      .from('notifications')
      .insert(notification);
    if (error) throw error;
  },
};
