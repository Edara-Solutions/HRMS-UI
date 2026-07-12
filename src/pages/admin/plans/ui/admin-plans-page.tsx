import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  Check,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { Plan, PlanFeature } from "@/shared/api";
import { isBillingInterval, useDeletePlan, usePlans } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  BILLING_INTERVAL_LABEL,
  getFeatureLabel,
  getLimitLabel,
  isSystemDefaultPlan,
  KNOWN_BILLING_INTERVALS,
} from "../api/plan-labels";
import { PlanFormDialog } from "./plan-form-dialog";
import { PlanPricesDialog } from "./plan-prices-dialog";

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

function getDisplayPrice(plan: Plan): {
  headline: string;
  meta: string;
  sourceBadge: string;
} | null {
  if (plan.effectivePrice) {
    return {
      headline: plan.effectivePrice.money.formattedAmount,
      meta: `${BILLING_INTERVAL_LABEL[plan.effectivePrice.billingInterval] ?? plan.effectivePrice.billingInterval} · every ${plan.effectivePrice.intervalCount}`,
      sourceBadge:
        plan.effectivePrice.source === "country"
          ? "Country"
          : plan.effectivePrice.source === "region"
            ? "Region"
            : "Default",
    };
  }

  const fallbackPrice = plan.prices.find(
    (price) => price.isActive && !price.countryCode && !price.regionCode,
  );
  if (!fallbackPrice) return null;

  return {
    headline: fallbackPrice.money.formattedAmount,
    meta: `${BILLING_INTERVAL_LABEL[fallbackPrice.billingInterval] ?? fallbackPrice.billingInterval} · every ${fallbackPrice.intervalCount}`,
    sourceBadge: "Fallback",
  };
}

function countAllPrices(plans: Plan[]): number {
  let total = 0;
  for (const plan of plans) {
    total += plan.prices.length;
  }
  return total;
}

