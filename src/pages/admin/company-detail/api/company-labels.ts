import type { SubscriptionStatus } from "./company-detail";

type StatusBadgeVariant = "success" | "primary" | "warning" | "danger" | "default";

export const SUBSCRIPTION_STATUS_BADGE: Record<
  SubscriptionStatus,
  { variant: StatusBadgeVariant; label: string }
> = {
  TRIAL: { variant: "primary", label: "Trial" },
  ACTIVE: { variant: "success", label: "Active" },
  FROZEN: { variant: "warning", label: "Frozen" },
  CANCELLED: { variant: "danger", label: "Cancelled" },
  EXPIRED: { variant: "default", label: "Expired" },
};

export const ALL_SUBSCRIPTION_STATUSES = Object.keys(
  SUBSCRIPTION_STATUS_BADGE,
) as SubscriptionStatus[];

export const SITE_STATUS_FLAG_LABEL = {
  isFrozen: "Frozen",
  isReadOnly: "Read-only",
  isBlocked: "Blocked",
  isUnderMaintenance: "Maintenance",
} as const;
