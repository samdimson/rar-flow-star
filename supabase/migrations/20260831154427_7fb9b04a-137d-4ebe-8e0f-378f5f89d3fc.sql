DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.leads
   WHERE damage_type IS NOT NULL OR damage_areas IS NOT NULL
      OR roof_condition IS NOT NULL OR inspection_notes IS NOT NULL;
  RAISE NOTICE 'leads rows with mirrored inspection data: %', n;
END $$;

ALTER TABLE public.leads
  DROP COLUMN IF EXISTS damage_type,
  DROP COLUMN IF EXISTS damage_areas,
  DROP COLUMN IF EXISTS roof_condition,
  DROP COLUMN IF EXISTS inspection_notes;

ALTER TABLE public.insurance_claims
  DROP COLUMN IF EXISTS supplement_amount,
  DROP COLUMN IF EXISTS supplement_status,
  DROP COLUMN IF EXISTS appeal_status;