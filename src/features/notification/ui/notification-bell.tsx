import { Bell } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { useUnreadNotificationCount } from "../api/unread-count";
import { NotificationPanel } from "./notification-panel";

const BADGE_COUNT_CAP = 99;

const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function NotificationBell() {
  const { t } = useTranslation("notification", { useSuspense: false });
  const { data } = useUnreadNotificationCount();
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const unreadCount = data?.unreadCount ?? 0;
  const label = t("panel.title");

  useEffect(() => {
    if (!open) return;

    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        bellRef.current?.focus();
        return;
      }

      if (event.key === "Tab") keepFocusInPanel(event, panelRef.current);
    }

    // Focus stays where the click landed; only Escape hands it back to the bell.
    function onPointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || bellRef.current?.contains(target)) return;

      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <Button
        ref={bellRef}
        intent="toggle"
        size="iconSm"
        title={label}
        aria-label={
          unreadCount > 0 ? `${label}, ${t("panel.unread", { count: unreadCount })}` : label
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
        leadingIcon={<Bell size={16} />}
        iconOnly
      />
      {unreadCount > 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-1 text-[10px] font-semibold leading-none tabular-nums text-[var(--color-on-primary)] ring-2 ring-[var(--color-bg)]"
        >
          {formatBadgeCount(unreadCount)}
        </span>
      ) : null}

      <NotificationPanel
        open={open}
        panelId={panelId}
        panelRef={panelRef}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

/** Tab cycles inside the open dialog instead of walking off into the page behind it. */
function keepFocusInPanel(event: KeyboardEvent, panel: HTMLDivElement | null) {
  if (!panel) return;

  const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];

  if (focusable.length === 0) {
    event.preventDefault();
    panel.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const atEdge = event.shiftKey
    ? document.activeElement === first
    : document.activeElement === last;

  if (!atEdge) return;

  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}

function formatBadgeCount(count: number) {
  return count > BADGE_COUNT_CAP ? `${BADGE_COUNT_CAP}+` : String(count);
}
