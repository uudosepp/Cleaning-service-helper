-- ============================================================
-- V5: Puudumised / mittesaadavus
-- Töötaja saab märkida millal ta tööl olla ei saa
-- Käivita Supabase SQL editoris
-- ============================================================

CREATE TABLE IF NOT EXISTS public.unavailability (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        date NOT NULL,
  start_time  time,          -- NULL = kogu päev
  end_time    time,          -- NULL = kogu päev
  reason      text,          -- valikuline põhjus
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.unavailability ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_unavail_user ON public.unavailability(user_id);
CREATE INDEX IF NOT EXISTS idx_unavail_date ON public.unavailability(user_id, date);

-- Koristaja näeb ja haldab ainult omi
CREATE POLICY "unavail_select_own_or_admin" ON public.unavailability
  FOR SELECT USING (
    tenant_id = public.get_my_tenant_id()
    AND (user_id = auth.uid() OR public.get_my_role() = 'admin')
  );

CREATE POLICY "unavail_insert_own" ON public.unavailability
  FOR INSERT WITH CHECK (
    tenant_id = public.get_my_tenant_id() AND user_id = auth.uid()
  );

CREATE POLICY "unavail_delete_own" ON public.unavailability
  FOR DELETE USING (
    tenant_id = public.get_my_tenant_id() AND user_id = auth.uid()
  );
