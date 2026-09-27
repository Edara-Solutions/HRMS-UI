import type { z } from "zod";
import type { platformCompanyOperations as operations } from "@/shared/api";
export type CompanyRecord = z.output<(typeof operations.company.responses)["200"]>;
export type Policy = z.output<(typeof operations.policy.responses)["200"]>;
export type Activation = z.output<(typeof operations.activation.responses)["200"]>;
export type Subscription = z.output<(typeof operations.subscription.responses)["200"]>;
export type Commercial = z.output<(typeof operations.commercial.responses)["200"]>;
export type Command =
  | "freeze"
  | "unfreeze"
  | "suspend"
  | "unsuspend"
  | "restore"
  | "remove"
  | "evaluate"
  | "updatePolicy"
  | "extendTrial";

/** Registry/lifecycle and commercial freezing are distinct server facts. Unknown prerequisites disable. */
export function lifecycleAllowed(
  command: Command,
  company: CompanyRecord,
  commercial?: { isFrozen: boolean; isBlocked: boolean },
) {
  switch (command) {
    case "freeze":
      return commercial?.isFrozen === false;
    case "unfreeze":
      return commercial?.isFrozen === true;
    case "suspend":
      return commercial?.isBlocked === false;
    case "unsuspend":
      return commercial?.isBlocked === true;
    case "restore":
      return false;
    case "remove":
      return true;
    case "evaluate":
      return company.lifecycleStatus === "ONBOARDING";
    default:
      return true;
  }
}

/** Safe projection: activation messages and details never reach the view. */
export function projectActivation(value: Activation) {
  return {
    canActivate: value.canActivate,
    requirements: value.unmetRequirements.map((item) => item.code),
  };
}
export function projectPolicy(value: Policy) {
  return {
    configuredMode: value.policy.mode,
    effectiveMode: value.effectiveMode,
    effectiveFrom: value.policy.effectiveFrom,
    effectiveUntil: value.policy.effectiveUntil,
    isExpired: value.isExpired,
  };
}
export function projectSubscription(value: Subscription) {
  const item = value.subscription;
  return {
    plan: item.plan.name,
    status: item.status,
    startDate: item.startDate,
    endDate: item.endDate,
    initialTrialEndDate: item.initialTrialEndDate,
    trialEndDate: item.trialEndDate,
    history: value.history.map(
      ({ publicId, type, oldStatus, newStatus, oldTrialEndDate, newTrialEndDate, occurredAt }) => ({
        publicId,
        type,
        oldStatus,
        newStatus,
        oldTrialEndDate,
        newTrialEndDate,
        occurredAt,
      }),
    ),
  };
}
export function projectCommercial(value: Commercial) {
  return {
    plan: value.plan.name,
    subscriptionStatus: value.subscriptionStatus,
    subscriptionStartDate: value.subscriptionStartDate,
    subscriptionEndDate: value.subscriptionEndDate,
    trialEndDate: value.trialEndDate,
    ...value.siteStatus,
  };
}
