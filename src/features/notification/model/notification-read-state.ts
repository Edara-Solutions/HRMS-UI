import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/shared/auth";
import type { NotificationFeedItem } from "../api/notification-feed";

/**
 * How a row presents itself: `unseen` carries the primary wash and dot, `read` mutes, and
 * `settled` is the plain resting state a row lands in once the panel has marked it seen.
 */
export type NotificationRowState = "unseen" | "settled" | "read";

interface BulkReadCursorState {
  /** When the last mark-all landed, or `null` before the first one of the session. */
  cursorAt: string | null;
  setCursorAt: (cursorAt: string | null) => void;
}

/**
 * Client mirror of the server's bulk-read cursor. `POST /notifications/read {all:true}` advances a
 * cursor rather than stamping rows, so refetched rows still arrive with `readAt: null` — comparing
 * their `createdAt` against this keeps them muted the way the server already counts them. Nothing
 * on the read path returns the cursor, so it is kept locally and survives a reload.
 */
export const useBulkReadCursor = create<BulkReadCursorState>()(
  persist(
    (set) => ({
      cursorAt: null,
      setCursorAt: (cursorAt) => set({ cursorAt }),
    }),
    { name: "hrms-notification-read" },
  ),
);

// The cursor belongs to one identity. A shared browser would otherwise carry it into the next
// session and mute rows that reader has never been shown.
useAuthStore.subscribe((state, previous) => {
  if (state.session?.user.publicId !== previous.session?.user.publicId) {
    useBulkReadCursor.setState({ cursorAt: null });
  }
});

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
