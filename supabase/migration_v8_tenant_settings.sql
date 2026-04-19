-- V8: Tenandi seaded (AI API key jm)
-- Käivita Supabase SQL editoris

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS gemini_api_key text,
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
