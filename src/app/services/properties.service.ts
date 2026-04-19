import { supabase } from '@/lib/supabase';
import type { Property, Room } from '../types';

export const propertiesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('properties')
      .select('*, location:locations(id, name, address)')
      .order('name');
    if (error) throw error;
    return data as Property[];
  },

  async getByLocation(locationId: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('location_id', locationId)
      .order('name');
    if (error) throw error;
    return data as Property[];
  },

  async create(property: {
    tenant_id: string;
    location_id: string;
    name: string;
    size_m2?: number;
    floor?: string;
    rooms?: Room[];
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...property,
        rooms: property.rooms || [],
      })
      .select('*, location:locations(id, name, address)')
      .single();
    if (error) throw error;
    return data as Property;
  },

  async update(id: string, updates: Partial<Omit<Property, 'id' | 'tenant_id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Property;
  },

  async remove(id: string) {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
  },
};
