import { EmptyState, LoadingBlock, SectionCard } from "@/components/crm/primitives";
import { MilestoneTable } from "@/components/crm/milestone-table";
import { currencyExact } from "@/lib/crm/format";
import { useMilestonePayouts } from "@/lib/crm/commissions";

export function LeadCommissions({
  leadId,
  netAmount,
  canManage,
  visible,
}: {
  leadId: string;
  netAmount: number | null;
  canManage: boolean;
  visible: boolean;
}) {
  const { data: payouts = [], isLoading } = useMilestonePayouts({ leadId: visible ? leadId : null });

  if (!visible) {
    return (
      <SectionCard title="Commissions">
        <EmptyState message="Only the assigned rep and managers can view commissions for this lead." />
      </SectionCard>
    );
  }

  if (isLoading) return <LoadingBlock label="Loading commissions" />;

  const total = payouts.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <SectionCard
      title="Commissions"
      description={`Net commission base: ${currencyExact(netAmount)} · Milestones triggered: ${payouts.length} of 3 · Total ${currencyExact(total)}`}
    >
      <MilestoneTable
        payouts={payouts}
        canManage={canManage}
        showLead={false}
        emptyMessage="No milestones triggered for this lead yet."
      />
    </SectionCard>
  );
}
