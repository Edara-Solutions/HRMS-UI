import type { z } from "zod";
import type { companyOrganizationOperations } from "@/shared/api";

type Operations = typeof companyOrganizationOperations;
export type CompanySetup = z.output<Operations["setup"]["responses"]["200"]>;
export type CompanySubscription = z.output<Operations["subscription"]["responses"]["200"]>;

export interface SetupProgress {
  resolved: number;
  total: number;
  requiredRemaining: number;
}

/** Completed and skipped steps are resolved; a required step counts until it is completed. */
export function summarizeSetup(setup: CompanySetup): SetupProgress {
  return {
    resolved: setup.steps.filter((step) => step.status === "COMPLETED" || step.status === "SKIPPED")
      .length,
    total: setup.steps.length,
    requiredRemaining: setup.steps.filter((step) => step.isRequired && step.status !== "COMPLETED")
      .length,
  };
}

const dayMilliseconds = 86_400_000;

/** Whole days left in a trial, never negative; `null` when the subscription is not a trial. */
export function trialDaysRemaining(
  subscription: CompanySubscription["subscription"],
  now: Date = new Date(),
): number | null {
  if (subscription.status !== "TRIAL") return null;
  const remaining = new Date(subscription.trialEndDate).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / dayMilliseconds));
}
