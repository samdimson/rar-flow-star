import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/crm/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { runCrmTests } from "@/lib/crm/test-runner.functions";

const title = "CRM Test Runner — Rise Above Roofing Oklahoma CRM";
const description =
  "Development-only automated integrity checks for workflow, commissions, relationships, finance and notifications.";

export const Route = createFileRoute("/_authenticated/dev/test-runner")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TestRunnerPage,
});

const GROUPS: { heading: string; prefix: string }[] = [
  { heading: "Workflow", prefix: "T-W" },
  { heading: "Commissions", prefix: "T-C" },
  { heading: "Relationship integrity", prefix: "T-R" },
  { heading: "Financial integrity", prefix: "T-F" },
  { heading: "Notifications", prefix: "T-N" },
];

function TestRunnerPage() {
  const run = useServerFn(runCrmTests);
  const mutation = useMutation({
    mutationFn: () => run(),
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = mutation.data;

  useEffect(() => {
    if (!report) return;
    // eslint-disable-next-line no-console
    console.log("[CRM test runner]", report);
    if (report.summary.failed > 0) {
      toast.error(`${report.summary.failed} check(s) failed`);
    } else {
      toast.success(`All ${report.summary.total} checks passed`);
    }
  }, [report]);

  return (
    <AppShell
      title="CRM test runner"
      description="Development-only automated checks against the live database."
      actions={
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Running…" : "Re-run all"}
        </Button>
      }
    >
      <SectionCard
        title="Summary"
        description={
          report
            ? `${report.summary.passed} passed, ${report.summary.failed} failed — completed in ${(report.summary.duration_ms / 1000).toFixed(2)}s`
            : mutation.isPending
              ? "Running checks…"
              : "No results yet."
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
            {report?.summary.passed ?? 0} passed
          </Badge>
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            {report?.summary.failed ?? 0} failed
          </Badge>
        </div>
      </SectionCard>

      {GROUPS.map((group) => {
        const rows = (report?.results ?? []).filter((r) => r.id.startsWith(group.prefix));
        if (!rows.length) return null;
        return (
          <SectionCard key={group.prefix} title={group.heading}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Test</TableHead>
                    <TableHead className="min-w-[220px]">Description</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-semibold">{r.id}</TableCell>
                      <TableCell className="text-sm">{r.description}</TableCell>
                      <TableCell>
                        <span
                          className={
                            r.status === "PASS"
                              ? "rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-600"
                              : "rounded-md bg-destructive/15 px-2 py-1 text-xs font-semibold text-destructive"
                          }
                        >
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        );
      })}
    </AppShell>
  );
}
