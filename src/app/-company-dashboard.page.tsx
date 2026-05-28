import { useCurrentSession } from "@/auth/guards";
import { ActivityFeed } from "@/company/dashboard/activity-feed";
import { ApprovalQueue } from "@/company/dashboard/approval-queue";
import { DepartmentMix } from "@/company/dashboard/department-mix";
import { EventList } from "@/company/dashboard/event-list";
import {
  events,
  activities,
  approvals,
  departments,
  headcountTrend,
  kpiData,
  peopleSpotlight,
} from "@/company/dashboard/fixtures";
import { HeadcountChart } from "@/company/dashboard/headcount-chart";
import { KpiCard } from "@/company/dashboard/kpi-card";
import { ModuleShortcuts } from "@/company/dashboard/module-shortcuts";
import { PeopleTable } from "@/company/dashboard/people-table";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Check, PanelRight, Plus } from "lucide-react";
import { useState } from "react";

export function CompanyDashboardPage() {
  const session = useCurrentSession();
  const user = session?.user;
  const [asideCollapsed, setAsideCollapsed] = useState(false);

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Page header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Good morning, {user?.firstName ?? "there"}.
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Friday, 22 May 2026 · Q2 performance cycle active · Payroll closes in 3 days
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button intent="action" leadingIcon={<Plus size={15} />} className="w-full sm:w-auto">
            Add employee
          </Button>
          <Button
            intent="cta"
            leadingIcon={<Check size={15} strokeWidth={2.5} />}
            className="w-full sm:w-auto"
          >
            Review approvals
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <KpiCard key={kpi.label} data={kpi} />
        ))}
      </div>

      {/* Dashboard body - two column */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_292px]">
        {/* Main column */}
        <div className="flex flex-col gap-4">
          <HeadcountChart data={headcountTrend} />
          <PeopleTable items={peopleSpotlight} />
          <ModuleShortcuts />
        </div>

        {/* Aside column */}
        <div
          className={cn(
            "flex flex-col gap-4 transition-all duration-[var(--motion-base)]",
            asideCollapsed && "hidden xl:flex",
          )}
        >
          <ApprovalQueue items={approvals} totalCount={11} />
          <EventList items={events} />
          <DepartmentMix departments={departments} totalCount={248} />
          <ActivityFeed items={activities} />
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
