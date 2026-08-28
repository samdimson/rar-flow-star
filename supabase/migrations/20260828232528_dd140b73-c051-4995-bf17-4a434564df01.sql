CREATE UNIQUE INDEX IF NOT EXISTS unique_property_address
  ON public.properties (address_line1, postal_code)
  WHERE address_line1 IS NOT NULL AND postal_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_unique_active_property_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing text;
BEGIN
  IF NEW.property_id IS NULL OR NEW.status IN ('lost','won') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.property_id IS NOT DISTINCT FROM NEW.property_id
     AND OLD.status NOT IN ('lost','won') THEN
    RETURN NEW;
  END IF;

  -- managers/admins may override (reassignment, split properties)
  IF public.can_manage() THEN
    RETURN NEW;
  END IF;

  SELECT l.lead_number INTO _existing
  FROM public.leads l
  WHERE l.property_id = NEW.property_id
    AND l.id <> NEW.id
    AND l.status NOT IN ('lost','won')
  LIMIT 1;

  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'This property already has an active lead (%). Duplicate active leads for the same property are not allowed.', _existing;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_unique_active_property ON public.leads;
CREATE TRIGGER leads_unique_active_property
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_active_property_lead();