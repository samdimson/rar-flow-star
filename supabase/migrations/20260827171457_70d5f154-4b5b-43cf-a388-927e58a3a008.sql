ALTER TYPE public.document_category ADD VALUE 'coc';

ALTER TABLE public.documents
ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN uploaded_at timestamp with time zone NOT NULL DEFAULT now();
