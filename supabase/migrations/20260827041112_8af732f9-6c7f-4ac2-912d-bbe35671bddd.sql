-- 1. Net amount recalculation from saved estimate line items ------------------
CREATE OR REPLACE FUNCTION public.calc_lead_net_amount(_lead_id uuid, _contract_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.calc_lead_net_amount(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calc_lead_net_amount(uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_lead_net_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_amount IS DISTINCT FROM OLD.contract_amount THEN
    NEW.net_amount := public.calc_lead_net_amount(NEW.id, NEW.contract_amount);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_lead_net_amount() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS leads_sync_net_amount ON public.leads;
CREATE TRIGGER leads_sync_net_amount
  BEFORE UPDATE OF contract_amount ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_net_amount();

-- 2. Milestone triggers: milestone 2 moves to task 5.1, forward moves only ----
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
  _old_order int;
  _new_order int;
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

REVOKE ALL ON FUNCTION public.handle_milestone_payouts() FROM PUBLIC, anon, authenticated;

-- 3. Clawback paid milestones when a sold lead is cancelled -------------------
CREATE OR REPLACE FUNCTION public.handle_milestone_clawback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'lost' AND OLD.status IS DISTINCT FROM 'lost' AND NEW.stage_id >= 5 THEN
    UPDATE public.milestone_payouts
    SET status = 'clawback',
        notes = COALESCE(notes || ' | ', '') || 'Clawback — lead cancelled at task ' || NEW.task_code
    WHERE lead_id = NEW.id AND status = 'paid';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_milestone_clawback() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS leads_milestone_clawback ON public.leads;
CREATE TRIGGER leads_milestone_clawback
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_milestone_clawback();