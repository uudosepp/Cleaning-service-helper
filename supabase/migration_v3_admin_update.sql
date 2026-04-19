-- ============================================================
-- V3: Admin saab muuta oma tenandi töötajate profiile
-- Käivita Supabase SQL editoris
-- ============================================================

-- Admin saab muuta kõiki oma tenandi profiile (nimi, telefon jne)
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

-- Admin saab kustutada oma tenandi koristajaid
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );
