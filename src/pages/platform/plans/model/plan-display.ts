import type { Plan } from "@/shared/api";
import { BILLING_INTERVAL_LABEL } from "../api/plan-labels";

function getPriceSourceLabel(source: string): string {
  if (source === "country") return "Country";
  if (source === "region") return "Region";
  if (source === "default_row") return "Default";
  return source.toLowerCase().replace(/_/g, " ");
}

export interface DisplayPrice {
  headline: string;
  meta: string;
  sourceBadge: string;
}

export function getPlanDisplayPrice(plan: Plan): DisplayPrice | null {
  if (plan.effectivePrice) {
    return {
      headline: plan.effectivePrice.money.formattedAmount,
      meta: `${BILLING_INTERVAL_LABEL[plan.effectivePrice.billingInterval] ?? plan.effectivePrice.billingInterval} · every ${plan.effectivePrice.intervalCount}`,
      sourceBadge: getPriceSourceLabel(plan.effectivePrice.source),
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

export function countPlanPrices(plans: Plan[]): number {
  let total = 0;
  for (const plan of plans) {
    total += plan.prices.length;
  }
  return total;
}
