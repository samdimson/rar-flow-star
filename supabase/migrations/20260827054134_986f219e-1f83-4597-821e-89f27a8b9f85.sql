CREATE OR REPLACE FUNCTION public.sync_net_from_estimate_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _estimate_id uuid := COALESCE(NEW.estimate_id, OLD.estimate_id);
  _lead_id uuid;
BEGIN
  SELECT lead_id INTO _lead_id FROM public.estimates WHERE id = _estimate_id;
  IF _lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET net_amount = public.calc_lead_net_amount(id, contract_amount)
    WHERE id = _lead_id AND contract_amount IS NOT NULL;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_net_from_estimate_items() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS estimate_items_sync_net ON public.estimate_line_items;
CREATE TRIGGER estimate_items_sync_net
AFTER INSERT OR UPDATE OR DELETE ON public.estimate_line_items
FOR EACH ROW EXECUTE FUNCTION public.sync_net_from_estimate_items();
