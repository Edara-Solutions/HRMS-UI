import { useAuthStore } from "@/shared/auth";

/** Which tier's notification mount the center talks to. Derived from the session, never from props. */
export type NotificationTier = "company" | "platform";

export function useNotificationTier(): NotificationTier | null {
  const isPlatformAdmin = useAuthStore((state) => state.session?.user.isPlatformAdmin);

  if (isPlatformAdmin === undefined) {
    return null;
  }

  return isPlatformAdmin ? "platform" : "company";
}
