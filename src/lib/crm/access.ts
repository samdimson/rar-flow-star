import { useAuth } from "@/hooks/use-auth";

export const ESTIMATOR_EMAILS = ["kba@riseaboveroofingok.com", "sdimson@riseaboveroofingok.com"];

export function canUseEstimators(
  email: string | null | undefined,
  roles: readonly string[],
): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  return (
    ESTIMATOR_EMAILS.includes(normalized) ||
    roles.includes("admin") ||
    roles.includes("owner_manager")
  );
}

/** Only the two owners plus admins / owner-managers may use the cost estimators. */
export function useEstimatorAccess() {
  const { user, profile, roles, loading } = useAuth();
  return {
    loading,
    allowed: canUseEstimators(profile?.email ?? user?.email, roles),
  };
}
