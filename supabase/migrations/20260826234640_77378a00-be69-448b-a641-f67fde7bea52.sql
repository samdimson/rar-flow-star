CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications own select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications own delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications insert by team" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.can_edit() OR user_id = auth.uid());

CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, is_read, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if new.assigned_to is not null then
    insert into public.notifications (user_id, task_id, lead_id, message)
    values (
      new.assigned_to,
      new.id,
      new.lead_id,
      'New task: ' || new.title || ' — due ' ||
        coalesce(to_char(new.due_at, 'Mon DD, YYYY'), 'no due date')
    );
  end if;
  return new;
end; $$;

REVOKE EXECUTE ON FUNCTION public.notify_task_assignment() FROM public, anon, authenticated;

CREATE TRIGGER tasks_notify_assignment
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();