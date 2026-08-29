ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS service_agreement_signed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'document_category' AND e.enumlabel = 'service_agreement'
  ) THEN
    ALTER TYPE public.document_category ADD VALUE 'service_agreement';
  END IF;
END $$;