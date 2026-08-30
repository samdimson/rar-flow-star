import { cn } from "@/lib/utils";

/**
 * Shared lead identity block for dialog/popup headers and cards:
 * orange customer name, sky-blue address, muted lead number.
 */
export function LeadIdentityHeader({
  leadNumber,
  customerName,
  address,
  className,
}: {
  leadNumber?: string | null | undefined;
  customerName?: string | null | undefined;
  address?: string | null | undefined;
  className?: string | undefined;
}) {
  const name = customerName?.trim();
  return (
    <span className={cn("block space-y-0.5", className)}>
      {name ? <span className="block font-semibold text-orange-500">{name}</span> : null}
      {address ? <span className="block text-sm text-sky-400">{address}</span> : null}
      {leadNumber ? <span className="block text-xs font-normal text-muted-foreground">{leadNumber}</span> : null}
    </span>
  );
}
