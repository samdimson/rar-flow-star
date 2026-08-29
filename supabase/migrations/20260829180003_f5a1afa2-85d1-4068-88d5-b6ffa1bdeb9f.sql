ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS scope_summary jsonb,
  ADD COLUMN IF NOT EXISTS scope_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;