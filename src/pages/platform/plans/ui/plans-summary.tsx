import type { Plan } from "@/shared/api";
import { isSystemDefaultPlan } from "../api/plan-labels";
import { countPlanPrices } from "../model/plan-display";

interface PlansSummaryProps {
  plans: Plan[];
  activePlansCount: number;
  inactivePlansCount: number;
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--color-text)]">{value}</p>
    </div>
  );
}

export function PlansSummary({ plans, activePlansCount, inactivePlansCount }: PlansSummaryProps) {
  const publicCount = plans.filter((plan) => plan.isPublic).length;
  const privateCount = plans.length - publicCount;
  const systemPlanCount = plans.filter((plan) => isSystemDefaultPlan(plan)).length;

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
      <SummaryCard label="Plans in view" value={plans.length} />
      <SummaryCard label="Public / Private" value={`${publicCount} / ${privateCount}`} />
      <SummaryCard
        label="Active / Inactive"
        value={`${activePlansCount} / ${inactivePlansCount}`}
      />
      <SummaryCard
        label="Active prices / system plans"
        value={`${countPlanPrices(plans)} / ${systemPlanCount}`}
      />
    </div>
  );
}
