import { Search } from "lucide-react";
import type { BillingInterval } from "@/shared/api";
import { isBillingInterval } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { BILLING_INTERVAL_LABEL, KNOWN_BILLING_INTERVALS } from "../api/plan-labels";
import {
  PLAN_COUNTRY_OPTIONS,
  PLAN_CURRENCY_OPTIONS,
  PLAN_REGION_OPTIONS,
} from "../model/plan-market-options";

export type PlanStatusFilter = "all" | "active" | "inactive";
export type PlanVisibilityFilter = "all" | "public" | "private";

const statusOptions: Array<{ value: PlanStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const visibilityOptions: Array<{ value: PlanVisibilityFilter; label: string }> = [
  { value: "all", label: "All visibility" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

function isPlanStatusFilter(value: string): value is PlanStatusFilter {
  return statusOptions.some((option) => option.value === value);
}

function isPlanVisibilityFilter(value: string): value is PlanVisibilityFilter {
  return visibilityOptions.some((option) => option.value === value);
}

interface PlansFilterPanelProps {
  query: string;
  active: PlanStatusFilter;
  visibility: PlanVisibilityFilter;
  currencyCode?: string;
  billingInterval?: BillingInterval;
  countryCode?: string;
  regionCode?: string;
  intervalCountValue: number;
  previewEnabled: boolean;
  onQueryChange: (query: string) => void;
  onActiveChange: (active: PlanStatusFilter) => void;
  onVisibilityChange: (visibility: PlanVisibilityFilter) => void;
  onCurrencyCodeChange: (currencyCode: string | undefined) => void;
  onBillingIntervalChange: (billingInterval: BillingInterval) => void;
  onCountryCodeChange: (countryCode: string | undefined) => void;
  onRegionCodeChange: (regionCode: string | undefined) => void;
  onIntervalCountChange: (intervalCount: number) => void;
  onClearPricePreview: () => void;
}

export function PlansFilterPanel({
  query,
  active,
  visibility,
  currencyCode,
  billingInterval,
  countryCode,
  regionCode,
  intervalCountValue,
  previewEnabled,
  onQueryChange,
  onActiveChange,
  onVisibilityChange,
  onCurrencyCodeChange,
  onBillingIntervalChange,
  onCountryCodeChange,
  onRegionCodeChange,
  onIntervalCountChange,
  onClearPricePreview,
}: PlansFilterPanelProps) {
  return (
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
              onChange={(event) => onQueryChange(event.target.value)}
              className="ps-8"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
            <Select
              value={active}
              onValueChange={(value) => {
                if (isPlanStatusFilter(value)) onActiveChange(value);
              }}
            >
              <SelectTrigger aria-label="Plan status filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={visibility}
              onValueChange={(value) => {
                if (isPlanVisibilityFilter(value)) onVisibilityChange(value);
              }}
            >
              <SelectTrigger aria-label="Plan visibility filter">
                <SelectValue placeholder="All visibility" />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button intent="utility" type="button" onClick={onClearPricePreview}>
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
              <SearchableSelect
                id="plans-currency"
                value={currencyCode}
                options={PLAN_CURRENCY_OPTIONS}
                placeholder="Select currency"
                searchPlaceholder="Search currency..."
                emptyText="No currencies found."
                onValueChange={onCurrencyCodeChange}
                allowClear
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
                  if (isBillingInterval(value)) onBillingIntervalChange(value);
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
              <SearchableSelect
                id="plans-country"
                value={countryCode}
                options={PLAN_COUNTRY_OPTIONS}
                placeholder="Select country"
                searchPlaceholder="Search country..."
                emptyText="No countries found."
                onValueChange={onCountryCodeChange}
                allowClear
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="plans-region"
                className="text-xs font-medium text-[var(--color-text-muted)]"
              >
                Region code
              </label>
              <SearchableSelect
                id="plans-region"
                value={regionCode}
                options={PLAN_REGION_OPTIONS}
                placeholder="Select region"
                searchPlaceholder="Search region..."
                emptyText="No regions found."
                onValueChange={onRegionCodeChange}
                allowClear
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
                onChange={(event) => onIntervalCountChange(Number(event.target.value || 1))}
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
  );
}
