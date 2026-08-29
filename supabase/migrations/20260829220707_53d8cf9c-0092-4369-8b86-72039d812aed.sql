ALTER TABLE public.insurance_claims
  ADD COLUMN IF NOT EXISTS depreciation_recoverable numeric,
  ADD COLUMN IF NOT EXISTS depreciation_non_recoverable numeric;