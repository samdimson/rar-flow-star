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
  ELSIF NEW.task_code = '4.1' THEN
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
    SELECT rcv_amount INTO _rcv
    FROM public.insurance_claims
    WHERE lead_id = NEW.id
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