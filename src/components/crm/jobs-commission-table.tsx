import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { PAYOUT_STATUS_CLASSES, type JobCommissionRow } from "@/lib/crm/commissions";
import { currencyExact } from "@/lib/crm/format";

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

export function JobsCommissionTable({ jobs }: { jobs: JobCommissionRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
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
          {jobs.map((job) => (
            <tr key={job.leadId} className="border-b last:border-0 hover:bg-muted/40">
              <td className="px-3 py-2 font-medium">
                <Link to="/leads/$leadId" params={{ leadId: job.leadId }} className="text-primary hover:underline">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
