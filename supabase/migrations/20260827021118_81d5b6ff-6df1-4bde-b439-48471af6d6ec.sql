CREATE TABLE public.material_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  unit text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (description)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_prices TO authenticated;
GRANT ALL ON public.material_prices TO service_role;

ALTER TABLE public.material_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "material_prices_read_authenticated" ON public.material_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "material_prices_manage" ON public.material_prices
  FOR ALL TO authenticated USING (public.can_manage()) WITH CHECK (public.can_manage());

CREATE TRIGGER material_prices_updated_at BEFORE UPDATE ON public.material_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();