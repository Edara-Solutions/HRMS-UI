import { BadgeDollarSign, Check, Pencil, Shield, Trash2 } from "lucide-react";
import type { Plan, PlanFeature } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { getFeatureLabel, getLimitLabel, isSystemDefaultPlan } from "../api/plan-labels";
import { getPlanDisplayPrice } from "../model/plan-display";

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onManagePrices: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

function FeatureChips({ features }: { features: PlanFeature[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {features.map((feature) => (
        <span
          key={feature}
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-[10.5px] font-medium text-[var(--color-text-muted)]"
        >
          <Check size={9} strokeWidth={2.5} className="text-[var(--color-success)]" />
          {getFeatureLabel(feature)}
        </span>
      ))}
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11.5px]">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium tabular-nums text-[var(--color-text)]">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export function PlanCard({ plan, onEdit, onManagePrices, onDelete }: PlanCardProps) {
  const displayPrice = getPlanDisplayPrice(plan);
  const limitEntries = Object.entries(plan.limits ?? {});
  const isSystemPlan = isSystemDefaultPlan(plan);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{plan.name}</h3>
              {isSystemPlan && (
                <Badge variant="default">
                  <span className="me-1 inline-flex">
                    <Shield size={11} />
                  </span>
                  System default
                </Badge>
              )}
            </div>
            {plan.description && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{plan.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={plan.isActive ? "success" : "default"}>
              {plan.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant={plan.isPublic ? "primary" : "default"}>
              {plan.isPublic ? "Public" : "Private"}
            </Badge>
          </div>
        </div>

        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
          {displayPrice ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold tabular-nums text-[var(--color-text)]">
                  {displayPrice.headline}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{displayPrice.meta}</p>
              </div>
              <Badge variant="default">{displayPrice.sourceBadge}</Badge>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                No active price to display
              </p>
              <p className="text-xs text-[var(--color-text-faint)]">
                Add a fallback or market-specific price row.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Features
        </p>
        <FeatureChips features={plan.features} />
      </div>

      <div className="flex-1 border-b border-[var(--color-border)] px-5 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Limits
          </p>
          <span className="text-[11px] text-[var(--color-text-faint)]">
            Duration: {plan.duration} days
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {limitEntries.length > 0 ? (
            limitEntries.map(([key, value]) => (
              <LimitRow key={key} label={getLimitLabel(key)} value={value} />
            ))
          ) : (
            <p className="text-xs text-[var(--color-text-faint)]">No plan limits configured.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 py-3">
        <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
          <span>{plan.prices.length} active price rows</span>
          <span>Updated {new Date(plan.updatedAt).toLocaleDateString("en-GB")}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            intent="utility"
            type="button"
            leadingIcon={<BadgeDollarSign size={13} />}
            onClick={() => onManagePrices(plan)}
          >
            Manage prices
          </Button>
          <Button
            intent="utility"
            type="button"
            leadingIcon={<Pencil size={13} />}
            onClick={() => onEdit(plan)}
          >
            Edit plan
          </Button>
          <Button
            intent="destructive-trigger"
            type="button"
            leadingIcon={<Trash2 size={13} />}
            disabled={isSystemPlan}
            onClick={() => onDelete(plan)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
