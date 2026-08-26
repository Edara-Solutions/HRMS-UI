import { useQuery } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { z } from "zod";
import { apiClient } from "@/shared/api";
import { notificationKeys } from "../model/notification-keys";
import { type NotificationTier, useNotificationTier } from "../model/notification-tier";
import { IDLE_POLL_INTERVAL_MS, resolvePollIntervalMs } from "../model/poll-cadence";

/**
 * Interim wire contract pinned to HRMS_Back_End#198 §5 (`NotificationUnreadCount`).
 * Swap for `components["schemas"]["NotificationUnreadCount"]` once the endpoint is
 * reachable and `bun run openapi:types` can regenerate the schema.
 */
const unreadCountResponseSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
});

export interface UnreadNotificationCount {
  readonly unreadCount: number;
  readonly pollIntervalMs: number;
}

interface CachedUnreadCount {
  readonly etag: string;
  readonly value: UnreadNotificationCount;
}

const NOT_MODIFIED = 304;

/** Revision ETags are per identity, so each tier keeps its own. */
const cacheByTier = new Map<NotificationTier, CachedUnreadCount>();

function unreadCountPath(tier: NotificationTier) {
  return `${tier}/notifications/unread-count`;
}

// ky rejects every non-2xx, but a conditional GET's 304 is this endpoint's cheap success
// path — unwrap it back into a plain response and let real failures propagate.
async function requestUnreadCount(tier: NotificationTier, etag: string | undefined) {
  try {
    return await apiClient.get(unreadCountPath(tier), {
      headers: etag ? { "If-None-Match": etag } : undefined,
    });
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === NOT_MODIFIED) {
      return error.response;
    }

    throw error;
  }
}

/**
 * Drops a tier's conditional-GET entry so the next count fetch is unconditional. A seen/read write
 * changes the count, and revalidating against the pre-write ETag would hand the badge its
 * pre-write value straight back.
 */
export function forgetUnreadCountRevision(tier: NotificationTier) {
  cacheByTier.delete(tier);
}

export async function fetchUnreadNotificationCount(
  tier: NotificationTier,
): Promise<UnreadNotificationCount> {
  const cached = cacheByTier.get(tier);
  const response = await requestUnreadCount(tier, cached?.etag);
  const pollIntervalMs = resolvePollIntervalMs(response.headers.get("x-poll-interval"));

  if (response.status === NOT_MODIFIED && cached) {
    // The count is unchanged by definition; only the cadence header may have moved. Handing
    // back the cached object when it has not keeps the 304 a true no-op for React Query.
    const value =
      cached.value.pollIntervalMs === pollIntervalMs
        ? cached.value
        : { ...cached.value, pollIntervalMs };

    cacheByTier.set(tier, { ...cached, value });
    return value;
  }

  const { unreadCount } = unreadCountResponseSchema.parse(await response.json());
  const value: UnreadNotificationCount = { unreadCount, pollIntervalMs };
  const revision = response.headers.get("etag");

  if (revision) {
    cacheByTier.set(tier, { etag: revision, value });
  } else {
    cacheByTier.delete(tier);
  }

  return value;
}

export function useUnreadNotificationCount() {
  const tier = useNotificationTier();

  return useQuery({
    queryKey: notificationKeys.count(),
    queryFn: () => {
      if (!tier) throw new Error("Notification tier requires a session");
      return fetchUnreadNotificationCount(tier);
    },
    enabled: tier !== null,
    // The badge must react the moment the window comes back, so nothing here is ever fresh.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => query.state.data?.pollIntervalMs ?? IDLE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}
