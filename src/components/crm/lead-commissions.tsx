import { EmptyState, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { MilestoneTable } from "@/components/crm/milestone-table";
import { currencyExact } from "@/lib/crm/format";
import { useLeadCostBreakdown, useMilestonePayouts } from "@/lib/crm/commissions";

export function LeadCommissions({
  leadId,
  netAmount,
  contractAmount,
  canManage,
  visible,
}: {
  leadId: string;
  netAmount: number | null;
  contractAmount?: number | null;
  canManage: boolean;
  visible: boolean;
}) {
  const { data: payouts = [], isLoading } = useMilestonePayouts({ leadId: visible ? leadId : null });
  const { data: costs } = useLeadCostBreakdown(visible ? [leadId] : []);

  if (!visible) {
    return (
      <SectionCard title="Commissions">
        <EmptyState message="Only the assigned rep and managers can view commissions for this lead." />
      </SectionCard>
    );
  }

  if (isLoading) return <LoadingBlock label="Loading commissions" />;

  const total = payouts.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const contract = Number(contractAmount ?? 0);
  const materials = Number(costs?.materials ?? 0);
  const labor = Number(costs?.labor ?? 0);
  const grossAfterCosts = contract - materials - labor;
  const overhead = Number((grossAfterCosts * 0.15).toFixed(2));
  const net = Number((grossAfterCosts - overhead).toFixed(2));

  return (
    <SectionCard title="Commissions" contentClassName="space-y-3">
      <dl className="max-w-md space-y-1 rounded-md border border-border p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Contract Amount</dt>
          <dd className="font-medium">{currencyExact(contract)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Less Materials</dt>
          <dd>−{currencyExact(materials)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Less Labor</dt>
          <dd>−{currencyExact(labor)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1">
          <dt className="text-muted-foreground">Gross after costs</dt>
          <dd>{currencyExact(grossAfterCosts)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Less Overhead (15%)</dt>
          <dd>−{currencyExact(overhead)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <dt>Net (commission base)</dt>
          <dd>{currencyExact(netAmount ?? net)}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Milestones triggered: <span className="font-medium text-foreground">{payouts.length} of 3</span> ·
        Total <span className="font-medium text-foreground">{currencyExact(total)}</span>
      </p>
      <MilestoneTable
        payouts={payouts}
        canManage={canManage}
        showLead={false}
        emptyMessage="No milestones triggered for this lead yet."
      />
    </SectionCard>
  );
}
