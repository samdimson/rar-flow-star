CREATE TABLE public.estimate_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  item text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_line_items TO authenticated;
GRANT ALL ON public.estimate_line_items TO service_role;

ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view estimate line items"
ON public.estimate_line_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors can manage estimate line items"
ON public.estimate_line_items FOR ALL TO authenticated
USING (public.can_edit()) WITH CHECK (public.can_edit());

CREATE INDEX idx_estimate_line_items_estimate ON public.estimate_line_items(estimate_id);

CREATE TRIGGER update_estimate_line_items_updated_at
BEFORE UPDATE ON public.estimate_line_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();