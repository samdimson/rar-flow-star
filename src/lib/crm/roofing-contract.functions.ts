import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SignRoofingContractInput } from "./roofing-contract-run.server";

export const signRoofingContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SignRoofingContractInput) => data)
  .handler(async ({ data, context }) => {
    const { runSignRoofingContract } = await import("./roofing-contract-run.server");
    return runSignRoofingContract(data, context.supabase, context.userId);
  });
