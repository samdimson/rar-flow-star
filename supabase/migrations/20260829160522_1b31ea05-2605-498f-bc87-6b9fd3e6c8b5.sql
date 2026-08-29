ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'contract';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.contracts ALTER COLUMN contract_amount DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_lead_type_unique ON public.contracts (lead_id, contract_type);

CREATE OR REPLACE FUNCTION public.sync_service_agreement_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.service_agreement_signed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.contracts (lead_id, customer_id, contract_type, contract_amount, signed_at, status, notes)
  VALUES (NEW.id, NEW.customer_id, 'service_agreement', NULL, NEW.service_agreement_signed_at::date, 'signed', 'Signed service agreement')
  ON CONFLICT (lead_id, contract_type) DO UPDATE
    SET signed_at = EXCLUDED.signed_at,
        customer_id = EXCLUDED.customer_id,
        status = 'signed';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_sync_service_agreement_contract ON public.leads;
CREATE TRIGGER leads_sync_service_agreement_contract
AFTER INSERT OR UPDATE OF service_agreement_signed_at ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.sync_service_agreement_contract();

UPDATE public.contracts c SET customer_id = l.customer_id
FROM public.leads l WHERE l.id = c.lead_id AND c.customer_id IS NULL;

INSERT INTO public.contracts (lead_id, customer_id, contract_type, contract_amount, signed_at, status, notes)
SELECT l.id, l.customer_id, 'service_agreement', NULL, l.service_agreement_signed_at::date, 'signed', 'Signed service agreement'
FROM public.leads l
WHERE l.service_agreement_signed_at IS NOT NULL
ON CONFLICT (lead_id, contract_type) DO NOTHING;