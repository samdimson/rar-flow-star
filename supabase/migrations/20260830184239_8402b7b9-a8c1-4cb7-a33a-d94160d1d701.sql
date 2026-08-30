CREATE TABLE public.inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  damage_type text,
  damage_areas text[],
  roof_condition text,
  roof_age int,
  roof_type text,
  roof_stories int,
  storm_date date,
  inspection_notes text,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_reports TO authenticated;
GRANT ALL ON public.inspection_reports TO service_role;

ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspection reports readable" ON public.inspection_reports
  FOR SELECT TO authenticated
  USING (public.can_view_all_leads() OR public.owns_lead(inspection_reports.lead_id));

CREATE POLICY "inspection reports writable" ON public.inspection_reports
  FOR ALL TO authenticated
  USING (public.can_edit() AND (public.can_view_all_leads() OR public.owns_lead(inspection_reports.lead_id)))
  WITH CHECK (public.can_edit());

CREATE INDEX inspection_reports_lead_id_idx ON public.inspection_reports(lead_id);

CREATE TRIGGER inspection_reports_updated_at
  BEFORE UPDATE ON public.inspection_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.documents
  ADD COLUMN inspection_report_id uuid REFERENCES public.inspection_reports(id) ON DELETE SET NULL;

CREATE INDEX documents_inspection_report_id_idx ON public.documents(inspection_report_id);