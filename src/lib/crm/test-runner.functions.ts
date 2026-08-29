import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TestResult = {
  id: string;
  description: string;
  status: "PASS" | "FAIL";
  detail: string;
};

export type TestReport = {
  results: TestResult[];
  summary: { passed: number; failed: number; total: number; duration_ms: number };
};

const TIMEOUT_MS = 10_000;

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const runCrmTests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TestReport> => {
    const { data: allowed } = await context.supabase.rpc("can_manage");
    if (!allowed) throw new Error("Only managers and admins can run the CRM test suite.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const started = Date.now();

    const work = (async (): Promise<TestResult[]> => {
      const results: TestResult[] = [];
      const add = (id: string, description: string, ok: boolean, detail: string) =>
        results.push({ id, description, status: ok ? "PASS" : "FAIL", detail });

      const fetchAll = async <T>(
        table: string,
        columns: string,
      ): Promise<T[]> => {
        const client = supabaseAdmin as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
            };
          };
        };
        const { data, error } = await client.from(table).select(columns).limit(5000);

        if (error) throw new Error(`${table}: ${error.message}`);
        return (data ?? []) as T[];
      };

      const [tasksCatalog, leads, payouts, claims, lineItems, prodJobs, appts, history, invoices, payments, tasks, notifications] =
        await Promise.all([
          fetchAll<{ code: string; stage_id: number; sort_order: number }>(
            "pipeline_tasks",
            "code, stage_id, sort_order",
          ),
          fetchAll<{
            id: string;
            lead_number: string;
            status: string;
            task_code: string;
            customer_id: string | null;
            property_id: string | null;
            contract_amount: number | null;
            net_amount: number | null;
            inspection_date: string | null;
            assigned_rep_id: string | null;
          }>(
            "leads",
            "id, lead_number, status, task_code, customer_id, property_id, contract_amount, net_amount, inspection_date, assigned_rep_id",
          ),
          fetchAll<{
            lead_id: string;
            milestone: number;
            status: string;
            amount: number;
            paid_at: string | null;
          }>("milestone_payouts", "lead_id, milestone, status, amount, paid_at"),
          fetchAll<{ lead_id: string; carrier: string | null; adjuster_meeting_at: string | null }>(
            "insurance_claims",
            "lead_id, carrier, adjuster_meeting_at",
          ),
          fetchAll<{
            id: string;
            estimate_id: string;
            quantity: number;
            unit_price: number;
            total: number | null;
          }>("estimate_line_items", "id, estimate_id, quantity, unit_price, total"),
          fetchAll<{ lead_id: string }>("production_jobs", "lead_id"),
          fetchAll<{ lead_id: string | null; kind: string }>("appointments", "lead_id, kind"),
          fetchAll<{ lead_id: string }>("lead_stage_history", "lead_id"),
          fetchAll<{ id: string; lead_id: string; amount: number; status: string; invoice_number: string | null }>(
            "invoices",
            "id, lead_id, amount, status, invoice_number",
          ),
          fetchAll<{ invoice_id: string | null; lead_id: string; amount: number }>("payments", "invoice_id, lead_id, amount"),
          fetchAll<{ id: string; title: string; assigned_to: string | null }>(
            "tasks",
            "id, title, assigned_to",
          ),
          fetchAll<{ user_id: string | null; task_id: string | null }>(
            "notifications",
            "user_id, task_id",
          ),
        ]);

      const ordered = [...tasksCatalog].sort(
        (a, b) => a.stage_id - b.stage_id || a.sort_order - b.sort_order,
      );
      const rank = new Map(ordered.map((t, i) => [t.code, i]));
      const range = (from: string, to: string) => {
        const lo = rank.get(from) ?? 0;
        const hi = rank.get(to) ?? ordered.length - 1;
        return new Set(ordered.slice(lo, hi + 1).map((t) => t.code));
      };

      const byNumber = new Map(leads.map((l) => [l.lead_number, l]));
      const leadName = new Map(leads.map((l) => [l.id, l.lead_number]));
      const payoutsFor = (leadId: string, milestone?: number) =>
        payouts.filter((p) => p.lead_id === leadId && (milestone === undefined || p.milestone === milestone));
      const claimFor = (leadId: string) => claims.find((c) => c.lead_id === leadId);
      const list = (arr: string[]) => (arr.length ? arr.slice(0, 12).join(", ") + (arr.length > 12 ? ` +${arr.length - 12} more` : "") : "none");

      const isTestLead = (l: { lead_number: string }) => l.lead_number.startsWith("RAR-T0");

      // ---------- WORKFLOW ----------
      const t062 = byNumber.get("RAR-T062");
      add(
        "T-W1",
        "RAR-T062 is status=lost at task 5.3",
        t062?.status === "lost" && t062?.task_code === "5.3",
        t062 ? `status=${t062.status}, task_code=${t062.task_code}` : "RAR-T062 not found",
      );

      const t027 = byNumber.get("RAR-T027");
      const t027M2 = t027 ? payoutsFor(t027.id, 2).length : -1;
      add("T-W2", "RAR-T027 has exactly one milestone 2 payout", t027M2 === 1, `count=${t027M2}`);

      const w3Bad = leads
        .filter(isTestLead)
        .filter((l) => ["3.1", "3.2", "3.3", "3.4"].includes(l.task_code))
        .filter((l) => !claimFor(l.id)?.carrier)
        .map((l) => l.lead_number);
      add(
        "T-W3",
        "Leads at 3.1–3.4 have an insurance claim with a carrier",
        w3Bad.length === 0,
        w3Bad.length ? `missing: ${list(w3Bad)}` : "all leads at 3.1–3.4 have a carrier",
      );

      const w4Bad = leads
        .filter(isTestLead)
        .filter((l) => l.task_code === "3.5")
        .filter((l) => payoutsFor(l.id, 2).some((p) => p.status === "paid"))
        .map((l) => l.lead_number);
      add(
        "T-W4",
        "No lead at 3.5 (denied/underpaid) has a paid milestone 2",
        w4Bad.length === 0,
        w4Bad.length ? `offending: ${list(w4Bad)}` : "no paid milestone 2 on denied claims",
      );

      const t063 = byNumber.get("RAR-T063");
      const t063M2 = t063 ? payoutsFor(t063.id, 2).length : -1;
      add("T-W5", "RAR-T063 (cash job) has no milestone 2 payout", t063M2 === 0, `count=${t063M2}`);

      // ---------- COMMISSION ----------
      const t053 = byNumber.get("RAR-T053");
      const t053Payments = t053
        ? payments.filter((p) => p.lead_id === t053.id).reduce((s, p) => s + Number(p.amount), 0)
        : -1;
      add(
        "T-C1",
        "RAR-T053 payments total the $22,400 contract amount",
        Math.abs(t053Payments - 22400) < 0.01,
        `payments total = ${money(t053Payments)}`,
      );

      const t055 = byNumber.get("RAR-T055");
      let tierDetail = "RAR-T055 rep not found";
      let tierOk = false;
      if (t055?.assigned_rep_id) {
        const { data, error } = await supabaseAdmin.rpc("get_rep_commission", {
          rep_id: t055.assigned_rep_id,
        });
        const row = Array.isArray(data) ? data[0] : data;
        const rate = row ? Number((row as { tier_rate: number }).tier_rate) : NaN;
        tierOk = Math.abs(rate - 0.4) < 0.0001;
        tierDetail = error ? error.message : `tier_rate = ${Number.isNaN(rate) ? "n/a" : rate.toFixed(4)}`;
      }
      add("T-C2", "RAR-T055 rep (Jeremy) tier rate is 0.40", tierOk, tierDetail);

      const t062M1 = t062 ? payoutsFor(t062.id, 1) : [];
      add(
        "T-C3",
        "RAR-T062 milestone 1 is clawed back",
        t062M1.length === 1 && t062M1[0]!.status === "clawback",
        t062M1.length ? `status=${t062M1.map((p) => p.status).join(", ")}` : "no milestone 1 row",
      );

      const testLeadIds = new Set(leads.filter(isTestLead).map((l) => l.id));
      const c4Bad = payouts
        .filter((p) => testLeadIds.has(p.lead_id))
        .filter((p) => p.status === "paid" && !p.paid_at)
        .map((p) => `${leadName.get(p.lead_id) ?? p.lead_id} M${p.milestone}`);
      add(
        "T-C4",
        "Every paid payout has paid_at set",
        c4Bad.length === 0,
        c4Bad.length ? `missing paid_at: ${list(c4Bad)}` : `${payouts.filter((p) => p.status === "paid").length} paid payouts all dated`,
      );

      const c5Bad = payouts
        .filter((p) => testLeadIds.has(p.lead_id))
        .filter((p) => Number(p.amount) < 0)
        .map((p) => `${leadName.get(p.lead_id) ?? p.lead_id} M${p.milestone} ${money(Number(p.amount))}`);
      add(
        "T-C5",
        "No negative payout amounts",
        c5Bad.length === 0,
        c5Bad.length ? list(c5Bad) : `${payouts.length} payouts, all >= 0`,
      );

      // ---------- RELATIONSHIPS ----------
      const r1 = leads.filter((l) => !l.customer_id).map((l) => l.lead_number);
      add("T-R1", "Every lead has a customer", r1.length === 0, r1.length ? list(r1) : `${leads.length} leads linked`);

      const r2 = leads.filter((l) => !l.property_id).map((l) => l.lead_number);
      add("T-R2", "Every lead has a property", r2.length === 0, r2.length ? list(r2) : `${leads.length} leads linked`);

      const historySet = new Set(history.map((h) => h.lead_id));
      const r3 = leads.filter((l) => !historySet.has(l.id)).map((l) => l.lead_number);
      add(
        "T-R3",
        "Every lead has stage history",
        r3.length === 0,
        r3.length ? list(r3) : `${history.length} history rows across ${leads.length} leads`,
      );

      const prodRange = range("5.3", "7.3");
      const prodSet = new Set(prodJobs.map((p) => p.lead_id));
      const r4 = leads
        .filter((l) => prodRange.has(l.task_code) && !prodSet.has(l.id))
        .map((l) => l.lead_number);
      add(
        "T-R4",
        "Leads at 5.3–7.3 have a production job",
        r4.length === 0,
        r4.length ? `missing: ${list(r4)}` : "all production-stage leads have jobs",
      );

      const apptKinds = new Map<string, Set<string>>();
      for (const a of appts) {
        if (!a.lead_id) continue;
        if (!apptKinds.has(a.lead_id)) apptKinds.set(a.lead_id, new Set());
        apptKinds.get(a.lead_id)!.add(a.kind);
      }
      const r5 = leads
        .filter((l) => l.inspection_date && !apptKinds.get(l.id)?.has("inspection"))
        .map((l) => l.lead_number);
      add(
        "T-R5",
        "Leads with an inspection date have an inspection appointment",
        r5.length === 0,
        r5.length ? `missing: ${list(r5)}` : "all inspections scheduled",
      );

      const r6 = claims
        .filter((c) => c.adjuster_meeting_at && !apptKinds.get(c.lead_id)?.has("adjuster_meeting"))
        .map((c) => leadName.get(c.lead_id) ?? c.lead_id);
      add(
        "T-R6",
        "Claims with an adjuster meeting have an adjuster appointment",
        r6.length === 0,
        r6.length ? `missing: ${list(r6)}` : "all adjuster meetings scheduled",
      );

      // ---------- FINANCIAL ----------
      const moneyRange = range("5.1", "8.3");
      const f1 = leads
        .filter(isTestLead)
        .filter((l) => moneyRange.has(l.task_code) && !(Number(l.net_amount) > 0))
        .map((l) => `${l.lead_number} (${l.net_amount ?? "null"})`);
      add(
        "T-F1",
        "Leads at 5.1–8.3 have a positive net amount",
        f1.length === 0,
        f1.length ? list(f1) : "all contracted leads have net > 0",
      );

      const f2 = lineItems
        .filter((li) => {
          const qty = Number(li.quantity);
          const price = Number(li.unit_price);
          const total = Number(li.total ?? 0);
          return !(qty > 0) || !(price > 0) || Math.abs(total - qty * price) > 0.01;
        })
        .map((li) => `${li.id.slice(0, 8)} (${li.quantity} x ${li.unit_price} = ${li.total})`);
      add(
        "T-F2",
        "Line items have positive quantity/price and a consistent total",
        f2.length === 0,
        f2.length ? list(f2) : `${lineItems.length} line items consistent`,
      );

      const tc6 = byNumber.get("RAR-TC6");
      add(
        "T-F3",
        "RAR-TC6 contract amount is $20,140 after the change order",
        Math.abs(Number(tc6?.contract_amount ?? 0) - 20140) < 0.01,
        tc6 ? `contract_amount = ${money(Number(tc6.contract_amount ?? 0))}` : "RAR-TC6 not found",
      );

      const f4 = invoices
        .filter((inv) => inv.status === "paid")
        .filter((inv) => {
          const paid = payments
            .filter((p) => p.invoice_id === inv.id)
            .reduce((s, p) => s + Number(p.amount), 0);
          return Math.abs(paid - Number(inv.amount)) > 1;
        })
        .map((inv) => `${inv.invoice_number ?? inv.id.slice(0, 8)} (${money(Number(inv.amount))})`);
      add(
        "T-F4",
        "Paid invoices are fully covered by payments",
        f4.length === 0,
        f4.length ? `mismatched: ${list(f4)}` : `${invoices.filter((i) => i.status === "paid").length} paid invoices reconciled`,
      );

      // ---------- NOTIFICATIONS ----------
      const notifiedTasks = new Set(notifications.map((n) => n.task_id).filter(Boolean) as string[]);
      const n1 = tasks
        .filter((t) => t.assigned_to && !notifiedTasks.has(t.id))
        .map((t) => t.title);
      add(
        "T-N1",
        "Assigned tasks produced a notification",
        n1.length === 0,
        n1.length ? `missing: ${list(n1)}` : `${tasks.filter((t) => t.assigned_to).length} assigned tasks notified`,
      );

      const nullUsers = notifications.filter((n) => !n.user_id).length;
      add("T-N2", "No notifications with a null recipient", nullUsers === 0, `null user_id count = ${nullUsers}`);

      return results;
    })();

    const results = await Promise.race([
      work,
      new Promise<TestResult[]>((_, reject) =>
        setTimeout(() => reject(new Error("Test run exceeded the 10 second limit.")), TIMEOUT_MS),
      ),
    ]);

    const failed = results.filter((r) => r.status === "FAIL").length;
    return {
      results,
      summary: {
        passed: results.length - failed,
        failed,
        total: results.length,
        duration_ms: Date.now() - started,
      },
    };
  });
