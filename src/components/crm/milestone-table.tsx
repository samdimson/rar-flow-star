import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crm/primitives";
import { currencyExact, dateTime, titleCase } from "@/lib/crm/format";
import {
import { LeadIdentityHeader } from "@/components/crm/lead-identity-header";
  MILESTONE_LABELS,
  PAYOUT_STATUS_CLASSES,
  useMarkPayoutPaid,
  type PayoutWithLead,
} from "@/lib/crm/commissions";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        PAYOUT_STATUS_CLASSES[status] ?? "bg-secondary text-secondary-foreground"
      }`}
    >
      {titleCase(status)}
    </span>
  );
}

export function MilestoneTable({
  payouts,
  canManage,
  showLead = true,
  emptyMessage = "No milestone payouts yet.",
}: {
  payouts: PayoutWithLead[];
  canManage: boolean;
  showLead?: boolean;
  emptyMessage?: string;
}) {
  const markPaid = useMarkPayoutPaid();

  if (!payouts.length) return <EmptyState message={emptyMessage} />;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {showLead ? <th className="px-3 py-2.5 font-semibold">Lead</th> : null}
            <th className="px-3 py-2.5 font-semibold">Milestone</th>
            <th className="w-28 px-3 py-2.5 font-semibold">Status</th>
            <th className="w-32 px-3 py-2.5 text-right font-semibold">Amount</th>
            <th className="w-44 px-3 py-2.5 font-semibold">Triggered</th>
            {canManage ? <th className="w-28 px-3 py-2.5 font-semibold">Action</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payouts.map((p) => (
            <tr key={p.id}>
              {showLead ? (
                <td className="px-3 py-2.5 font-medium">
                  {p.lead ? (
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: p.lead.id }}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      <LeadIdentityHeader
                        variant="inline"
                        customerName={
                          p.lead.customer
                            ? `${p.lead.customer.first_name ?? ""} ${p.lead.customer.last_name ?? ""}`.trim()
                            : null
                        }
                        address={p.lead.property?.address_line1 ?? null}
                        leadNumber={p.lead.lead_number}
                      />
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              ) : null}
              <td className="px-3 py-2.5">
                {MILESTONE_LABELS[p.milestone] ?? `Milestone ${p.milestone}`}
                {p.triggered_by_task ? (
                  <span className="block text-xs text-muted-foreground">
                    Task {p.triggered_by_task}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-3 py-2.5 text-right font-semibold">{currencyExact(p.amount)}</td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {dateTime(p.triggered_at)}
                {p.paid_at ? (
                  <span className="block text-xs">Paid {dateTime(p.paid_at)}</span>
                ) : null}
              </td>
              {canManage ? (
                <td className="px-3 py-2.5">
                  {p.status === "paid" ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markPaid.isPending}
                      onClick={() => markPaid.mutate(p.id)}
                    >
                      Mark paid
                    </Button>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
