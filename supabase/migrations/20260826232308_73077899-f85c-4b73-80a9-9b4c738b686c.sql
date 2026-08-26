ALTER TABLE public.customers RENAME COLUMN mailing_address_line1 TO address_line1;
ALTER TABLE public.customers RENAME COLUMN mailing_city TO city;
ALTER TABLE public.customers RENAME COLUMN mailing_state TO state;
ALTER TABLE public.customers RENAME COLUMN mailing_postal_code TO postal_code;