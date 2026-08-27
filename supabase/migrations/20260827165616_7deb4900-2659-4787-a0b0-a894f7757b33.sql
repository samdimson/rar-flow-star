ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS coc_emailed_at timestamptz;
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'coc_emailed';