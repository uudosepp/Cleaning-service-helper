import { supabase } from '@/lib/supabase';
import type { Message } from '../types';

export const messagesService = {
  async getConversation(otherUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pole sisse logitud');

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(id, full_name, role)')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Message[];
  },

  async send(receiverId: string, content: string, tenantId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pole sisse logitud');

    const msg = {
      tenant_id: tenantId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
    };

    const { error } = await supabase
      .from('messages')
      .insert(msg);

    if (error) throw error;

    // Return a local message object (avoids RLS issues with .select after insert)
    return {
      id: crypto.randomUUID(),
      ...msg,
      read_at: null,
      created_at: new Date().toISOString(),
    } as Message;
  },

  async markRead(messageIds: string[]) {
    if (messageIds.length === 0) return;

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', messageIds)
      .is('read_at', null);

    if (error) throw error;
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  },
};
