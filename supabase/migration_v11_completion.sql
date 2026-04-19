-- V11: Koristuse lõpetamise andmed
ALTER TABLE public.cleaning_tasks
  ADD COLUMN IF NOT EXISTS duration_hours numeric,
  ADD COLUMN IF NOT EXISTS completion_notes text;
