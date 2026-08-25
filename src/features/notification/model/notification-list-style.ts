import type { NotificationListStyle } from "@/shared/config";

/** The order the picker offers the shapes in: quick glance, focused triage, high-volume scan. */
export const NOTIFICATION_LIST_STYLES = ["panel", "sheet", "flat"] as const satisfies readonly [
  NotificationListStyle,
  ...NotificationListStyle[],
];
