import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IssueCocInput = { leadId: string; origin: string };

export const issueCoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: IssueCocInput) => data)
  .handler(async ({ data, context }) => {
    const { runIssueCoc } = await import("./coc-issue.server");
    return runIssueCoc(data, context.supabase, context.userId);
  });
