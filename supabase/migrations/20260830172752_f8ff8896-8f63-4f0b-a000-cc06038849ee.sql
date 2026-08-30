ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS damage_type text,
  ADD COLUMN IF NOT EXISTS damage_areas text[],
  ADD COLUMN IF NOT EXISTS roof_condition text,
  ADD COLUMN IF NOT EXISTS inspection_notes text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS roof_stories int;