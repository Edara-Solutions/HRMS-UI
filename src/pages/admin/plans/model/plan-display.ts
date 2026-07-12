import type { Plan } from "@/shared/api";
import { BILLING_INTERVAL_LABEL } from "../api/plan-labels";

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

export function countPlanPrices(plans: Plan[]): number {
  let total = 0;
  for (const plan of plans) {
    total += plan.prices.length;
  }
  return total;
}
