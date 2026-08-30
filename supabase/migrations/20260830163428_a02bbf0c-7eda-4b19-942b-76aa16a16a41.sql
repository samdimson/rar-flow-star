-- 1. Kweku gets owner_manager
INSERT INTO public.user_roles (user_id, role)
VALUES ('9105c87c-7c4b-4065-b283-571e6f57d390', 'owner_manager')
ON CONFLICT DO NOTHING;

-- 2. Ownership helper functions
CREATE OR REPLACE FUNCTION public.owns_lead(_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _lead_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = _lead_id
      AND (l.assigned_rep_id = auth.uid() OR l.created_by = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_customer(_customer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _customer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.customer_id = _customer_id
      AND (l.assigned_rep_id = auth.uid() OR l.created_by = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_property(_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.property_id = _property_id
      AND (l.assigned_rep_id = auth.uid() OR l.created_by = auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.owns_lead(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_customer(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_property(uuid) FROM anon;

-- 3. Scoped SELECT + write policies

-- customers (no lead_id; join via leads.customer_id)
ALTER POLICY "customers readable" ON public.customers
  USING (public.can_view_all_leads() OR public.owns_customer(customers.id));
ALTER POLICY "customers writable" ON public.customers
  USING (public.can_edit() AND (public.can_view_all_leads() OR public.owns_customer(customers.id)))
  WITH CHECK (public.can_edit());

-- properties (join via leads.property_id)
ALTER POLICY "properties readable" ON public.properties
  USING (public.can_view_all_leads() OR public.owns_property(properties.id));
ALTER POLICY "properties writable" ON public.properties
  USING (public.can_edit() AND (public.can_view_all_leads() OR public.owns_property(properties.id)))
  WITH CHECK (public.can_edit());

-- documents (lead_id, with customer_id fallback)
ALTER POLICY "documents readable" ON public.documents
  USING (public.can_view_all_leads() OR public.owns_lead(documents.lead_id) OR public.owns_customer(documents.customer_id));
ALTER POLICY "documents writable" ON public.documents
  USING (public.can_edit() AND (public.can_view_all_leads() OR public.owns_lead(documents.lead_id) OR public.owns_customer(documents.customer_id)))
  WITH CHECK (public.can_edit());

-- insurance_claims
ALTER POLICY "claims readable" ON public.insurance_claims
  USING (public.can_view_all_leads() OR public.owns_lead(insurance_claims.lead_id));
ALTER POLICY "claims writable" ON public.insurance_claims
  USING (public.can_edit() AND (public.can_view_all_leads() OR public.owns_lead(insurance_claims.lead_id)))
  WITH CHECK (public.can_edit());

-- estimates
ALTER POLICY "estimates readable" ON public.estimates
  USING (public.can_view_all_leads() OR public.owns_lead(estimates.lead_id));
ALTER POLICY "estimates writable" ON public.estimates
  USING (public.can_edit() AND (public.can_view_all_leads() OR public.owns_lead(estimates.lead_id)))
  WITH CHECK (public.can_edit());

-- contracts (lead_id, with customer_id fallback)
ALTER POLICY "contracts readable" ON public.contracts
  USING (public.can_view_all_leads() OR public.owns_lead(contracts.lead_id) OR public.owns_customer(contracts.customer_id));
ALTER POLICY "contracts writable" ON public.contracts
  USING (public.can_edit() AND (public.can_view_all_leads() OR public.owns_lead(contracts.lead_id) OR public.owns_customer(contracts.customer_id)))
  WITH CHECK (public.can_edit());

-- production_jobs
ALTER POLICY "production readable" ON public.production_jobs
  USING (public.can_view_all_leads() OR public.owns_lead(production_jobs.lead_id));
ALTER POLICY "production writable" ON public.production_jobs
  USING (public.can_edit() AND (public.can_view_all_leads() OR public.owns_lead(production_jobs.lead_id)))
  WITH CHECK (public.can_edit());

-- 4. Company-wide dashboard aggregates (no PII, no row-level data)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_leads', (SELECT count(*) FROM public.leads),
    'new_leads_30d', (SELECT count(*) FROM public.leads WHERE created_at > now() - interval '30 days'),
    'contacted_30d', (SELECT count(*) FROM public.leads WHERE created_at > now() - interval '30 days' AND task_code <> '1.1'),
    'won_count', (SELECT count(*) FROM public.leads WHERE status = 'won'),
    'total_contract_value', (SELECT COALESCE(SUM(COALESCE(contract_amount, estimated_value, 0)), 0) FROM public.leads WHERE status = 'won'),
    'task_counts', (
      SELECT COALESCE(jsonb_object_agg(task_code, c), '{}'::jsonb)
      FROM (SELECT task_code, count(*) AS c FROM public.leads GROUP BY task_code) t
    ),
    'stage_counts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('stage_id', stage_id, 'count', c, 'value', v) ORDER BY stage_id), '[]'::jsonb)
      FROM (
        SELECT stage_id, count(*) AS c,
               COALESCE(SUM(COALESCE(contract_amount, estimated_value, 0)), 0) AS v
        FROM public.leads GROUP BY stage_id
      ) s
    ),
    'rep_performance', (
      SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'revenue')::numeric DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'id', p.id,
          'name', COALESCE(NULLIF(p.full_name, ''), p.email, 'Unnamed'),
          'leads', count(l.id),
          'inspections', count(l.id) FILTER (WHERE l.stage_id >= 2),
          'sold', count(l.id) FILTER (WHERE l.stage_id >= 5),
          'won', count(l.id) FILTER (WHERE l.status = 'won'),
          'revenue', COALESCE(SUM(l.contract_amount) FILTER (WHERE l.status = 'won'), 0)
        ) AS r
        FROM public.profiles p
        JOIN public.leads l ON l.assigned_rep_id = p.id
        GROUP BY p.id, p.full_name, p.email
      ) x
    ),
    'invoiced_total', (SELECT COALESCE(SUM(amount), 0) FROM public.invoices),
    'collected_total', (SELECT COALESCE(SUM(amount), 0) FROM public.payments)
  );
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;