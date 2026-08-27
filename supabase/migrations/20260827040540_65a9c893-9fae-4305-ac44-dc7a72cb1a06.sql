REVOKE ALL ON FUNCTION public.handle_milestone_payouts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_rep_tier_rate(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_rep_commission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rep_tier_rate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rep_commission(uuid) TO authenticated;