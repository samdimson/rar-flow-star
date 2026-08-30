import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { SeedReport } from "./seed-test-data.server";

export type { SeedReport };

export const seedTestData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SeedReport> => {
    const { data: allowed } = await context.supabase.rpc("can_manage");
    if (!allowed) throw new Error("Only managers and admins can seed test data.");

    const { runSeed } = await import("./seed-test-data.server");
    return runSeed();
  });

export const seedTestInspectionReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string }) => {
    if (!input?.leadId) throw new Error("A lead must be selected.");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ report_id: string; photos: number }> => {
    const { data: allowed } = await context.supabase.rpc("can_manage");
    if (!allowed) throw new Error("Only managers and admins can seed test data.");

    const { seedTestInspection } = await import("./seed-test-data.server");
    return seedTestInspection(data.leadId);
  });
