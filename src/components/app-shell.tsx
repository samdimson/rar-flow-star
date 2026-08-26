import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Columns3, Users, Search } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/leads", label: "Leads", icon: Users },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-b border-sidebar-border bg-sidebar px-4 py-4 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-3 lg:py-6">
        <div className="flex items-center gap-2 px-2 lg:mb-8">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-bold tracking-tight text-primary-foreground">
            RAR
          </span>
          <span className="text-sm font-semibold leading-tight text-sidebar-foreground">
            RAR CRM
            <span className="block text-[11px] font-normal text-muted-foreground">
              Work Flow
            </span>
          </span>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-0 lg:flex-col lg:overflow-visible">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <div className="hidden items-center gap-2 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground xl:flex">
              <Search className="size-4" aria-hidden="true" />
              <span>Search coming soon</span>
            </div>
          </div>
        </header>
        <main className="flex-1 px-5 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
