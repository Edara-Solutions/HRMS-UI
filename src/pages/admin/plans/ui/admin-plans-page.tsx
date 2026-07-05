import { useNavigate, useSearch } from "@tanstack/react-router";
import { Check, PackageSearch, Plus, Search } from "lucide-react";
import type { Plan, PlanFeature } from "@/shared/api";
import { dummyPlans } from "../api/plan-fixtures";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

// ─── Feature helpers ───────────────────────────────────────────────────────────

const FEATURE_LABEL: Record<PlanFeature, string> = {
  ATTENDANCE: "Attendance",
  ANALYTICS: "Analytics",
  OVERVIEW: "Overview",
  TEAM_MANAGEMENT: "Team mgmt",
};

const ALL_FEATURES: PlanFeature[] = ["OVERVIEW", "TEAM_MANAGEMENT", "ATTENDANCE", "ANALYTICS"];

// ─── Feature chip row ──────────────────────────────────────────────────────────

function FeatureChips({ features }: { features: PlanFeature[] }) {
  const set = new Set(features);
  return (
    <div className="flex flex-wrap gap-1">
      {ALL_FEATURES.map((f) => (
        <span
          key={f}
          className={`inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-[10.5px] font-medium ${
            set.has(f)
              ? "border-[color-mix(in_srgb,var(--color-success)_20%,transparent)] bg-[var(--color-success-soft)] text-[var(--color-success)]"
              : "border-[var(--color-border)] bg-transparent text-[var(--color-text-faint)]"
          }`}
        >
          {set.has(f) && <Check size={9} strokeWidth={2.5} />}
          {FEATURE_LABEL[f]}
        </span>
      ))}
    </div>
  );
}

// ─── Limit display ─────────────────────────────────────────────────────────────

function LimitRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
      <span className="text-[11.5px] font-medium tabular-nums text-[var(--color-text)]">
        {value === 0 ? "Unlimited" : value.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: Plan }) {
  const globalPrice = plan.prices?.find((p) => !p.countryCode && !p.regionCode && p.isActive);
  const sarPrice = plan.prices?.find((p) => p.countryCode === "SA" && p.isActive);

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{plan.name}</h3>
            {plan.description && (
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{plan.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {plan.isActive ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="default">Inactive</Badge>
            )}
            {plan.isPublic ? (
              <Badge variant="primary">Public</Badge>
            ) : (
              <Badge variant="default">Private</Badge>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-3 flex flex-col gap-1">
          {sarPrice && (
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-bold tabular-nums text-[var(--color-text)]">
                {sarPrice.money.amountMajor}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">SAR / mo</span>
            </div>
          )}
          {globalPrice && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {globalPrice.money.formattedAmount} / mo (global)
            </p>
          )}
          {!globalPrice && !sarPrice && (
            <p className="text-xs text-[var(--color-text-faint)]">No prices configured</p>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Features
        </p>
        <FeatureChips features={plan.features} />
      </div>

      {/* Limits */}
      <div className="flex-1 border-b border-[var(--color-border)] px-5 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Limits
        </p>
        <div className="flex flex-col gap-1.5">
          {Object.entries(plan.limits).map(([key, val]) => (
            <LimitRow
              key={key}
              label={key.replace(/_/g, " ").replace(/^MAX /, "Max ")}
              value={val}
            />
          ))}
          {Object.keys(plan.limits).length === 0 && (
            <p className="text-xs text-[var(--color-text-faint)]">No limits set</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">
          {plan.prices?.length ?? 0} price{plan.prices?.length !== 1 ? "s" : ""} · {plan.duration}{" "}
          mo duration
        </span>
        <Button intent="utility" className="w-full sm:w-auto">
          Edit plan
        </Button>
      </div>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AdminPlansPage() {
  const { active, q, visibility } = useSearch({ from: "/admin/plans/" });
  const navigate = useNavigate({ from: "/admin/plans/" });
  const query = q ?? "";

  function setQuery(nextQuery: string) {
    void navigate({
      search: (previous) => ({
        ...previous,
        q: nextQuery || undefined,
      }),
    });
  }

  function setActiveFilter(nextActive: "all" | "active" | "inactive") {
    void navigate({
      search: (previous) => ({
        ...previous,
        active: nextActive,
      }),
    });
  }

  function setVisibilityFilter(nextVisibility: "all" | "public" | "private") {
    void navigate({
      search: (previous) => ({
        ...previous,
        visibility: nextVisibility,
      }),
    });
  }

  const filteredPlans = dummyPlans.filter((plan) => {
    if (active === "active" && !plan.isActive) return false;
    if (active === "inactive" && plan.isActive) return false;
    if (visibility === "public" && !plan.isPublic) return false;
    if (visibility === "private" && plan.isPublic) return false;
    if (!query) return true;

    const loweredQuery = query.toLowerCase();
    return (
      plan.name.toLowerCase().includes(loweredQuery) ||
      plan.description?.toLowerCase().includes(loweredQuery) ||
      plan.features.some((feature) => FEATURE_LABEL[feature].toLowerCase().includes(loweredQuery))
    );
  });

  const activePlans = filteredPlans.filter((p) => p.isActive);
  const inactivePlans = filteredPlans.filter((p) => !p.isActive);
  const totalActive = dummyPlans.filter((p) => p.isActive).length;
  const totalInactive = dummyPlans.length - totalActive;

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Page header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">Plans</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalActive} active / {totalInactive} inactive / subscription plan catalogue
          </p>
        </div>
        <Button intent="cta" leadingIcon={<Plus size={15} />} className="w-full sm:w-auto">
          Create plan
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {(["all", "active", "inactive"] as const).map((option) => (
          <Button
            key={option}
            variant="ghost"
            size="sm"
            pressed={active === option}
            onClick={() => setActiveFilter(option)}
          >
            {option === "all" ? "All statuses" : option === "active" ? "Active" : "Inactive"}
          </Button>
        ))}
        {(["all", "public", "private"] as const).map((option) => (
          <Button
            key={option}
            variant="ghost"
            size="sm"
            pressed={visibility === option}
            onClick={() => setVisibilityFilter(option)}
          >
            {option === "all" ? "All visibility" : option === "public" ? "Public" : "Private"}
          </Button>
        ))}
        <div className="relative w-full sm:ms-auto sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search plans or features..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ps-8"
          />
        </div>
      </div>

      {/* Active plans */}
      <div className="mb-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Active plans
        </h2>
        {activePlans.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] py-16 text-center">
            <PackageSearch size={32} className="text-[var(--color-text-faint)]" />
            <p className="text-sm font-medium text-[var(--color-text-muted)]">No active plans</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activePlans.map((plan) => (
              <PlanCard key={plan.publicId} plan={plan} />
            ))}
          </div>
        )}
      </div>

      {/* Inactive plans */}
      {inactivePlans.length > 0 && (
        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Inactive / legacy plans
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inactivePlans.map((plan) => (
              <PlanCard key={plan.publicId} plan={plan} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
