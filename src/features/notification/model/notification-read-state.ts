import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotificationFeedItem } from "../api/notification-transport";

/**
 * How a row presents itself: `unseen` carries the primary wash and dot, `read` mutes, and
 * `settled` is the plain resting state a row lands in once the panel has marked it seen.
 */
export type NotificationRowState = "unseen" | "settled" | "read";

interface BulkReadCursorState {
  /** When each identity's last mark-all landed, keyed by `audience:userPublicId`. */
  cursors: Readonly<Record<string, string>>;
  /** `scope` is the identity key from `scopeKey`; `null` clears that identity's cursor. */
  setCursorAt: (scope: string, cursorAt: string | null) => void;
}

/**
 * Client mirror of the server's bulk-read cursor. `read {all: true}` advances a cursor rather than
 * stamping rows, so refetched rows still arrive with `readAt: null` — comparing their `createdAt`
 * against this keeps them muted the way the server already counts them. Nothing on the read path
 * returns the cursor, so it is kept locally per audience and identity and survives a reload.
 */
export const useBulkReadCursor = create<BulkReadCursorState>()(
  persist(
    (set) => ({
      cursors: {},
      setCursorAt: (scope, cursorAt) =>
        set((state) => {
          const others = Object.fromEntries(
            Object.entries(state.cursors).filter(([key]) => key !== scope),
          );
          return { cursors: cursorAt ? { ...others, [scope]: cursorAt } : others };
        }),
    }),
    { name: "hrms-notification-read:v2" },
  ),
);

export function notificationRowState(
  item: NotificationFeedItem,
  bulkReadCursorAt: string | null,
): NotificationRowState {
  if (isRead(item, bulkReadCursorAt)) {
    return "read";
  }

  return item.seenAt === null ? "unseen" : "settled";
}

function isRead(item: NotificationFeedItem, bulkReadCursorAt: string | null) {
  if (item.readAt !== null) {
    return true;
  }

  return bulkReadCursorAt !== null && Date.parse(item.createdAt) <= Date.parse(bulkReadCursorAt);
}
