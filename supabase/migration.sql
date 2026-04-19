-- ============================================================
-- Koristuse Haldus — Andmebaasi migratsioon
-- Käivita see Supabase SQL editoris (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- 1. TABELID
-- ============================================================

-- Tenandid (organisatsioonid/ettevõtted)
CREATE TABLE IF NOT EXISTS public.tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Profiilid (kasutajad, seotud auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text NOT NULL,
  phone       text,
  role        text NOT NULL DEFAULT 'cleaner' CHECK (role IN ('admin', 'cleaner')),
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(tenant_id, role);

-- Asukohad (koristuskohad per tenant)
CREATE TABLE IF NOT EXISTS public.locations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  address         text,
  floor           text,
  notes           text,
  default_start   time,
  default_end     time,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON public.locations(tenant_id);

-- Koristusülesanded (keskne planeerimise tabel)
CREATE TABLE IF NOT EXISTS public.cleaning_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  cleaner_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by     uuid NOT NULL REFERENCES public.profiles(id),
  date            date NOT NULL,
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','declined','in_progress','completed','cancelled')),
  notes           text,
  checklist       jsonb DEFAULT '[]'::jsonb,
  clock_in        timestamptz,
  clock_out       timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON public.cleaning_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_cleaner ON public.cleaning_tasks(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.cleaning_tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.cleaning_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_cleaner_date ON public.cleaning_tasks(cleaner_id, date);

-- Sõnumid (admin ↔ koristaja vestlus)
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at DESC);

-- Teavitused (süsteemiteavitused)
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN (
    'task_assigned','task_confirmed','task_declined',
    'task_completed','task_cancelled','message','system'
  )),
  title         text NOT NULL,
  body          text,
  reference_id  uuid,
  read          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;

-- ============================================================
-- 2. HELPER FUNKTSIOONID
-- ============================================================

-- Praeguse kasutaja tenant_id
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Praeguse kasutaja roll
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 3. RLS POLIITIKAD
-- ============================================================

-- TENANTS: kasutaja näeb ainult oma tenanti
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT USING (id = public.get_my_tenant_id());

-- PROFILES: sama tenant nähtav
CREATE POLICY "profiles_select_tenant" ON public.profiles
  FOR SELECT USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

-- LOCATIONS: tenant-scoped, admin saab CUD, kõik loevad
CREATE POLICY "locations_select_tenant" ON public.locations
  FOR SELECT USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "locations_insert_admin" ON public.locations
  FOR INSERT WITH CHECK (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

CREATE POLICY "locations_update_admin" ON public.locations
  FOR UPDATE USING (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

CREATE POLICY "locations_delete_admin" ON public.locations
  FOR DELETE USING (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

-- CLEANING_TASKS: tenant-scoped; admin näeb kõiki, koristaja ainult omi
CREATE POLICY "tasks_select_tenant" ON public.cleaning_tasks
  FOR SELECT USING (
    tenant_id = public.get_my_tenant_id()
    AND (public.get_my_role() = 'admin' OR cleaner_id = auth.uid())
  );

CREATE POLICY "tasks_insert_admin" ON public.cleaning_tasks
  FOR INSERT WITH CHECK (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

CREATE POLICY "tasks_update_own_or_admin" ON public.cleaning_tasks
  FOR UPDATE USING (
    tenant_id = public.get_my_tenant_id()
    AND (public.get_my_role() = 'admin' OR cleaner_id = auth.uid())
  );

CREATE POLICY "tasks_delete_admin" ON public.cleaning_tasks
  FOR DELETE USING (
    tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin'
  );

-- MESSAGES: saatja või saaja näeb; tenant-scoped
CREATE POLICY "messages_select_own" ON public.messages
  FOR SELECT USING (
    tenant_id = public.get_my_tenant_id()
    AND (sender_id = auth.uid() OR receiver_id = auth.uid())
  );

CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT WITH CHECK (
    tenant_id = public.get_my_tenant_id() AND sender_id = auth.uid()
  );

-- NOTIFICATIONS: ainult oma teavitused
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_tenant" ON public.notifications
  FOR INSERT WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ============================================================
-- 4. TRIGGER: automaatne profiili loomine registreerimisel
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, tenant_id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'cleaner')
  );
  RETURN NEW;
END;
$$;

-- Kustuta vana trigger kui eksisteerib
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cleaning_tasks;

-- ============================================================
-- VALMIS! Nüüd saab frontend rakendust kasutada.
-- ============================================================
