import { Bell } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { useUnreadNotificationCount } from "../api/unread-count";
import { NotificationPanel } from "./notification-panel";

const BADGE_COUNT_CAP = 99;

export function NotificationBell() {
  const { t } = useTranslation("notification");
  const { data } = useUnreadNotificationCount();
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;

    panelRef.current?.focus();

    function closeAndRestoreFocus() {
      setOpen(false);
      bellRef.current?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAndRestoreFocus();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
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
        aria-label={
          unreadCount > 0
            ? `${t("panel.title")}, ${t("panel.unread", { count: unreadCount })}`
            : t("panel.title")
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
        leadingIcon={<Bell size={16} />}
        iconOnly
      />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-1 text-[10px] font-semibold leading-none tabular-nums text-[var(--color-on-primary)] ring-2 ring-[var(--color-bg)]"
        >
          {formatBadgeCount(unreadCount)}
        </span>
      )}

      <NotificationPanel
        open={open}
        panelId={panelId}
        panelRef={panelRef}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function formatBadgeCount(count: number) {
  return count > BADGE_COUNT_CAP ? `${BADGE_COUNT_CAP}+` : String(count);
}
