import { useQuery } from "@tanstack/react-query";
import { notificationKeys } from "../model/notification-keys";
import { useNotificationScope } from "../model/notification-tier";
import { IDLE_POLL_INTERVAL_MS } from "../model/poll-cadence";
import { fetchUnreadCount } from "./notification-transport";

/** The badge number, always from the declared unread-count read, never from cached feed rows. */
export function useUnreadNotificationCount() {
  const scope = useNotificationScope();

  return useQuery({
    queryKey: scope ? notificationKeys.count(scope) : ["notifications", "count", "no-session"],
    queryFn: ({ signal }) => {
      if (!scope) throw new Error("Notification count requires a session");
      return fetchUnreadCount(scope.tier, signal);
    },
    enabled: scope !== null,
    // The badge must react the moment the window comes back, so nothing here is ever fresh.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: IDLE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}
