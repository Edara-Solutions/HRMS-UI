import { type QueryClient, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { recordPresentedNotifications } from "../model/notification-arrivals";
import { notificationKeys } from "../model/notification-keys";
import { type NotificationScope, useNotificationScope } from "../model/notification-tier";
import {
  fetchNotificationFeed,
  type NotificationFeedItem,
  type NotificationFeedPage,
} from "./notification-transport";

export type { NotificationFeedItem, NotificationFeedPage };

/**
 * Newest first, one row per public ID. Cursor pages and `since` deltas both land in the same
 * cached array, so a row that arrives twice is rendered once.
 */
function dedupeById(items: readonly NotificationFeedItem[]): NotificationFeedItem[] {
  const byId = new Map<string, NotificationFeedItem>();

  for (const item of items) {
    byId.set(item.publicId, item);
  }

  // Sorting the freshly built array in place; nothing shared is mutated. `.toSorted` would
  // need an ES2023 lib bump.
  return [...byId.values()].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

/**
 * The read path behind the panel. The query only runs while the panel is open; each reopen pulls
 * the rows created since the newest cached one rather than refetching every page.
 */
export function useNotificationFeed(open: boolean) {
  const scope = useNotificationScope();
  const queryClient = useQueryClient();

  const feed = useInfiniteQuery({
    queryKey: scope ? notificationKeys.list(scope) : ["notifications", "list", "no-session"],
    queryFn: ({ pageParam, signal }) => {
      if (!scope) throw new Error("Notification feed requires a session");

      return fetchNotificationFeed(scope.tier, { cursor: pageParam }, signal).then((page) => {
        // Rows the panel has delivered count as presented, so the arrival watcher can never
        // announce one of them later.
        recordPresentedNotifications(page.items);
        return page;
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : null),
    enabled: open && scope !== null,
    // Cached pages never go stale on their own; the delta below is what catches them up, so a
    // reopen does not refetch every page it already holds.
    staleTime: Number.POSITIVE_INFINITY,
    select: (data) => dedupeById(data.pages.flatMap((page) => page.items)),
  });

  const newestCreatedAt = feed.data?.[0]?.createdAt;

  useEffect(() => {
    if (!open || !scope || !newestCreatedAt) return;

    let cancelled = false;

    fetchNotificationFeed(scope.tier, { since: newestCreatedAt })
      .then((delta) => {
        if (cancelled || delta.items.length === 0) return;

        // A reopen delta is presentation too: the watcher must not toast what the panel just showed.
        recordPresentedNotifications(delta.items);
        prependDelta(queryClient, scope, delta.items);
      })
      // A failed catch-up leaves the cached rows standing; the next open tries again.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // Keyed on the open transition alone: the delta is a catch-up on reopen, and re-running it
    // as newestCreatedAt advances would poll the feed behind the panel's back.
  }, [open]);

  return feed;
}

function prependDelta(
  queryClient: QueryClient,
  scope: NotificationScope,
  items: readonly NotificationFeedItem[],
) {
  queryClient.setQueryData(
    notificationKeys.list(scope),
    (current: { pages: NotificationFeedPage[]; pageParams: unknown[] } | undefined) => {
      if (!current || current.pages.length === 0) return current;

      const [head, ...rest] = current.pages;

      return {
        ...current,
        pages: [{ ...head, items: dedupeById([...items, ...head.items]) }, ...rest],
      };
    },
  );
}
