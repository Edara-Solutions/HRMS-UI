import { useEffect } from "react";
import { fetchNotificationFeed } from "../api/notification-transport";
import {
  planArrivalToast,
  recordPresentedNotifications,
  unpresentedNotifications,
  usePresentedNotifications,
} from "../model/notification-arrivals";
import { scopeKey, useNotificationScope } from "../model/notification-tier";
import { IDLE_POLL_INTERVAL_MS } from "../model/poll-cadence";
import { useToastStore } from "../model/toast-store";

/**
 * Watches the feed while the panel is closed and hands high-importance arrivals to the toaster.
 * A baseline sweep on mount presents whatever the feed already held, so only rows that land
 * afterwards are candidates; ticks walk a `since` cursor and pause while the tab is hidden, so a
 * catch-up on return announces at most one card instead of bursting the backlog.
 */
export function useNotificationArrivals() {
  const scope = useNotificationScope();
  const tier = scope?.tier ?? null;
  const identity = scope ? scopeKey(scope) : null;
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    if (!tier || !identity) return;

    // A new identity starts with an empty ledger: what another identity saw is not its history.
    usePresentedNotifications.getState().adopt(identity);

    let disposed = false;
    let inFlight = false;
    let cursor: string | null = null;

    const poll = async () => {
      if (disposed || inFlight || document.hidden) return;

      inFlight = true;

      try {
        const page = await fetchNotificationFeed(tier, cursor ? { since: cursor } : {});

        if (disposed) return;

        if (cursor === null) {
          // What the feed already held predates this watch and never announces.
          recordPresentedNotifications(page.items);
          cursor = page.items[0]?.createdAt ?? null;
          return;
        }

        const arrivals = unpresentedNotifications(page.items);
        recordPresentedNotifications(page.items);

        if (page.items[0]) cursor = page.items[0].createdAt;

        const announcement = planArrivalToast(tier, arrivals);
        if (announcement) showToast(announcement);
      } catch {
        // The cursor stands; the next tick retries from where this one stalled.
      } finally {
        inFlight = false;
      }
    };

    const catchUp = () => void poll();
    const onVisibilityChange = () => {
      if (!document.hidden) catchUp();
    };

    const timer = setInterval(catchUp, IDLE_POLL_INTERVAL_MS);
    window.addEventListener("focus", catchUp);
    document.addEventListener("visibilitychange", onVisibilityChange);
    catchUp();

    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("focus", catchUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [tier, identity, showToast]);
}
