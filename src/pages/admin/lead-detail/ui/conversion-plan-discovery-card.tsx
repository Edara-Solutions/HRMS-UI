import { Check, PackageSearch } from "lucide-react";
import type { Plan, PlanFeature } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { useConversionPlans } from "../api/conversion-plans";

const FEATURE_LABEL: Record<string, string> = {
  ATTENDANCE: "Attendance",
  ANALYTICS: "Analytics",
  OVERVIEW: "Overview",
  TEAM_MANAGEMENT: "Team management",
};

const LIMIT_LABEL: Record<string, string> = {
  MAX_USERS: "Max users",
  MAX_DEPARTMENTS: "Max departments",
  MAX_POSITIONS: "Max positions",
};

function getSafeLabel(value: string, labels: Record<string, string>): string {
  return labels[value] ?? value.toLowerCase().replace(/_/g, " ");
}

function getPriceSourceLabel(source: string): string {
  if (source === "country") return "Country price";
  if (source === "region") return "Region price";
  if (source === "default_row") return "Default price";
  return getSafeLabel(source, {});
}

function getPlanPrice(plan: Plan): { amount: string; source: string } | null {
  if (plan.effectivePrice) {
    return {
      amount: plan.effectivePrice.money.formattedAmount,
      source: getPriceSourceLabel(plan.effectivePrice.source),
    };
  }

  const fallback = plan.prices.find(
    (price) => price.isActive && price.countryCode === null && price.regionCode === null,
  );
  return fallback ? { amount: fallback.money.formattedAmount, source: "Default price" } : null;
}

interface FeatureListProps {
  features: PlanFeature[];
}

function FeatureList({ features }: FeatureListProps) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {features.map((feature) => (
        <li
          key={feature}
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-[11px] text-[var(--color-text-muted)]"
        >
          <Check size={10} className="text-[var(--color-success)]" />
          {getSafeLabel(feature, FEATURE_LABEL)}
        </li>
      ))}
    </ul>
  );
}

interface PlanDiscoveryProps {
  plan: Plan;
}

function PlanDiscovery({ plan }: PlanDiscoveryProps) {
  const price = getPlanPrice(plan);
  const limits = Object.entries(plan.limits ?? {});

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{plan.name}</h3>
          {plan.description && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{plan.description}</p>
          )}
        </div>
        <Badge variant="success">Active and public</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
        <span>Duration: {plan.duration} days</span>
        {price ? (
          <span>
            {price.amount} · {price.source}
          </span>
        ) : (
          <span>No matching price</span>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <FeatureList features={plan.features} />
        {limits.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
            {limits.map(([key, value]) => (
              <li key={key}>
                {getSafeLabel(key, LIMIT_LABEL)}: {value.toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--color-text-faint)]">No plan limits configured.</p>
        )}
      </div>
    </Card>
  );
}

export function ConversionPlanDiscoveryCard() {
  const plansQuery = useConversionPlans();
  const plans = (plansQuery.data?.data ?? []).filter((plan) => plan.isActive && plan.isPublic);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available conversion plans</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4" aria-live="polite">
        {plansQuery.isPending ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading active public plans...</p>
        ) : plansQuery.isError ? (
          <p className="text-sm text-[var(--color-danger)]">
            Plans are unavailable. Refresh the lead before selecting a conversion plan.
          </p>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No active public plans"
            description="A plan administrator must publish an active plan before conversion can continue."
          />
        ) : (
          plans.map((plan) => <PlanDiscovery key={plan.publicId} plan={plan} />)
        )}
      </CardContent>
    </Card>
  );
}
