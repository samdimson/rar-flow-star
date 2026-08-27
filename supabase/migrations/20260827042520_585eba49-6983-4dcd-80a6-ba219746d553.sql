CREATE OR REPLACE FUNCTION public.handle_milestone_payouts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rate numeric;
  _commission numeric;
  _milestone int;
  _amount numeric;
  _old_order int;
  _new_order int;
  _net numeric;
  _rcv numeric;
  _note text := NULL;
BEGIN
  IF NEW.task_code IS NOT DISTINCT FROM OLD.task_code THEN
    RETURN NEW;
  END IF;
  IF NEW.assigned_rep_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.task_code = '5.2' THEN
    _milestone := 1;
  ELSIF NEW.task_code = '5.1' THEN
    _milestone := 2;
  ELSIF NEW.task_code = '6.5' THEN
    _milestone := 3;
  ELSE
    RETURN NEW;
  END IF;

  -- only fire on forward movement through the workflow
  SELECT t.stage_id * 1000 + t.sort_order INTO _old_order
  FROM public.pipeline_tasks t WHERE t.code = OLD.task_code;
  SELECT t.stage_id * 1000 + t.sort_order INTO _new_order
  FROM public.pipeline_tasks t WHERE t.code = NEW.task_code;

  IF _old_order IS NOT NULL AND _new_order IS NOT NULL AND _new_order <= _old_order THEN
    RETURN NEW;
  END IF;

  -- milestone 2 requires an approved insurance claim (RCV > 0)
  IF _milestone = 2 THEN
    SELECT c.rcv_amount INTO _rcv
    FROM public.insurance_claims c
    WHERE c.lead_id = NEW.id
    ORDER BY c.updated_at DESC
    LIMIT 1;

    IF COALESCE(_rcv, 0) <= 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  _rate := public.get_rep_tier_rate(NEW.assigned_rep_id);
  _net := COALESCE(NEW.net_amount, 0);
  _commission := _net * COALESCE(_rate, 0);

  IF _net <= 0 THEN
    _amount := 0;
    _note := 'net_amount not set — recalculate after saving estimates';
  ELSIF _milestone = 1 THEN
    _amount := 500;
  ELSIF _milestone = 2 THEN
    _amount := _commission * 0.5;
  ELSE
    _amount := (_commission * 0.5) - 500;
  END IF;

  INSERT INTO public.milestone_payouts (lead_id, rep_id, milestone, amount, triggered_by_task, notes)
  VALUES (NEW.id, NEW.assigned_rep_id, _milestone, COALESCE(_amount, 0), NEW.task_code, _note)
  ON CONFLICT (lead_id, milestone) DO NOTHING;

  RETURN NEW;
END;
$function$;

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

  SELECT COALESCE(sum(COALESCE(l.net_amount, 0)), 0) INTO _net FROM public.leads l
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