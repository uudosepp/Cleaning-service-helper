import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Main client — manages admin/user session
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Lazy-init separate client for creating employee accounts
// Only created when first needed, avoids "Multiple GoTrueClient" warning on load
let _noSessionClient: SupabaseClient | null = null;

export function getNoSessionClient(): SupabaseClient {
  if (!_noSessionClient) {
    _noSessionClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'sb-nosession',
      },
    });
  }
  return _noSessionClient;
}
