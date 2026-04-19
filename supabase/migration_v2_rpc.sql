-- ============================================================
-- V2: RPC funktsioonid registreerimiseks ja töötaja loomiseks
-- Käivita see Supabase SQL editoris PÄRAST migration.sql-i
-- ============================================================

-- Funktsioon organisatsiooni loomiseks (avalik, enne autentimist)
CREATE OR REPLACE FUNCTION public.create_tenant(tenant_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.tenants (name)
  VALUES (tenant_name)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Anna kõigile õigus seda kutsuda (vajalik registreerimisel)
GRANT EXECUTE ON FUNCTION public.create_tenant(text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_tenant(text) TO authenticated;
