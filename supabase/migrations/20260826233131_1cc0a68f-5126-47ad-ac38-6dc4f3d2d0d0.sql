CREATE TYPE public.property_type AS ENUM ('residential_single','residential_multi','condo','mobile','commercial_flat','commercial_low','commercial_steep','industrial','church','other');
CREATE TYPE public.roof_type AS ENUM ('asphalt_shingle','metal','tile','flat_tpo','flat_epdm','flat_mod','wood_shake','slate','other');

UPDATE public.properties SET property_type = CASE
  WHEN property_type IS NULL THEN 'other'
  WHEN lower(property_type) IN ('single family','single-family','single family home','residential','residential_single') THEN 'residential_single'
  WHEN lower(property_type) IN ('multi-family','multi family','residential_multi') THEN 'residential_multi'
  WHEN lower(property_type) IN ('condo','townhome','condo/townhome') THEN 'condo'
  WHEN lower(property_type) IN ('mobile','mobile home') THEN 'mobile'
  WHEN lower(property_type) IN ('commercial','commercial_flat','commercial - flat') THEN 'commercial_flat'
  WHEN lower(property_type) = 'industrial' THEN 'industrial'
  WHEN lower(property_type) IN ('church','non-profit','church/non-profit') THEN 'church'
  ELSE 'other' END;

UPDATE public.properties SET roof_type = CASE
  WHEN roof_type IS NULL THEN 'other'
  WHEN lower(roof_type) LIKE '%shingle%' THEN 'asphalt_shingle'
  WHEN lower(roof_type) LIKE '%metal%' THEN 'metal'
  WHEN lower(roof_type) LIKE '%tile%' THEN 'tile'
  WHEN lower(roof_type) LIKE '%tpo%' THEN 'flat_tpo'
  WHEN lower(roof_type) LIKE '%epdm%' THEN 'flat_epdm'
  WHEN lower(roof_type) LIKE '%bitumen%' OR lower(roof_type) LIKE '%mod%' THEN 'flat_mod'
  WHEN lower(roof_type) LIKE '%shake%' OR lower(roof_type) LIKE '%wood%' THEN 'wood_shake'
  WHEN lower(roof_type) LIKE '%slate%' THEN 'slate'
  ELSE 'other' END;

ALTER TABLE public.properties
  ALTER COLUMN property_type TYPE public.property_type USING property_type::public.property_type,
  ALTER COLUMN property_type SET NOT NULL,
  ALTER COLUMN property_type SET DEFAULT 'residential_single',
  ALTER COLUMN roof_type TYPE public.roof_type USING roof_type::public.roof_type,
  ALTER COLUMN roof_type SET NOT NULL,
  ALTER COLUMN roof_type SET DEFAULT 'asphalt_shingle';