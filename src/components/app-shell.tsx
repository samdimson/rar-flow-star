import { Link, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  Calculator,
  CalendarDays,
  ClipboardList,
  Columns3,
  FileSignature,
  FileText,
  FolderOpen,
  Gauge,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Percent,
  Settings,
  ShieldCheck,
  Users,
  UserSquare2,
  Wrench,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { NotificationBell } from "@/components/crm/notification-bell";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { initials, titleCase } from "@/lib/crm/format";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  finance?: boolean;
  manage?: boolean;
};

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Sales",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/pipeline", label: "Pipeline", icon: Columns3 },
      { to: "/leads", label: "Leads", icon: Users },
      { to: "/customers", label: "Customers", icon: UserSquare2 },
      { to: "/jobs", label: "Opportunities & Jobs", icon: Gauge },
    ],
  },
  {
    heading: "Work",
    items: [
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/tasks", label: "Tasks", icon: ClipboardList },
      { to: "/production", label: "Production", icon: HardHat },
      { to: "/claims", label: "Insurance Claims", icon: ShieldCheck },
    ],
  },
  {
    heading: "Documents & Money",
    items: [
      { to: "/estimates", label: "Estimates", icon: FileText },
      { to: "/cost-estimator", label: "Materials Cost Estimator", icon: Calculator },
      { to: "/labor-estimator", label: "Labor Cost Estimator", icon: Wrench },
      { to: "/contracts", label: "Contracts", icon: FileSignature },
      { to: "/invoices", label: "Invoices & Payments", icon: Banknote, finance: true },
      { to: "/documents", label: "Documents & Photos", icon: FolderOpen },
    ],
  },
  {
    heading: "Management",
    items: [
      { to: "/reps", label: "Sales Reps", icon: Wrench },
      { to: "/commissions", label: "Commissions", icon: Percent },
      { to: "/reports", label: "Reports", icon: Gauge },
      { to: "/settings", label: "Settings & Admin", icon: Settings, manage: true },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { canViewFinance, canManage } = useAuth();
  return (
    <nav className="flex flex-col gap-5 pb-6">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter(
          (i) => (!i.finance || canViewFinance) && (!i.manage || canManage),
        );
        if (!items.length) return null;
        return (
          <div key={group.heading}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.heading}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  activeOptions={{ exact: to === "/" }}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeProps={{
                    className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
                  }}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold tracking-tight text-primary-foreground">
        RAR
      </span>
      <span className="min-w-0 text-sm font-semibold leading-tight text-sidebar-foreground">
        Rise Above Roofing
        <span className="block text-[11px] font-normal text-muted-foreground">Oklahoma CRM</span>
      </span>
    </div>
  );
}

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
  const { profile, primaryRole, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-2 py-5 lg:flex">
        <Brand />
        <Separator className="my-4" />
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <Separator className="my-2" />
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials(profile?.full_name || user?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">
              {profile?.full_name || user?.email}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {primaryRole ? titleCase(primaryRole) : "No role"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar px-2 py-5">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <Separator className="my-4" />
                <NavLinks onNavigate={() => setOpen(false)} />
                <Button variant="outline" className="mx-3 w-[calc(100%-1.5rem)]" onClick={signOut}>
                  <LogOut className="size-4" /> Sign out
                </Button>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NotificationBell />
            {actions}
          </div>

        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
