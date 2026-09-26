import { useCurrentAudience, useCurrentSession } from "@/shared/auth";
import {
  defaultPresentation,
  type NotificationListStyle,
  type PreferenceScope,
  usePreferencesStore,
} from "@/shared/config";

export function useNotificationPreference() {
  const audience = useCurrentAudience();
  const session = useCurrentSession();
  const scope: PreferenceScope | null =
    audience && session ? `${audience}:${session.user.publicId}` : null;
  const selected = usePreferencesStore((state) =>
    scope
      ? (state.scopes[scope] ?? defaultPresentation).notificationListStyle
      : defaultPresentation.notificationListStyle,
  );
  const setPresentation = usePreferencesStore((state) => state.setPresentation);
  return {
    selected,
    setStyle: (style: NotificationListStyle) => {
      if (scope) setPresentation(scope, { notificationListStyle: style });
    },
  };
}
