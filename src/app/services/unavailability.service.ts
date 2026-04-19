import { supabase } from '@/lib/supabase';
import type { Unavailability } from '../types';

export const unavailabilityService = {
  async getMine() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pole sisse logitud');

    const { data, error } = await supabase
      .from('unavailability')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .order('start_time');

    if (error) throw error;
    return data as Unavailability[];
  },

  async getAll() {
    const { data, error } = await supabase
      .from('unavailability')
      .select('*, profile:profiles!user_id(full_name)')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date');

    if (error) throw error;
    return data as (Unavailability & { profile?: { full_name: string } })[];
  },

  async create(entry: {
    tenant_id: string;
    date: string;
    start_time?: string;
    end_time?: string;
    reason?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pole sisse logitud');

    const { data, error } = await supabase
      .from('unavailability')
      .insert({
        ...entry,
        user_id: user.id,
        start_time: entry.start_time || null,
        end_time: entry.end_time || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Unavailability;
  },

  async remove(id: string) {
    const { error } = await supabase.from('unavailability').delete().eq('id', id);
    if (error) throw error;
  },

  // Find available cleaners for a specific date/time
  async findAvailable(date: string, startTime: string, endTime: string) {
    // Get all cleaners
    const { data: cleaners } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email')
      .eq('role', 'cleaner');

    if (!cleaners || cleaners.length === 0) return [];

    // Get tasks on that date
    const { data: tasks } = await supabase
      .from('cleaning_tasks')
      .select('cleaner_id, start_time, end_time, status')
      .eq('date', date)
      .neq('status', 'cancelled')
      .neq('status', 'declined');

    // Get unavailability on that date
    const { data: unavail } = await supabase
      .from('unavailability')
      .select('user_id, start_time, end_time')
      .eq('date', date);

    const timesOverlap = (s1: string, e1: string, s2: string | null, e2: string | null) => {
      if (!s2 || !e2) return true; // null = kogu päev blokeeritud
      return !(e1 <= s2 || s1 >= e2);
    };

    return cleaners.filter(c => {
      // Check tasks conflict
      const hasTaskConflict = (tasks || []).some(
        t => t.cleaner_id === c.id && timesOverlap(startTime, endTime, t.start_time, t.end_time)
      );
      if (hasTaskConflict) return false;

      // Check unavailability conflict
      const hasUnavailConflict = (unavail || []).some(
        u => u.user_id === c.id && timesOverlap(startTime, endTime, u.start_time, u.end_time)
      );
      if (hasUnavailConflict) return false;

      return true;
    });
  },
};
