import type { NotificationScope } from "./notification-tier";

/** Query roots carry the audience and identity, so one identity never reads another's rows. */
export const notificationKeys = {
  count: (scope: NotificationScope) =>
    [scope.tier, scope.userPublicId, "notifications", "count"] as const,
  list: (scope: NotificationScope) =>
    [scope.tier, scope.userPublicId, "notifications", "list"] as const,
};
