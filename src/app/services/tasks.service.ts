import { supabase } from '@/lib/supabase';
import type { CleaningTask, TaskStatus, ChecklistItem, Room } from '../types';

export const tasksService = {
  async getAll(filters?: { date?: string; status?: TaskStatus; cleaner_id?: string }) {
    let query = supabase
      .from('cleaning_tasks')
      .select(`
        *,
        location:locations(id, name, address),
        property:properties(id, name, size_m2, floor, rooms),
        cleaner:profiles!cleaner_id(id, full_name, phone, email),
        assigner:profiles!assigned_by(id, full_name)
      `)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filters?.date) query = query.eq('date', filters.date);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.cleaner_id) query = query.eq('cleaner_id', filters.cleaner_id);

    const { data, error } = await query;
    if (error) throw error;
    return data as CleaningTask[];
  },

  async getUpcoming(cleanerId: string, days = 7) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const future = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('cleaning_tasks')
      .select(`
        *,
        location:locations(id, name, address, floor, notes),
        assigner:profiles!assigned_by(id, full_name),
        property:properties(id, name, rooms)
      `)
      .eq('cleaner_id', cleanerId)
      .gte('date', today)
      .lte('date', future)
      .neq('status', 'cancelled')
      .order('date')
      .order('start_time');

    if (error) throw error;
    return data as CleaningTask[];
  },

  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('cleaning_tasks')
      .select(`
        *,
        location:locations(id, name, address),
        cleaner:profiles!cleaner_id(id, full_name)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('start_time');

    if (error) throw error;
    return data as CleaningTask[];
  },

  async create(task: {
    tenant_id: string;
    location_id: string;
    property_id?: string;
    cleaner_id: string;
    assigned_by: string;
    date: string;
    start_time: string;
    end_time: string;
    notes?: string;
    checklist?: ChecklistItem[];
    assigned_rooms?: Room[];
  }) {
    const { data, error } = await supabase
      .from('cleaning_tasks')
      .insert(task)
      .select(`
        *,
        location:locations(id, name, address),
        property:properties(id, name, rooms),
        cleaner:profiles!cleaner_id(id, full_name, phone, email)
      `)
      .single();
    if (error) throw error;
    return data as CleaningTask;
  },

  async updateStatus(id: string, status: TaskStatus) {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    if (status === 'in_progress') updates.clock_in = new Date().toISOString();

    const { error } = await supabase
      .from('cleaning_tasks')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async clockOut(id: string, durationHours?: number, completionNotes?: string) {
    const updates: Record<string, unknown> = {
      status: 'completed',
      clock_out: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (durationHours != null) updates.duration_hours = durationHours;
    if (completionNotes) updates.completion_notes = completionNotes;

    const { error } = await supabase
      .from('cleaning_tasks')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async updateChecklist(id: string, checklist: ChecklistItem[]) {
    const { error } = await supabase
      .from('cleaning_tasks')
      .update({ checklist, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from('cleaning_tasks').delete().eq('id', id);
    if (error) throw error;
  },
};
