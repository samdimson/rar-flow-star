import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MILESTONE_LABELS, PAYOUT_STATUS_CLASSES, type JobCommissionRow } from "@/lib/crm/commissions";
import { currencyExact, dateTime } from "@/lib/crm/format";

function MilestoneBadge({ payout }: { payout: JobCommissionRow["milestones"][number] | undefined }) {
  if (!payout) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Badge variant="secondary" className={PAYOUT_STATUS_CLASSES[payout.status] ?? ""}>
      {payout.status}
    </Badge>
  );
}

function MilestoneDetail({ job }: { job: JobCommissionRow }) {
  return (
    <div className="bg-muted/30 px-3 py-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-1.5 font-medium">Milestone</th>
            <th className="px-3 py-1.5 font-medium">Status</th>
            <th className="px-3 py-1.5 text-right font-medium">Amount</th>
            <th className="px-3 py-1.5 font-medium">Triggered</th>
            <th className="px-3 py-1.5 font-medium">Paid</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((m) => {
            const payout = job.milestones[m];
            return (
              <tr key={m} className="border-t border-border/50">
                <td className="px-3 py-1.5 text-muted-foreground">{MILESTONE_LABELS[m] ?? `Milestone ${m}`}</td>
                <td className="px-3 py-1.5">
                  <MilestoneBadge payout={payout} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  {payout ? currencyExact(payout.amount) : "—"}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {payout ? dateTime(payout.triggered_at) : "—"}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {payout?.paid_at ? dateTime(payout.paid_at) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function JobsCommissionTable({ jobs }: { jobs: JobCommissionRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (leadId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium" aria-label="Expand" />
            <th className="px-3 py-2 font-medium">Lead #</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Address</th>
            <th className="px-3 py-2 text-right font-medium">Contract Amount</th>
            <th className="px-3 py-2 text-right font-medium">Net Base</th>
            <th className="px-3 py-2 text-right font-medium">Commission Rate</th>
            <th className="px-3 py-2 text-right font-medium">Total Commission</th>
            <th className="px-3 py-2 font-medium">M1</th>
            <th className="px-3 py-2 font-medium">M2</th>
            <th className="px-3 py-2 font-medium">M3</th>
            <th className="px-3 py-2 text-right font-medium">Total Paid</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const isOpen = expanded.has(job.leadId);
            return [
              <tr
                key={job.leadId}
                className="cursor-pointer border-b hover:bg-muted/40"
                onClick={() => toggle(job.leadId)}
                aria-expanded={isOpen}
              >
                <td className="px-3 py-2 text-muted-foreground">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link
                    to="/leads/$leadId"
                    params={{ leadId: job.leadId }}
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {job.leadNumber}
                  </Link>
                </td>
                <td className="px-3 py-2">{job.customer}</td>
                <td className="px-3 py-2 text-muted-foreground">{job.address}</td>
                <td className="px-3 py-2 text-right">{currencyExact(job.contractAmount)}</td>
                <td className="px-3 py-2 text-right">{currencyExact(job.netAmount)}</td>
                <td className="px-3 py-2 text-right">{(job.tierRate * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-right font-medium">{currencyExact(job.totalCommission)}</td>
                <td className="px-3 py-2"><MilestoneBadge payout={job.milestones[1]} /></td>
                <td className="px-3 py-2"><MilestoneBadge payout={job.milestones[2]} /></td>
                <td className="px-3 py-2"><MilestoneBadge payout={job.milestones[3]} /></td>
                <td className="px-3 py-2 text-right font-medium">{currencyExact(job.totalPaid)}</td>
              </tr>,
              isOpen ? (
                <tr key={`${job.leadId}-detail`} className="border-b last:border-0">
                  <td colSpan={12} className="p-0">
                    <MilestoneDetail job={job} />
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
