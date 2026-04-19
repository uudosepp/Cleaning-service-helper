-- ============================================================
-- V4: Elamised ja toad hierarhia
-- Asukoht → Elamine → Toad
-- Käivita Supabase SQL editoris
-- ============================================================

-- Elamised (korterid/majad asukoha sees)
CREATE TABLE IF NOT EXISTS public.properties (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name            text NOT NULL,          -- nt "Korter 4A", "Maja 12"
  size_m2         numeric,                -- suurus ruutmeetrites
  floor           text,                   -- korrus
  rooms           jsonb DEFAULT '[]'::jsonb,  -- toad: [{"name":"Elutuba"},{"name":"Köök"}]
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_properties_tenant ON public.properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties(location_id);

-- RLS: sama mis locations
CREATE POLICY "properties_select_tenant" ON public.properties
  FOR SELECT USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "properties_insert_admin" ON public.properties
  FOR INSERT WITH CHECK (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

CREATE POLICY "properties_update_admin" ON public.properties
  FOR UPDATE USING (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

CREATE POLICY "properties_delete_admin" ON public.properties
  FOR DELETE USING (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

-- Lisa cleaning_tasks tabelile property_id ja rooms veerg
ALTER TABLE public.cleaning_tasks
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;

-- Millised toad koristaja vastutab (subset of property rooms)
ALTER TABLE public.cleaning_tasks
  ADD COLUMN IF NOT EXISTS assigned_rooms jsonb DEFAULT '[]'::jsonb;

-- location_id jääb alles tagaühilduvuse jaoks, aga property_id on esmane
CREATE INDEX IF NOT EXISTS idx_tasks_property ON public.cleaning_tasks(property_id);

-- Realtime ka properties jaoks
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
