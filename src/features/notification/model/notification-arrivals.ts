import { create } from "zustand";
import { useAuthStore } from "@/shared/auth";
import type { NotificationFeedItem } from "../api/notification-feed";
import { NOTIFICATION_CATALOG } from "./notification-catalog";
import type { ToastRequest } from "./toast-store";

interface PresentedNotificationsState {
  /** Ids any client path has already surfaced this session. */
  readonly ids: ReadonlySet<number>;
  recordAll: (ids: readonly number[]) => void;
  clear: () => void;
}

/**
 * Rows become presented once any path — watcher tick, panel fetch, reopen delta — delivers
 * them, and a presented row never toasts again.
 */
export const usePresentedNotifications = create<PresentedNotificationsState>()((set) => ({
  ids: new Set<number>(),

  recordAll: (ids) =>
    set((state) => {
      const next = new Set(state.ids);

      for (const id of ids) {
        next.add(id);
      }

      return { ids: next };
    }),

  clear: () => set({ ids: new Set<number>() }),
}));

/** Marks feed rows as surfaced so no later poll or merge can announce them again. */
export function recordPresentedNotifications(items: readonly NotificationFeedItem[]) {
  if (items.length === 0) return;

  usePresentedNotifications.getState().recordAll(items.map((item) => item.id));
}

/** Rows never surfaced yet, keeping the newest-first order they arrived in. */
export function unpresentedNotifications(
  items: readonly NotificationFeedItem[],
): readonly NotificationFeedItem[] {
  const presented = usePresentedNotifications.getState().ids;

  return items.filter((item) => !presented.has(item.id));
}

/**
 * The one arrival a batch may announce — its newest high-importance row. Normal importance waits
 * in the bell, unknown types have nothing renderable to say, and a catch-up after a hidden
 * stretch collapses into a single card instead of bursting.
 */
export function planArrivalToast(arrivals: readonly NotificationFeedItem[]): ToastRequest | null {
  const announcement = arrivals.find(
    (item) => NOTIFICATION_CATALOG.get(item.typeKey)?.importance === "high",
  );

  if (!announcement) {
    return null;
  }

  return { typeKey: announcement.typeKey, params: announcement.params };
}

// The ledger belongs to one identity; a shared browser would otherwise hand the next session's
// first poll a stale "already presented" list.
useAuthStore.subscribe((state, previous) => {
  if (state.session?.user.publicId !== previous.session?.user.publicId) {
    usePresentedNotifications.getState().clear();
  }
});
