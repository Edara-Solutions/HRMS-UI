import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "../model/notification-keys";
import { useBulkReadCursor } from "../model/notification-read-state";
import { type NotificationScope, scopeKey, useNotificationScope } from "../model/notification-tier";
import {
  type NotificationFeedItem,
  type NotificationFeedPage,
  sendNotificationRead,
  sendNotificationsSeen,
} from "./notification-transport";

/** Server cap on one seen batch; a fuller panel marks its newest rows. */
export const SEEN_BATCH_LIMIT = 200;

interface CachedFeed {
  readonly pages: readonly NotificationFeedPage[];
  readonly pageParams: readonly unknown[];
}

interface FeedSnapshot {
  readonly feed: CachedFeed | undefined;
  readonly count: number | undefined;
}

function requireScope(scope: NotificationScope | null): NotificationScope {
  if (!scope) {
    throw new Error("Notification lifecycle requires a session");
  }

  return scope;
}

function takeSnapshot(queryClient: QueryClient, scope: NotificationScope): FeedSnapshot {
  return {
    feed: queryClient.getQueryData<CachedFeed>(notificationKeys.list(scope)),
    count: queryClient.getQueryData<number>(notificationKeys.count(scope)),
  };
}

function restore(queryClient: QueryClient, scope: NotificationScope, snapshot: FeedSnapshot) {
  queryClient.setQueryData(notificationKeys.list(scope), snapshot.feed);
  queryClient.setQueryData(notificationKeys.count(scope), snapshot.count);
}

function cachedItems(
  queryClient: QueryClient,
  scope: NotificationScope,
): readonly NotificationFeedItem[] {
  const feed = queryClient.getQueryData<CachedFeed>(notificationKeys.list(scope));

  return feed?.pages.flatMap((page) => page.items) ?? [];
}

function patchFeed(
  queryClient: QueryClient,
  scope: NotificationScope,
  patch: (item: NotificationFeedItem) => NotificationFeedItem,
) {
  queryClient.setQueryData(notificationKeys.list(scope), (current: CachedFeed | undefined) => {
    if (!current) return current;

    return {
      ...current,
      pages: current.pages.map((page) => ({ ...page, items: page.items.map(patch) })),
    };
  });
}

function patchCount(
  queryClient: QueryClient,
  scope: NotificationScope,
  next: (unreadCount: number) => number,
) {
  queryClient.setQueryData(notificationKeys.count(scope), (current: number | undefined) =>
    current === undefined ? current : Math.max(0, next(current)),
  );
}

/**
 * The polling count would otherwise land mid-mutation and undo the optimistic drain. The list is
 * left alone: it never refetches on its own, and cancelling it would abort a "show older" page.
 */
function cancelCountPoll(queryClient: QueryClient, scope: NotificationScope) {
  return queryClient.cancelQueries({ queryKey: notificationKeys.count(scope) });
}

function refreshCountAndFeed(queryClient: QueryClient, scope: NotificationScope | null) {
  if (!scope) return Promise.resolve();

  return Promise.all([
    queryClient.invalidateQueries({ queryKey: notificationKeys.count(scope) }),
    queryClient.invalidateQueries({ queryKey: notificationKeys.list(scope) }),
  ]);
}

/**
 * Marks the rows an open panel rendered as seen — the write that drains the badge. Seen is not
 * read: a seen row keeps its unread state until it is opened or everything is marked read.
 */
export function useMarkNotificationsSeen() {
  const scope = useNotificationScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicIds: readonly string[]) =>
      sendNotificationsSeen(requireScope(scope).tier, publicIds),
    onMutate: async (publicIds) => {
      const current = requireScope(scope);
      await cancelCountPoll(queryClient, current);

      const snapshot = takeSnapshot(queryClient, current);
      const marked = new Set(publicIds);
      const seenAt = new Date().toISOString();
      const drained = cachedItems(queryClient, current).filter(
        (item) => marked.has(item.publicId) && item.seenAt === null && item.readAt === null,
      ).length;

      patchFeed(queryClient, current, (item) =>
        marked.has(item.publicId) && item.seenAt === null ? { ...item, seenAt } : item,
      );
      patchCount(queryClient, current, (unreadCount) => unreadCount - drained);

      return snapshot;
    },
    onError: (_error, _ids, snapshot) => {
      if (snapshot && scope) restore(queryClient, scope, snapshot);
    },
    onSettled: () => refreshCountAndFeed(queryClient, scope),
  });
}

/** Marks the row the reader just activated as read. */
export function useMarkNotificationRead() {
  const scope = useNotificationScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicId: string) => sendNotificationRead(requireScope(scope).tier, { publicId }),
    onMutate: async (publicId) => {
      const current = requireScope(scope);
      await cancelCountPoll(queryClient, current);

      const snapshot = takeSnapshot(queryClient, current);
      const target = cachedItems(queryClient, current).find((item) => item.publicId === publicId);
      const readAt = new Date().toISOString();

      patchFeed(queryClient, current, (item) =>
        item.publicId === publicId ? { ...item, readAt } : item,
      );

      if (target?.seenAt === null && target.readAt === null) {
        patchCount(queryClient, current, (unreadCount) => unreadCount - 1);
      }

      return snapshot;
    },
    onError: (_error, _id, snapshot) => {
      if (snapshot && scope) restore(queryClient, scope, snapshot);
    },
    onSettled: () => refreshCountAndFeed(queryClient, scope),
  });
}

/**
 * Advances the bulk-read cursor over the whole feed. Rows are not stamped server-side, so the
 * mirrored cursor — not the cached rows — is what mutes them.
 */
export function useMarkAllNotificationsRead() {
  const scope = useNotificationScope();
  const queryClient = useQueryClient();
  const setCursorAt = useBulkReadCursor((state) => state.setCursorAt);

  return useMutation({
    mutationFn: () => sendNotificationRead(requireScope(scope).tier, { all: true }),
    onMutate: async () => {
      const current = requireScope(scope);
      const key = scopeKey(current);
      await cancelCountPoll(queryClient, current);

      const snapshot = {
        ...takeSnapshot(queryClient, current),
        cursorAt: useBulkReadCursor.getState().cursors[key] ?? null,
      };

      setCursorAt(key, new Date().toISOString());
      patchCount(queryClient, current, () => 0);

      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      if (!snapshot || !scope) return;

      restore(queryClient, scope, snapshot);
      setCursorAt(scopeKey(scope), snapshot.cursorAt);
    },
    onSettled: () => refreshCountAndFeed(queryClient, scope),
  });
}
