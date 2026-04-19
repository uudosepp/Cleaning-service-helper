import { supabase } from '@/lib/supabase';
import type { Profile } from '../types';

export const profilesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (error) throw error;
    return data as Profile[];
  },

  async getCleaners() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'cleaner')
      .order('full_name');
    if (error) throw error;
    return data as Profile[];
  },

  async getAdmins() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('full_name');
    if (error) throw error;
    return data as Profile[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, tenants:tenant_id(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async updateSelf(updates: { full_name?: string; phone?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Pole sisse logitud');

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },
};
