import { Building2, PanelRight, Plus } from "lucide-react";
import { useState } from "react";
import { AdminActivityFeed } from "@/admin/dashboard/admin-activity-feed";
import {
  adminActivities,
  adminKpiData,
  recentSignups,
  revenueTrend,
  subscriptionDistribution,
} from "@/admin/dashboard/fixtures";
import { QuickActions } from "@/admin/dashboard/quick-actions";
import { RecentSignups } from "@/admin/dashboard/recent-signups";
import { RevenueChart } from "@/admin/dashboard/revenue-chart";
import { SubscriptionDistribution } from "@/admin/dashboard/subscription-distribution";
import { useCurrentSession } from "@/auth/guards";
import { KpiCard } from "@/company/dashboard/kpi-card";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

export function AdminDashboardPage() {
  const session = useCurrentSession();
  const user = session?.user;
  const [asideCollapsed, setAsideCollapsed] = useState(false);

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Page header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Platform overview
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Welcome back, {user?.firstName ?? "Admin"} · All systems operational
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            intent="action"
            leadingIcon={<Building2 size={15} />}
            className="w-full sm:w-auto"
          >
            View companies
          </Button>
          <Button intent="cta" leadingIcon={<Plus size={15} />} className="w-full sm:w-auto">
            Add company
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {adminKpiData.map((kpi) => (
          <KpiCard key={kpi.label} data={kpi} />
        ))}
      </div>

      {/* Dashboard body - two column */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_292px]">
        {/* Main column */}
        <div className="flex flex-col gap-4">
          <RevenueChart data={revenueTrend} />
          <RecentSignups items={recentSignups} />
          <QuickActions />
        </div>

        {/* Aside column */}
        <div
          className={cn(
            "flex flex-col gap-4 transition-all duration-[var(--motion-base)]",
            asideCollapsed && "hidden xl:flex",
          )}
        >
          <SubscriptionDistribution items={subscriptionDistribution} totalCount={142} />
          <AdminActivityFeed items={adminActivities} />
        </div>

        {/* Toggle button for aside on xl+ */}
        <div className="hidden xl:flex xl:justify-end">
          <Button
            intent="toggle"
            size="iconSm"
            pressed={asideCollapsed}
            onClick={() => setAsideCollapsed((prev) => !prev)}
            aria-label={asideCollapsed ? "Show aside panel" : "Hide aside panel"}
            leadingIcon={<PanelRight size={15} strokeWidth={1.9} />}
            iconOnly
          />
        </div>
      </div>
    </div>
  );
}
