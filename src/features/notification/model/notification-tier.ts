import { useCurrentAudience, useCurrentSession } from "@/shared/auth";

/** The selected, validated portal owns the notification mount. */
export type NotificationTier = "company" | "platform";

export function useNotificationTier(): NotificationTier | null {
  const audience = useCurrentAudience();
  const session = useCurrentSession();
  return session ? audience : null;
}
