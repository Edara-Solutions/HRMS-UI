import { useNavigate, useSearch } from "@tanstack/react-router";
import { PackageSearch, Plus } from "lucide-react";
import { useState } from "react";
import type { BillingInterval, Plan } from "@/shared/api";
import { useDeletePlan, usePlans } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { PlanFormDialog } from "./plan-form-dialog";
import { PlanPricesDialog } from "./plan-prices-dialog";
import { PlanSection } from "./plan-section";
import {
  type PlanStatusFilter,
  PlansFilterPanel,
  type PlanVisibilityFilter,
} from "./plans-filter-panel";
import { PlansSummary } from "./plans-summary";

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

  function setSearchValue<K extends string>(key: K, value: string | number | undefined) {
    void navigate({
      search: (previous) => ({
        ...previous,
        [key]: value === "" || value === undefined ? undefined : value,
      }),
    });
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

      <PlansSummary
        plans={plans}
        activePlansCount={activePlans.length}
        inactivePlansCount={inactivePlans.length}
      />

      <PlansFilterPanel
        query={query}
        active={active}
        visibility={visibility}
        currencyCode={currencyCode}
        billingInterval={billingInterval}
        countryCode={countryCode}
        regionCode={regionCode}
        intervalCountValue={intervalCountValue}
        previewEnabled={previewEnabled}
        onQueryChange={(nextQuery) => setSearchValue("q", nextQuery || undefined)}
        onActiveChange={(nextActive: PlanStatusFilter) => setSearchValue("active", nextActive)}
        onVisibilityChange={(nextVisibility: PlanVisibilityFilter) =>
          setSearchValue("visibility", nextVisibility)
        }
        onCurrencyCodeChange={(nextCurrencyCode) =>
          setSearchValue("currencyCode", nextCurrencyCode)
        }
        onBillingIntervalChange={(nextBillingInterval: BillingInterval) =>
          setSearchValue("billingInterval", nextBillingInterval)
        }
        onCountryCodeChange={(nextCountryCode) => setSearchValue("countryCode", nextCountryCode)}
        onRegionCodeChange={(nextRegionCode) => setSearchValue("regionCode", nextRegionCode)}
        onIntervalCountChange={(nextIntervalCount) =>
          setSearchValue("intervalCount", nextIntervalCount)
        }
        onClearPricePreview={clearPricePreview}
      />

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
