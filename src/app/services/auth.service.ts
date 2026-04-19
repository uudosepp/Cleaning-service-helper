import { supabase, getNoSessionClient } from '@/lib/supabase';

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Registration: RPC creates tenant, signUp creates user + trigger creates profile
  async registerOrg(orgName: string, fullName: string, email: string, password: string) {
    // 1. Create tenant via RPC (SECURITY DEFINER bypasses RLS)
    const { data: tenantId, error: tenantError } = await supabase.rpc('create_tenant', {
      tenant_name: orgName,
    });

    if (tenantError) {
      throw new Error(tenantError.message || 'Organisatsiooni loomine ebaõnnestus');
    }

    // 2. Create auth user — trigger auto-creates profile row
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          tenant_id: tenantId,
          full_name: fullName,
          role: 'admin',
        },
      },
    });

    if (signUpError) {
      throw new Error(signUpError.message || 'Konto loomine ebaõnnestus');
    }

    return { tenantId, userId: data.user?.id };
  },

  // Employee creation: uses separate supabase client so admin session is NOT affected
  async createEmployee(fullName: string, email: string, tenantId: string, phone?: string) {
    // Generate random password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // signUp via separate client (no session persist = admin stays logged in)
    const { data, error } = await getNoSessionClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          tenant_id: tenantId,
          full_name: fullName,
          phone: phone || null,
          role: 'cleaner',
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Töötaja loomine ebaõnnestus');
    }

    return { password, userId: data.user?.id || '' };
  },

  // Delete employee — removes profile (auth user stays but can't access anything without profile)
  async deleteEmployee(userId: string) {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      throw new Error(error.message || 'Töötaja kustutamine ebaõnnestus');
    }
  },

  // Update employee name/phone (admin can update any profile in their tenant)
  async updateEmployee(userId: string, updates: { full_name?: string; phone?: string }) {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) {
      throw new Error(error.message || 'Muutmine ebaõnnestus');
    }
  },

  // Reset employee password (via Edge Function — needs service_role_key)
  async resetPassword(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Pole sisse logitud');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/api/auth/reset-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Parooli reset ebaõnnestus' }));
      throw new Error(err.error || 'Parooli reset ebaõnnestus');
    }
    return res.json() as Promise<{ password: string; name: string }>;
  },
};
