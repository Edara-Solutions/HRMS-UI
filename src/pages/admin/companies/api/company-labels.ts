import type { CompanyLifecycleStatus } from "./companies";

type StatusBadgeVariant = "success" | "primary" | "warning" | "danger" | "default";

export const COMPANY_LIFECYCLE_STATUS_BADGE: Record<
  CompanyLifecycleStatus,
  { variant: StatusBadgeVariant; label: string }
> = {
  ACTIVE: { variant: "success", label: "Active" },
  ONBOARDING: { variant: "primary", label: "Onboarding" },
  SUSPENDED: { variant: "warning", label: "Suspended" },
  CLOSED: { variant: "default", label: "Closed" },
};
