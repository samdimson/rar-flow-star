ALTER TABLE public.estimate_line_items
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'material';

ALTER TABLE public.estimate_line_items
  DROP CONSTRAINT IF EXISTS estimate_line_items_source_check;

ALTER TABLE public.estimate_line_items
  ADD CONSTRAINT estimate_line_items_source_check CHECK (source IN ('material','labor'));