import { PackageSearch } from "lucide-react";
import type { Plan } from "@/shared/api";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PlanCard } from "./plan-card";

interface PlanSectionProps {
  title: string;
  description: string;
  plans: Plan[];
  onEdit: (plan: Plan) => void;
  onManagePrices: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

export function PlanSection({
  title,
  description,
  plans,
  onEdit,
  onManagePrices,
  onDelete,
}: PlanSectionProps) {
  if (plans.length === 0) {
    return (
      <section>
        <div className="mb-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-faint)]">{description}</p>
        </div>
        <Card>
          <EmptyState
            icon={PackageSearch}
            title={`No ${title.toLowerCase()}`}
            description="Nothing matches the current filters in this section."
          />
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-faint)]">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.publicId}
            plan={plan}
            onEdit={onEdit}
            onManagePrices={onManagePrices}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
