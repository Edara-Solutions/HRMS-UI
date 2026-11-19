import { useEffect, useRef } from "react";
import { type NotificationFeedItem, useNotificationFeed } from "../api/notification-feed";
import {
  SEEN_BATCH_LIMIT,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMarkNotificationsSeen,
} from "../api/notification-lifecycle";
import {
  type NotificationRowState,
  notificationRowState,
  useBulkReadCursor,
} from "../model/notification-read-state";
import { scopeKey, useNotificationScope } from "../model/notification-tier";

export interface NotificationRowModel {
  readonly item: NotificationFeedItem;
  readonly state: NotificationRowState;
}

export interface NotificationCenter {
  readonly rows: readonly NotificationRowModel[];
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly hasUnread: boolean;
  /** True when a seen, read, or mark-all write failed and the reader is owed an explanation. */
  readonly lifecycleFailed: boolean;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isMarkingAllRead: boolean;
  readonly fetchNextPage: () => void;
  /** Reading a row by opening it: an already-read row owes the server nothing. */
  readonly activate: (row: NotificationRowModel) => void;
  readonly markRead: (publicId: string) => void;
  readonly markAllRead: (onSuccess: () => void) => void;
}

/**
 * Everything the three shapes share: one feed, one seen-on-open write, one set of lifecycle
 * mutations. The shapes differ in chrome and grouping only, so none of this is duplicated
 * per shape and a row means the same thing in all of them.
 */
export function useNotificationCenter(open: boolean): NotificationCenter {
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotificationFeed(open);
  const scope = useNotificationScope();
  const bulkReadCursorAt = useBulkReadCursor((state) =>
    scope ? (state.cursors[scopeKey(scope)] ?? null) : null,
  );
  const markSeen = useMarkNotificationsSeen();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Every row renders: a type the audience mirror does not know takes the neutral presentation.
  const rows: NotificationRowModel[] = (data ?? []).map((item) => ({
    item,
    state: notificationRowState(item, bulkReadCursorAt),
  }));

  const unseenIds = rows.filter((row) => row.state === "unseen").map((row) => row.item.publicId);
  const unseenKey = unseenIds.join(",");
  const seenSent = useRef(false);

  useEffect(() => {
    if (!open) {
      seenSent.current = false;
      return;
    }

    if (seenSent.current || unseenIds.length === 0) return;

    // Reopening with nothing unseen left never reaches this point, which is what keeps the
    // contract at one request per open rather than one per render.
    seenSent.current = true;
    markSeen.mutate(unseenIds.slice(0, SEEN_BATCH_LIMIT));
    // Keyed on the id list rather than the feed object: the rows re-render far more often than
    // their identities change, and only a changed identity can owe a request.
  }, [open, unseenKey]);

  return {
    rows,
    isPending,
    isError,
    hasUnread: rows.some((row) => row.state !== "read"),
    lifecycleFailed: markSeen.isError || markRead.isError || markAllRead.isError,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isMarkingAllRead: markAllRead.isPending,
    fetchNextPage: () => void fetchNextPage(),
    activate: (row) => {
      if (row.state !== "read") markRead.mutate(row.item.publicId);
    },
    markRead: (publicId) => markRead.mutate(publicId),
    markAllRead: (onSuccess) => markAllRead.mutate(undefined, { onSuccess }),
  };
}
