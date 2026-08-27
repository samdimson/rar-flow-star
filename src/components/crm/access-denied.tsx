import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AccessDenied({
  message = "You do not have permission to view this page.",
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-12 text-center">
      <ShieldAlert className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-base font-semibold text-foreground">Access denied</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
