import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const MIN_INSPECTION_PHOTOS = 10;

export type InspectionReportRow = {
  id: string;
  lead_id: string;
  damage_type: string | null;
  damage_areas: string[] | null;
  roof_condition: string | null;
  roof_age: number | null;
  roof_type: string | null;
  roof_stories: number | null;
  storm_date: string | null;
  inspection_notes: string | null;
  created_at: string;
};

export function isInspectionReportComplete(r: InspectionReportRow, photoCount: number) {
  return Boolean(
    r.damage_type &&
      r.damage_areas && r.damage_areas.length > 0 &&
      r.roof_condition &&
      r.roof_age != null &&
      r.roof_type &&
      r.roof_stories != null &&
      r.storm_date &&
      r.inspection_notes &&
      photoCount >= MIN_INSPECTION_PHOTOS,
  );
}

/**
 * Fetches a lead's inspection reports plus per-report photo counts and exposes
 * `hasComplete` — true when at least one report satisfies the full completeness
 * check used to unlock the 2.2/2.3 qualification buttons.
 */
export function useInspectionReports(leadId: string) {
  const reportsQuery = useQuery({
    queryKey: ["inspection_reports", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_reports")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InspectionReportRow[];
    },
  });

  const photoCountsQuery = useQuery({
    queryKey: ["inspection_report_photos", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("inspection_report_id")
        .eq("lead_id", leadId)
        .eq("category", "photo");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const key = (row as { inspection_report_id: string | null }).inspection_report_id;
        if (key) counts[key] = (counts[key] ?? 0) + 1;
      }
      return counts;
    },
  });

  const reports = reportsQuery.data ?? [];
  const photoCounts = photoCountsQuery.data ?? {};
  const hasComplete = reports.some((r) => isInspectionReportComplete(r, photoCounts[r.id] ?? 0));

  return {
    reports,
    photoCounts,
    hasComplete,
    isLoading: reportsQuery.isLoading,
  };
}
