import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/crm/workflow";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

const MANAGE: AppRole[] = ["admin", "owner_manager"];
const EDIT: AppRole[] = ["admin", "owner_manager", "sales_rep", "production_manager", "office_admin"];
const FINANCE: AppRole[] = ["admin", "owner_manager", "office_admin"];
const ALL_LEADS: AppRole[] = ["admin", "owner_manager", "office_admin", "production_manager", "viewer"];

export function useAuth() {
  const { user, session, loading } = useSession();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((r) => r.role);
    },
  });

  const has = (list: AppRole[]) => roles.some((r) => list.includes(r));

  return {
    user,
    session,
    profile,
    roles,
    loading: loading || (!!user && rolesLoading),
    isAdmin: roles.includes("admin"),
    canManage: has(MANAGE),
    canEdit: has(EDIT),
    canViewFinance: has(FINANCE),
    canViewAllLeads: has(ALL_LEADS),
    primaryRole: roles[0] ?? null,
  };
}
