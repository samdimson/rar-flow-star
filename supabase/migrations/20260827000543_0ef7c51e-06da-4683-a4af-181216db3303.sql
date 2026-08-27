CREATE TABLE public.appointment_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  provider_message_id text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_notifications TO authenticated;
GRANT ALL ON public.appointment_notifications TO service_role;

ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view appointment notifications"
  ON public.appointment_notifications FOR SELECT TO authenticated
  USING (public.can_view_all_leads() OR public.can_edit());

CREATE POLICY "Editors can create appointment notifications"
  ON public.appointment_notifications FOR INSERT TO authenticated
  WITH CHECK (public.can_edit());

CREATE POLICY "Editors can update appointment notifications"
  ON public.appointment_notifications FOR UPDATE TO authenticated
  USING (public.can_edit()) WITH CHECK (public.can_edit());

CREATE POLICY "Managers can delete appointment notifications"
  ON public.appointment_notifications FOR DELETE TO authenticated
  USING (public.can_manage());

CREATE INDEX appointment_notifications_appointment_idx ON public.appointment_notifications(appointment_id);
CREATE INDEX appointment_notifications_lead_idx ON public.appointment_notifications(lead_id);

CREATE TRIGGER appointment_notifications_updated_at
  BEFORE UPDATE ON public.appointment_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();