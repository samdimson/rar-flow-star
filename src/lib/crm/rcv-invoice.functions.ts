import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RcvInvoiceInput } from "./rcv-invoice-run.server";

export type EmailRcvInvoiceInput = {
  leadId: string;
  invoiceNumber: string;
  customerEmail: string;
  propertyAddress: string;
};

export const generateRcvInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: RcvInvoiceInput) => data)
  .handler(async ({ data, context }) => {
    const { runGenerateRcvInvoice } = await import("./rcv-invoice-run.server");
    return runGenerateRcvInvoice(data, context.userId);
  });

export const emailRcvInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: EmailRcvInvoiceInput) => data)
  .handler(async ({ data, context }) => {
    const { runEmailRcvInvoice } = await import("./rcv-invoice-run.server");
    return runEmailRcvInvoice(data, context.userId);
  });
