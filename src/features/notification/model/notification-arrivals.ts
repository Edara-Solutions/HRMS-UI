import { create } from "zustand";
import type { NotificationFeedItem } from "../api/notification-transport";
import { knownNotificationEntry } from "./notification-catalog";
import type { NotificationTier } from "./notification-tier";
import type { ToastRequest } from "./toast-store";

interface PresentedNotificationsState {
  /** Public IDs any client path has already surfaced this session. */
  readonly ids: ReadonlySet<string>;
  /** The `audience:userPublicId` the ledger belongs to. */
  readonly identity: string | null;
  recordAll: (ids: readonly string[]) => void;
  /** Claims the ledger; a different identity taking over starts it empty. */
  adopt: (identity: string) => void;
  clear: () => void;
}

/**
 * Rows become presented once any path — watcher tick, panel fetch, reopen delta — delivers
 * them, and a presented row never toasts again.
 */
export const usePresentedNotifications = create<PresentedNotificationsState>()((set) => ({
  ids: new Set<string>(),
  identity: null,

  recordAll: (ids) =>
    set((state) => {
      const next = new Set(state.ids);

      for (const id of ids) {
        next.add(id);
      }

      return { ids: next };
    }),

  adopt: (identity) =>
    set((state) => {
      if (state.identity === identity) return state;
      // An unclaimed ledger holds this session's own presentations, so it is kept, not wiped.
      if (state.identity === null) return { identity };
      return { ids: new Set<string>(), identity };
    }),

  clear: () => set({ ids: new Set<string>(), identity: null }),
}));

/** Marks feed rows as surfaced so no later poll or merge can announce them again. */
export function recordPresentedNotifications(items: readonly NotificationFeedItem[]) {
  if (items.length === 0) return;

  usePresentedNotifications.getState().recordAll(items.map((item) => item.publicId));
}

/** Rows never surfaced yet, keeping the newest-first order they arrived in. */
export function unpresentedNotifications(
  items: readonly NotificationFeedItem[],
): readonly NotificationFeedItem[] {
  const presented = usePresentedNotifications.getState().ids;

  return items.filter((item) => !presented.has(item.publicId));
}

/**
 * The one arrival a batch may announce — its newest high-importance row. Normal importance waits
 * in the bell, unknown types have nothing renderable to say, and a catch-up after a hidden
 * stretch collapses into a single card instead of bursting.
 */
export function planArrivalToast(
  tier: NotificationTier,
  arrivals: readonly NotificationFeedItem[],
): ToastRequest | null {
  const announcement = arrivals.find(
    (item) => knownNotificationEntry(tier, item)?.importance === "high",
  );

  if (!announcement) {
    return null;
  }

  return {
    tier,
    typeKey: announcement.typeKey,
    typeVersion: announcement.typeVersion,
    params: announcement.params,
  };
}
