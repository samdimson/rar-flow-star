-- 1. commission_tiers
CREATE TABLE public.commission_tiers (
  id serial PRIMARY KEY,
  min_closed int NOT NULL,
  max_closed int,
  rate numeric(5,4) NOT NULL,
  label text NOT NULL
);

GRANT SELECT ON public.commission_tiers TO authenticated;
GRANT ALL ON public.commission_tiers TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.commission_tiers_id_seq TO service_role;

ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read commission tiers"
  ON public.commission_tiers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage commission tiers"
  ON public.commission_tiers FOR ALL TO authenticated
  USING (public.can_manage()) WITH CHECK (public.can_manage());

INSERT INTO public.commission_tiers (min_closed, max_closed, rate, label) VALUES
  (1, 10, 0.40, 'Tier 1 — 40%'),
  (11, 25, 0.43, 'Tier 2 — 43%'),
  (26, 99, 0.46, 'Tier 3 — 46%'),
  (100, NULL, 0.50, 'Tier 4 — 50%');

-- 2. leads.net_amount
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS net_amount numeric(12,2);

-- 3. milestone_payouts
CREATE TABLE public.milestone_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rep_id uuid REFERENCES auth.users(id),
  milestone int NOT NULL CHECK (milestone IN (1,2,3)),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','clawback')),
  triggered_by_task text,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, milestone)
);

CREATE INDEX idx_milestone_payouts_rep ON public.milestone_payouts(rep_id);
CREATE INDEX idx_milestone_payouts_lead ON public.milestone_payouts(lead_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone_payouts TO authenticated;
GRANT ALL ON public.milestone_payouts TO service_role;

ALTER TABLE public.milestone_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps read own payouts, managers read all"
  ON public.milestone_payouts FOR SELECT TO authenticated
  USING (rep_id = auth.uid() OR public.can_manage() OR public.can_view_finance());

CREATE POLICY "Managers insert payouts"
  ON public.milestone_payouts FOR INSERT TO authenticated
  WITH CHECK (public.can_manage());

CREATE POLICY "Managers update payouts"
  ON public.milestone_payouts FOR UPDATE TO authenticated
  USING (public.can_manage()) WITH CHECK (public.can_manage());

CREATE POLICY "Managers delete payouts"
  ON public.milestone_payouts FOR DELETE TO authenticated
  USING (public.can_manage());

CREATE TRIGGER milestone_payouts_updated_at
  BEFORE UPDATE ON public.milestone_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. commission helper functions
CREATE OR REPLACE FUNCTION public.get_rep_tier_rate(_rep_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT t.rate FROM public.commission_tiers t
      WHERE (SELECT count(*) FROM public.leads l
              WHERE l.assigned_rep_id = _rep_id AND l.task_code = '7.3')
            BETWEEN t.min_closed AND COALESCE(t.max_closed, 999999)
      LIMIT 1),
    (SELECT rate FROM public.commission_tiers ORDER BY min_closed LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_rep_commission(rep_id uuid)
RETURNS TABLE (
  lifetime_closed bigint,
  tier_label text,
  tier_rate numeric,
  next_tier_label text,
  next_tier_min int,
  total_net numeric,
  commission_amount numeric,
  milestone_1_payout numeric,
  milestone_2_payout numeric,
  milestone_3_payout numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _closed bigint;
  _rate numeric;
  _label text;
  _next_label text;
  _next_min int;
  _net numeric;
  _commission numeric;
BEGIN
  IF NOT (rep_id = auth.uid() OR public.can_manage() OR public.can_view_finance()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*) INTO _closed FROM public.leads l
    WHERE l.assigned_rep_id = rep_id AND l.task_code = '7.3';

  SELECT t.rate, t.label INTO _rate, _label FROM public.commission_tiers t
    WHERE _closed BETWEEN t.min_closed AND COALESCE(t.max_closed, 999999)
    LIMIT 1;

  IF _rate IS NULL THEN
    SELECT t.rate, t.label INTO _rate, _label FROM public.commission_tiers t
      ORDER BY t.min_closed LIMIT 1;
  END IF;

  SELECT t.label, t.min_closed INTO _next_label, _next_min FROM public.commission_tiers t
    WHERE t.min_closed > _closed ORDER BY t.min_closed LIMIT 1;

  SELECT COALESCE(sum(COALESCE(l.net_amount, 0)), 0) INTO _net FROM public.leads l
    WHERE l.assigned_rep_id = rep_id AND l.task_code = '7.3';

  _commission := COALESCE(_net, 0) * COALESCE(_rate, 0);

  RETURN QUERY SELECT
    _closed,
    _label,
    _rate,
    _next_label,
    _next_min,
    _net,
    _commission,
    500::numeric,
    _commission * 0.5,
    (_commission * 0.5) - 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rep_commission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rep_tier_rate(uuid) TO authenticated;

-- 5. milestone trigger
CREATE OR REPLACE FUNCTION public.handle_milestone_payouts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rate numeric;
  _commission numeric;
  _milestone int;
  _amount numeric;
BEGIN
  IF NEW.task_code IS NOT DISTINCT FROM OLD.task_code THEN
    RETURN NEW;
  END IF;
  IF NEW.assigned_rep_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.task_code = '5.2' THEN
    _milestone := 1;
  ELSIF NEW.task_code = '3.4' THEN
    _milestone := 2;
  ELSIF NEW.task_code = '6.5' THEN
    _milestone := 3;
  ELSE
    RETURN NEW;
  END IF;

  _rate := public.get_rep_tier_rate(NEW.assigned_rep_id);
  _commission := COALESCE(NEW.net_amount, 0) * COALESCE(_rate, 0);

  IF _milestone = 1 THEN
    _amount := 500;
  ELSIF _milestone = 2 THEN
    _amount := _commission * 0.5;
  ELSE
    _amount := (_commission * 0.5) - 500;
  END IF;

  INSERT INTO public.milestone_payouts (lead_id, rep_id, milestone, amount, triggered_by_task)
  VALUES (NEW.id, NEW.assigned_rep_id, _milestone, _amount, NEW.task_code)
  ON CONFLICT (lead_id, milestone) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_milestone_payouts
  AFTER UPDATE OF task_code ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_milestone_payouts();