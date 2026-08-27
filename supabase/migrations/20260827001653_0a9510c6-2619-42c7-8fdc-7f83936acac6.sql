CREATE TABLE public.supplements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  supplement_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','denied','partial')),
  submitted_at date,
  carrier_response_at date,
  requested_amount numeric(12,2),
  approved_amount numeric(12,2),
  line_items text,
  scope_description text,
  supporting_docs_notes text,
  xactimate_line_codes text,
  code_upgrade_items text,
  adjuster_name text,
  adjuster_email text,
  adjuster_phone text,
  denial_reason text,
  appeal_submitted_at date,
  appeal_outcome text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplements TO authenticated;
GRANT ALL ON public.supplements TO service_role;

ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view supplements" ON public.supplements
  FOR SELECT TO authenticated USING (public.can_view_all_leads() OR public.can_edit());

CREATE POLICY "Editors manage supplements" ON public.supplements
  FOR ALL TO authenticated USING (public.can_edit()) WITH CHECK (public.can_edit());

CREATE INDEX supplements_lead_id_idx ON public.supplements(lead_id);
CREATE UNIQUE INDEX supplements_lead_number_idx ON public.supplements(lead_id, supplement_number);

CREATE OR REPLACE FUNCTION public.set_supplement_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.supplement_number IS NULL OR NEW.supplement_number <= 1 THEN
    SELECT COALESCE(MAX(supplement_number), 0) + 1 INTO NEW.supplement_number
    FROM public.supplements WHERE lead_id = NEW.lead_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER supplements_set_number BEFORE INSERT ON public.supplements
  FOR EACH ROW EXECUTE FUNCTION public.set_supplement_number();

CREATE TRIGGER supplements_updated_at BEFORE UPDATE ON public.supplements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.insurance_claims
  DROP COLUMN IF EXISTS supplement_amount,
  DROP COLUMN IF EXISTS supplement_status,
  DROP COLUMN IF EXISTS appeal_status;

DELETE FROM public.appointments a
WHERE a.kind = 'adjuster_meeting'
  AND a.id NOT IN (
    SELECT DISTINCT ON (lead_id) id FROM public.appointments
    WHERE kind = 'adjuster_meeting' AND lead_id IS NOT NULL
    ORDER BY lead_id, created_at DESC
  );

CREATE UNIQUE INDEX appointments_lead_adjuster_meeting_idx
  ON public.appointments(lead_id) WHERE kind = 'adjuster_meeting';