function PlanCard({
  plan,
  onEdit,
  onManagePrices,
  onDelete,
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onManagePrices: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}) {
  const displayPrice = getDisplayPrice(plan);
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

export function AdminPlansPage() {
  const {
    active,
    billingInterval,
    countryCode,
    currencyCode,
    intervalCount,
    q,
    regionCode,
    visibility,
  } = useSearch({ from: "/admin/plans/" });
  const navigate = useNavigate({ from: "/admin/plans/" });
  const deletePlan = useDeletePlan();

  const [planFormTarget, setPlanFormTarget] = useState<Plan | null>(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [pricePlanTarget, setPricePlanTarget] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const query = q ?? "";
  const previewEnabled = Boolean(currencyCode && billingInterval);
  const intervalCountValue = intervalCount ?? 1;

  const plansQuery = usePlans({
    name: query || undefined,
    isActive: active === "all" ? undefined : active === "active",
    isPublic: visibility === "all" ? undefined : visibility === "public",
    countryCode: countryCode || undefined,
    regionCode: regionCode || undefined,
    currencyCode: currencyCode || undefined,
    billingInterval: billingInterval || undefined,
    intervalCount: previewEnabled ? intervalCountValue : undefined,
  });

  const plans = plansQuery.data?.data ?? [];

  const activePlans = plans.filter((plan) => plan.isActive);
  const inactivePlans = plans.filter((plan) => !plan.isActive);
  const publicCount = plans.filter((plan) => plan.isPublic).length;
  const privateCount = plans.length - publicCount;
  const systemPlanCount = plans.filter((plan) => isSystemDefaultPlan(plan)).length;

  function setSearchValue<K extends string>(key: K, value: string | number | undefined) {
    void navigate({
      search: (previous) => ({
        ...previous,
        [key]: value === "" || value === undefined ? undefined : value,
      }),
    });
  }

  function setQuery(nextQuery: string) {
    setSearchValue("q", nextQuery || undefined);
  }

  function setActiveFilter(nextActive: "all" | "active" | "inactive") {
    setSearchValue("active", nextActive);
  }

  function setVisibilityFilter(nextVisibility: "all" | "public" | "private") {
    setSearchValue("visibility", nextVisibility);
  }

  function clearPricePreview() {
    void navigate({
      search: (previous) => ({
        ...previous,
        countryCode: undefined,
        regionCode: undefined,
        currencyCode: undefined,
        billingInterval: undefined,
        intervalCount: undefined,
      }),
    });
  }

  async function confirmDeletePlan() {
    if (!deleteTarget) return;
    await deletePlan.mutateAsync(deleteTarget.publicId);
    setDeleteTarget(null);
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">Plans</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Manage plan definitions, market prices, and optional effective-price preview in one
            workflow.
          </p>
        </div>
        <Button
          intent="cta"
          leadingIcon={<Plus size={15} />}
          className="w-full sm:w-auto"
          onClick={() => setIsCreatePlanOpen(true)}
        >
          Create plan
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Plans in view" value={plans.length} />
        <SummaryCard label="Public / Private" value={`${publicCount} / ${privateCount}`} />
        <SummaryCard
          label="Active / Inactive"
          value={`${activePlans.length} / ${inactivePlans.length}`}
        />
        <SummaryCard
          label="Active prices / system plans"
          value={`${countAllPrices(plans)} / ${systemPlanCount}`}
        />
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="relative w-full">
              <Search
                size={14}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search by plan name..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="ps-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  Effective-price preview
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Send pricing context with the list call to see which market row would win.
                </p>
              </div>
              <Button intent="utility" type="button" onClick={clearPricePreview}>
                Clear
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="plans-currency"
                  className="text-xs font-medium text-[var(--color-text-muted)]"
                >
                  Currency
                </label>
                <Input
                  id="plans-currency"
                  value={currencyCode ?? ""}
                  maxLength={3}
                  placeholder="EGP"
                  onChange={(event) =>
                    setSearchValue("currencyCode", event.target.value.toUpperCase() || undefined)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="plans-billing-interval"
                  className="text-xs font-medium text-[var(--color-text-muted)]"
                >
                  Billing interval
                </label>
                <Select
                  value={billingInterval}
                  onValueChange={(value) => {
                    if (isBillingInterval(value)) setSearchValue("billingInterval", value);
                  }}
                >
                  <SelectTrigger id="plans-billing-interval">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_BILLING_INTERVALS.map((interval) => (
                      <SelectItem key={interval} value={interval}>
                        {BILLING_INTERVAL_LABEL[interval]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="plans-country"
                  className="text-xs font-medium text-[var(--color-text-muted)]"
                >
                  Country code
                </label>
                <Input
                  id="plans-country"
                  value={countryCode ?? ""}
                  maxLength={2}
                  placeholder="EG"
                  onChange={(event) =>
                    setSearchValue("countryCode", event.target.value.toUpperCase() || undefined)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="plans-region"
                  className="text-xs font-medium text-[var(--color-text-muted)]"
                >
                  Region code
                </label>
                <Input
                  id="plans-region"
                  value={regionCode ?? ""}
                  placeholder="MENA"
                  onChange={(event) =>
                    setSearchValue("regionCode", event.target.value || undefined)
                  }
                />
              </div>
              <div className="space-y-1.5 min-[560px]:col-span-2">
                <label
                  htmlFor="plans-interval-count"
                  className="text-xs font-medium text-[var(--color-text-muted)]"
                >
                  Interval count
                </label>
                <Input
                  id="plans-interval-count"
                  type="number"
                  min={1}
                  value={String(intervalCountValue)}
                  onChange={(event) =>
                    setSearchValue("intervalCount", Number(event.target.value || 1))
                  }
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--color-text-faint)]">
              {previewEnabled
                ? "Cards are showing backend-resolved effective prices for the supplied billing context."
                : "Set both currency and billing interval to request effective-price resolution from the backend."}
            </p>
          </div>
        </div>
      </Card>

      {plansQuery.isPending ? (
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Loading plans"
            description="Fetching the plan catalogue and active prices."
          />
        </Card>
      ) : plansQuery.isError ? (
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Couldn't load plans"
            description="Please retry in a moment. If the problem persists, check your access or the backend service."
          />
        </Card>
      ) : plans.length === 0 ? (
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="No plans found"
            description="Try clearing the filters, or create a new plan to start the catalogue."
            action={
              <Button intent="cta" onClick={() => setIsCreatePlanOpen(true)}>
                Create plan
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          <PlanSection
            title="Active plans"
            description="Plans that can still be assigned or priced."
            plans={activePlans}
            onEdit={setPlanFormTarget}
            onManagePrices={setPricePlanTarget}
            onDelete={setDeleteTarget}
          />
          {inactivePlans.length > 0 && (
            <PlanSection
              title="Inactive plans"
              description="Kept for management and history, but not available for active selection."
              plans={inactivePlans}
              onEdit={setPlanFormTarget}
              onManagePrices={setPricePlanTarget}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      )}

      <PlanFormDialog
        plan={null}
        open={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
      />
      <PlanFormDialog
        plan={planFormTarget}
        open={planFormTarget !== null}
        onClose={() => setPlanFormTarget(null)}
      />
      <PlanPricesDialog plan={pricePlanTarget} onClose={() => setPricePlanTarget(null)} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : "Delete plan"}
        description="This soft-deletes the plan and removes it from normal plan reads."
        confirmLabel="Delete plan"
        isLoading={deletePlan.isPending}
        onConfirm={() => void confirmDeletePlan()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
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

function PlanSection({
  title,
  description,
  plans,
  onEdit,
  onManagePrices,
  onDelete,
}: {
  title: string;
  description: string;
  plans: Plan[];
  onEdit: (plan: Plan) => void;
  onManagePrices: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}) {
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
