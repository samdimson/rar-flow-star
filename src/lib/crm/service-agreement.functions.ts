import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SignServiceAgreementInput } from "./service-agreement-run.server";

export const signServiceAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SignServiceAgreementInput) => data)
  .handler(async ({ data, context }) => {
    const { runSignServiceAgreement } = await import("./service-agreement-run.server");
    return runSignServiceAgreement(data, context.supabase, context.userId);
  });
