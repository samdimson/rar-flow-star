
-- Recalculate pending milestone payout amounts whenever a lead's net amount changes
CREATE OR REPLACE FUNCTION public.recalc_pending_milestone_amounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rate numeric;
  _commission numeric;
BEGIN
  IF NEW.net_amount IS NOT DISTINCT FROM OLD.net_amount OR NEW.assigned_rep_id IS NULL THEN
    RETURN NEW;
  END IF;

  _rate := public.get_rep_tier_rate(NEW.assigned_rep_id);
  _commission := COALESCE(NEW.net_amount, 0) * COALESCE(_rate, 0);

  UPDATE public.milestone_payouts
  SET amount = CASE
        WHEN milestone = 1 THEN 500
        WHEN milestone = 2 THEN ROUND(_commission * 0.5, 2)
        ELSE ROUND((_commission * 0.5) - 500, 2)
      END,
      notes = CASE
        WHEN COALESCE(NEW.net_amount, 0) = 0
          THEN 'net_amount not set — recalculate after saving estimates'
        ELSE COALESCE(notes, '')
      END
  WHERE lead_id = NEW.id AND status = 'pending';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_recalc_pending_milestones ON public.leads;
CREATE TRIGGER leads_recalc_pending_milestones
AFTER UPDATE OF net_amount ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.recalc_pending_milestone_amounts();

-- Roll approved change orders into the lead contract amount
CREATE OR REPLACE FUNCTION public.apply_change_order_to_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _was_applied boolean := false;
  _is_applied boolean := false;
  _delta numeric := 0;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    _was_applied := (OLD.status = 'approved' AND OLD.homeowner_approved);
  END IF;
  _is_applied := (NEW.status = 'approved' AND NEW.homeowner_approved);

  IF _was_applied AND _is_applied THEN
    _delta := COALESCE(NEW.amount, 0) - COALESCE(OLD.amount, 0);
  ELSIF _is_applied THEN
    _delta := COALESCE(NEW.amount, 0);
  ELSIF _was_applied THEN
    _delta := -COALESCE(OLD.amount, 0);
  END IF;

  IF _delta <> 0 THEN
    UPDATE public.leads
    SET contract_amount = ROUND(COALESCE(contract_amount, 0) + _delta, 2)
    WHERE id = NEW.lead_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS change_orders_apply_to_contract ON public.change_orders;
CREATE TRIGGER change_orders_apply_to_contract
AFTER INSERT OR UPDATE OF status, amount, homeowner_approved ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.apply_change_order_to_contract();
