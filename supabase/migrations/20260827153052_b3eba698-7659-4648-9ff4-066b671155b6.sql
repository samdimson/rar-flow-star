ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS overhead_amount numeric(12,2) DEFAULT 0;

-- gross after costs (contract - materials - labor), before overhead
CREATE OR REPLACE FUNCTION public.calc_lead_gross_after_costs(_lead_id uuid, _contract_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _estimate_id uuid;
  _materials numeric := 0;
  _labor numeric := 0;
BEGIN
  IF COALESCE(_contract_amount, 0) = 0 THEN
    RETURN 0;
  END IF;

  SELECT id INTO _estimate_id
  FROM public.estimates
  WHERE lead_id = _lead_id AND source = 'internal'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _estimate_id IS NOT NULL THEN
    SELECT
      COALESCE(SUM(CASE WHEN source = 'labor' THEN 0 ELSE quantity * unit_price END), 0),
      COALESCE(SUM(CASE WHEN source = 'labor' THEN quantity * unit_price ELSE 0 END), 0)
    INTO _materials, _labor
    FROM public.estimate_line_items
    WHERE estimate_id = _estimate_id;
  END IF;

  RETURN ROUND(COALESCE(_contract_amount, 0) - _materials - _labor, 2);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.calc_lead_gross_after_costs(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- net = (contract - materials - labor) * 0.85 after 15% overhead deduction
CREATE OR REPLACE FUNCTION public.calc_lead_net_amount(_lead_id uuid, _contract_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN ROUND(public.calc_lead_gross_after_costs(_lead_id, _contract_amount) * 0.85, 2);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calc_lead_overhead_amount(_lead_id uuid, _contract_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN ROUND(public.calc_lead_gross_after_costs(_lead_id, _contract_amount) * 0.15, 2);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.calc_lead_overhead_amount(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- keep overhead in sync with net on contract changes
CREATE OR REPLACE FUNCTION public.sync_lead_net_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.contract_amount IS DISTINCT FROM OLD.contract_amount THEN
    NEW.net_amount := public.calc_lead_net_amount(NEW.id, NEW.contract_amount);
    NEW.overhead_amount := public.calc_lead_overhead_amount(NEW.id, NEW.contract_amount);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_net_from_estimate_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _estimate_id uuid := COALESCE(NEW.estimate_id, OLD.estimate_id);
  _lead_id uuid;
BEGIN
  SELECT lead_id INTO _lead_id FROM public.estimates WHERE id = _estimate_id;
  IF _lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET net_amount = public.calc_lead_net_amount(id, contract_amount),
        overhead_amount = public.calc_lead_overhead_amount(id, contract_amount)
    WHERE id = _lead_id AND contract_amount IS NOT NULL;
  END IF;
  RETURN NULL;
END;
$function$;

-- get_rep_commission: net = (contract - materials - labor) * 0.85 after 15% overhead deduction
CREATE OR REPLACE FUNCTION public.get_rep_commission(rep_id uuid)
 RETURNS TABLE(lifetime_closed bigint, tier_label text, tier_rate numeric, next_tier_label text, next_tier_min integer, total_net numeric, commission_amount numeric, milestone_1_payout numeric, milestone_2_payout numeric, milestone_3_payout numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- net = (contract - materials - labor) * 0.85 after 15% overhead deduction
  SELECT COALESCE(sum(ROUND(public.calc_lead_gross_after_costs(l.id, l.contract_amount) * 0.85, 2)), 0)
    INTO _net FROM public.leads l
    WHERE l.assigned_rep_id = rep_id AND l.task_code = '7.3';

  _net := COALESCE(_net, 0);
  _commission := _net * COALESCE(_rate, 0);

  IF _net <= 0 THEN
    RETURN QUERY SELECT _closed, _label, _rate, _next_label, _next_min, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

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
$function$;

-- backfill existing leads with the new formula
UPDATE public.leads
SET net_amount = public.calc_lead_net_amount(id, contract_amount),
    overhead_amount = public.calc_lead_overhead_amount(id, contract_amount)
WHERE contract_amount IS NOT NULL;