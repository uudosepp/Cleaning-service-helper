import { supabase } from '@/lib/supabase';
import type { Location } from '../types';

export const locationsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Location[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Location;
  },

  async create(location: {
    name: string;
    address?: string;
    floor?: string;
    notes?: string;
    default_start?: string;
    default_end?: string;
    tenant_id: string;
  }) {
    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select()
      .single();
    if (error) throw error;
    return data as Location;
  },

  async update(id: string, updates: Partial<Omit<Location, 'id' | 'tenant_id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('locations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Location;
  },

  async remove(id: string) {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw error;
  },
};
