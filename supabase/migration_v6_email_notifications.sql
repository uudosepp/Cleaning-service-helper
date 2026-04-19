-- ============================================================
-- V6: Email teavituste süsteem
-- Käivita Supabase SQL editoris
-- ============================================================

-- Lisa email_notifications eelistus profiilile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;

-- Luba pg_net laiendus (HTTP päringud andmebaasist)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Funktsioon mis saadab email teavituse läbi Edge Functioni
CREATE OR REPLACE FUNCTION public.notify_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_profile RECORD;
  edge_fn_url TEXT;
  service_key TEXT;
BEGIN
  -- Leia saaja profiil
  SELECT p.full_name, p.email, p.email_notifications, t.name as tenant_name
  INTO recipient_profile
  FROM profiles p
  JOIN tenants t ON t.id = p.tenant_id
  WHERE p.id = NEW.user_id;

  -- Kui email teavitused välja lülitatud, ära saada
  IF NOT recipient_profile.email_notifications THEN
    RETURN NEW;
  END IF;

  -- Vestluse teavituste puhul ära saada kohe emaili
  -- (nende jaoks on eraldi päevane kokkuvõte / meeldetuletus)
  IF NEW.type = 'message' THEN
    RETURN NEW;
  END IF;

  -- Edge Function URL
  edge_fn_url := current_setting('app.settings.supabase_url', true);
  IF edge_fn_url IS NULL THEN
    edge_fn_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;

  service_key := current_setting('app.settings.service_role_key', true);

  -- Saada HTTP päring Edge Functionile
  PERFORM extensions.http_post(
    url := COALESCE(edge_fn_url, 'https://ouykvheealxcpxovattj.supabase.co') || '/functions/v1/server/api/notify/email',
    body := json_build_object(
      'to_email', recipient_profile.email,
      'to_name', recipient_profile.full_name,
      'tenant_name', recipient_profile.tenant_name,
      'title', NEW.title,
      'body', COALESCE(NEW.body, ''),
      'type', NEW.type
    )::text,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, current_setting('supabase.service_role_key', true))
    )::jsonb
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ära blokeeri teavituse loomist kui email ebaõnnestub
    RAISE WARNING 'Email notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger: iga uue teavituse loomisel saada email
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_by_email();
