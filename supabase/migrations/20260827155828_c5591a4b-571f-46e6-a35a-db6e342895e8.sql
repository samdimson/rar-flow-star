ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS labor_type text,
  ADD COLUMN IF NOT EXISTS labor_squares integer;