import { cn } from "@/lib/utils";

/**
 * Shared lead identity block: orange customer name, sky-blue address, muted lead number.
 * "stacked" renders three rows (dialog headers, cards); "inline" renders one
 * dot-separated line for tables and dense lists.
 */
export function LeadIdentityHeader({
  leadNumber,
  customerName,
  address,
  variant = "stacked",
  className,
}: {
  leadNumber?: string | null | undefined;
  customerName?: string | null | undefined;
  address?: string | null | undefined;
  variant?: "stacked" | "inline";
  className?: string | undefined;
}) {
  const name = customerName?.trim();

  if (variant === "inline") {
    const parts: React.ReactNode[] = [];
    if (name) parts.push(<span key="n" className="font-semibold text-orange-500">{name}</span>);
    if (address) parts.push(<span key="a" className="text-sky-400">{address}</span>);
    if (leadNumber) parts.push(<span key="l" className="text-xs font-normal text-muted-foreground">{leadNumber}</span>);
    return (
      <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
        {parts.map((part, i) => (
          <span key={i} className="inline-flex items-baseline gap-x-1.5">
            {i > 0 ? <span className="text-xs text-muted-foreground">·</span> : null}
            {part}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={cn("block space-y-0.5", className)}>
      {name ? <span className="block font-semibold text-orange-500">{name}</span> : null}
      {address ? <span className="block text-sm text-sky-400">{address}</span> : null}
      {leadNumber ? <span className="block text-xs font-normal text-muted-foreground">{leadNumber}</span> : null}
    </span>
  );
}

