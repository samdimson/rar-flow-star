REVOKE ALL ON FUNCTION public.owns_lead(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_customer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_property(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.owns_lead(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_customer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_property(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated, service_role;