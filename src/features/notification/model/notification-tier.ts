import { useCurrentAudience, useCurrentSession } from "@/shared/auth";

/** The selected, validated portal owns the notification mount. */
export type NotificationTier = "company" | "platform";

/** The audience and identity every notification cache, cursor and preference is scoped to. */
export interface NotificationScope {
  readonly tier: NotificationTier;
  readonly userPublicId: string;
}

/** The mounted portal's audience and signed-in identity, or `null` before a session exists. */
export function useNotificationScope(): NotificationScope | null {
  const audience = useCurrentAudience();
  const session = useCurrentSession();
  return session && audience ? { tier: audience, userPublicId: session.user.publicId } : null;
}

/** The mounted portal's audience while a session exists. */
export function useNotificationTier(): NotificationTier | null {
  return useNotificationScope()?.tier ?? null;
}

/** A stable string key for per-identity client state such as the bulk-read cursor. */
export function scopeKey(scope: NotificationScope) {
  return `${scope.tier}:${scope.userPublicId}`;
}
