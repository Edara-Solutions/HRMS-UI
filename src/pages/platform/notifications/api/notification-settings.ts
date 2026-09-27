import { queryOptions } from "@tanstack/react-query";
import {
  platformCommunicationsOperations as communications,
  platformPeopleOperations as people,
  platformQueryKey,
  platformReadQuery,
  requestPlatformOperation,
  sendPlatformCommand,
} from "@/shared/api";
import type { RoutingOverride } from "../model";

/** Query options for notification settings and role selectors. */
export function settingsQueries(userPublicId: string) {
  return {
    /** Notification settings read (parameterless, cached per Platform user). */
    settings: platformReadQuery(userPublicId, communications.notificationSettings),

    /** Role selectors route by role name; the Platform role catalogue supplies the choices. */
    roles: queryOptions({
      queryKey: platformQueryKey(userPublicId, people.roles, "routing"),
      queryFn: ({ signal }) => requestPlatformOperation(people.roles, {}, signal),
    }),
  };
}

/**
 * Replaces one notification type's override; `null` returns the type to its declared default routing.
 * Uses `sendPlatformCommand` because the declared success is bodyless 204.
 */
export function setRouting(typeKey: string, override: RoutingOverride): Promise<void> {
  return sendPlatformCommand(communications.updateNotificationRouting, {
    params: { typeKey },
    body: { override },
  });
}
