import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { notificationKeys } from "../model/notification-keys";
import { useBulkReadCursor } from "../model/notification-read-state";
import { type NotificationTier, useNotificationTier } from "../model/notification-tier";
import type { NotificationFeedItem, NotificationFeedPage } from "./notification-feed";
import { forgetUnreadCountRevision, type UnreadNotificationCount } from "./unread-count";

/** Server cap on one seen batch (HRMS_Back_End#198 §5); a fuller panel marks its newest rows. */
export const SEEN_BATCH_LIMIT = 200;

interface CachedFeed {
  readonly pages: readonly NotificationFeedPage[];
  readonly pageParams: readonly unknown[];
}

interface FeedSnapshot {
  readonly feed: CachedFeed | undefined;
  readonly count: UnreadNotificationCount | undefined;
}

function requireTier(tier: NotificationTier | null): NotificationTier {
  if (!tier) {
    throw new Error("Notification tier requires a session");
  }

  return tier;
}

function takeSnapshot(queryClient: QueryClient): FeedSnapshot {
  return {
    feed: queryClient.getQueryData<CachedFeed>(notificationKeys.list(null)),
    count: queryClient.getQueryData<UnreadNotificationCount>(notificationKeys.count()),
  };
}

function restore(queryClient: QueryClient, snapshot: FeedSnapshot) {
  queryClient.setQueryData(notificationKeys.list(null), snapshot.feed);
  queryClient.setQueryData(notificationKeys.count(), snapshot.count);
}

function cachedItems(queryClient: QueryClient): readonly NotificationFeedItem[] {
  const feed = queryClient.getQueryData<CachedFeed>(notificationKeys.list(null));

  return feed?.pages.flatMap((page) => page.items) ?? [];
}

function patchFeed(
  queryClient: QueryClient,
  patch: (item: NotificationFeedItem) => NotificationFeedItem,
) {
  queryClient.setQueryData(notificationKeys.list(null), (current: CachedFeed | undefined) => {
    if (!current) return current;

    return {
      ...current,
      pages: current.pages.map((page) => ({ ...page, items: page.items.map(patch) })),
    };
  });
}

function patchCount(queryClient: QueryClient, next: (unreadCount: number) => number) {
  queryClient.setQueryData(
    notificationKeys.count(),
    (current: UnreadNotificationCount | undefined) =>
      current ? { ...current, unreadCount: Math.max(0, next(current.unreadCount)) } : current,
  );
}

/**
 * The polling count would otherwise land mid-mutation and undo the optimistic drain. The list is
 * left alone: it never refetches on its own, and cancelling it would abort a "show older" page.
 */
function cancelCountPoll(queryClient: QueryClient) {
  return queryClient.cancelQueries({ queryKey: notificationKeys.count() });
}

function refreshCountAndFeed(queryClient: QueryClient, tier: NotificationTier | null) {
  // A tier is guaranteed by the time a mutation settles; the guard is only here because the
  // session can end mid-flight, and there is then no revision left worth forgetting.
  if (tier) forgetUnreadCountRevision(tier);

  return Promise.all([
    queryClient.invalidateQueries({ queryKey: notificationKeys.count() }),
    queryClient.invalidateQueries({ queryKey: notificationKeys.list(null) }),
  ]);
}

/** Marks the rows an open panel rendered as seen — the write that drains the badge. */
export function useMarkNotificationsSeen() {
  const tier = useNotificationTier();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: readonly number[]) => {
      await apiClient.post(`${requireTier(tier)}/notifications/seen`, { json: { ids: [...ids] } });
    },
    onMutate: async (ids) => {
      await cancelCountPoll(queryClient);

      const snapshot = takeSnapshot(queryClient);
      const marked = new Set(ids);
      const seenAt = new Date().toISOString();
      const drained = cachedItems(queryClient).filter(
        (item) => marked.has(item.id) && item.seenAt === null && item.readAt === null,
      ).length;

      patchFeed(queryClient, (item) =>
        marked.has(item.id) && item.seenAt === null ? { ...item, seenAt } : item,
      );
      patchCount(queryClient, (unreadCount) => unreadCount - drained);

      return snapshot;
    },
    onError: (_error, _ids, snapshot) => {
      if (snapshot) restore(queryClient, snapshot);
    },
    onSettled: () => refreshCountAndFeed(queryClient, tier),
  });
}

/** Marks the row the reader just activated as read. */
export function useMarkNotificationRead() {
  const tier = useNotificationTier();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(`${requireTier(tier)}/notifications/read`, { json: { id } });
    },
    onMutate: async (id) => {
      await cancelCountPoll(queryClient);

      const snapshot = takeSnapshot(queryClient);
      const target = cachedItems(queryClient).find((item) => item.id === id);
      const readAt = new Date().toISOString();

      patchFeed(queryClient, (item) => (item.id === id ? { ...item, readAt } : item));

      if (target?.seenAt === null && target.readAt === null) {
        patchCount(queryClient, (unreadCount) => unreadCount - 1);
      }

      return snapshot;
    },
    onError: (_error, _id, snapshot) => {
      if (snapshot) restore(queryClient, snapshot);
    },
    onSettled: () => refreshCountAndFeed(queryClient, tier),
  });
}

/**
 * Advances the bulk-read cursor over the whole feed. Rows are not stamped server-side, so the
 * mirrored cursor — not the cached rows — is what mutes them.
 */
export function useMarkAllNotificationsRead() {
  const tier = useNotificationTier();
  const queryClient = useQueryClient();
  const setCursorAt = useBulkReadCursor((state) => state.setCursorAt);

  return useMutation({
    mutationFn: async () => {
      await apiClient.post(`${requireTier(tier)}/notifications/read`, { json: { all: true } });
    },
    onMutate: async () => {
      await cancelCountPoll(queryClient);

      const snapshot = {
        ...takeSnapshot(queryClient),
        cursorAt: useBulkReadCursor.getState().cursorAt,
      };

      setCursorAt(new Date().toISOString());
      patchCount(queryClient, () => 0);

      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      if (!snapshot) return;

      restore(queryClient, snapshot);
      setCursorAt(snapshot.cursorAt);
    },
    onSettled: () => refreshCountAndFeed(queryClient, tier),
  });
}
