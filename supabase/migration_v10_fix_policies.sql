-- V10: Kontrolli et kõik vajalikud RLS poliitikad on olemas
-- Käivita Supabase SQL editoris

-- Messages: saaja saab sõnumeid märkida loetuks
DO $$ BEGIN
  CREATE POLICY "messages_update_receiver" ON public.messages
    FOR UPDATE USING (tenant_id = public.get_my_tenant_id() AND receiver_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cleaning tasks: koristaja saab oma ülesandeid uuendada (confirm/decline/clock-in/complete)
DO $$ BEGIN
  CREATE POLICY "tasks_update_own_or_admin" ON public.cleaning_tasks
    FOR UPDATE USING (
      tenant_id = public.get_my_tenant_id()
      AND (public.get_my_role() = 'admin' OR cleaner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notifications: igaüks saab oma tenandi sees teavitusi luua (ka koristaja adminile)
DO $$ BEGIN
  CREATE POLICY "notifications_insert_tenant" ON public.notifications
    FOR INSERT WITH CHECK (tenant_id = public.get_my_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notifications: saaja saab oma teavitusi uuendada (mark read)
DO $$ BEGIN
  CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tenants: admin saab oma tenanti uuendada (gemini key jne)
DO $$ BEGIN
  CREATE POLICY "tenants_update_admin" ON public.tenants
    FOR UPDATE USING (id = public.get_my_tenant_id() AND public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles: admin saab oma tenandi profiile uuendada
DO $$ BEGIN
  CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles: admin saab oma tenandi profiile kustutada
DO $$ BEGIN
  CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
