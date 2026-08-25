import { Bell } from "lucide-react";
import { type ComponentType, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type NotificationListStyle, usePreferencesStore } from "@/shared/config";
import { Button } from "@/shared/ui/button";
import { useUnreadNotificationCount } from "../api/unread-count";
import { useNotificationCenter } from "../lib/use-notification-center";
import type { NotificationCenterView, NotificationShapeProps } from "../model/notification-shape";
import { NotificationFlat } from "./notification-flat";
import { NotificationPanel } from "./notification-panel";
import { NotificationSheet } from "./notification-sheet";

const BADGE_COUNT_CAP = 99;

const shapeComponent: Record<NotificationListStyle, ComponentType<NotificationShapeProps>> = {
  panel: NotificationPanel,
  sheet: NotificationSheet,
  flat: NotificationFlat,
};

export function NotificationBell() {
  const { t } = useTranslation("notification", { useSuspense: false });
  const { data } = useUnreadNotificationCount();
  const listStyle = usePreferencesStore((preferences) => preferences.notificationListStyle);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<NotificationCenterView>("feed");
  const bellRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayId = useId();

  const center = useNotificationCenter(open);
  const unreadCount = data?.unreadCount ?? 0;
  const label = t("panel.title");
  const Shape = shapeComponent[listStyle];

  function close() {
    setOpen(false);
    setView("feed");
  }

  // The view outlives the shape on purpose: picking a style in the picker swaps the shape
  // around it, which is what makes the choice something the reader can see rather than guess.
  const shapeProps: NotificationShapeProps = {
    open,
    center,
    overlayId,
    overlayRef,
    triggerRef: bellRef,
    view,
    onClose: close,
    onViewChange: setView,
  };

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
        aria-controls={overlayId}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
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

      <Shape {...shapeProps} />
    </div>
  );
}

function formatBadgeCount(count: number) {
  return count > BADGE_COUNT_CAP ? `${BADGE_COUNT_CAP}+` : String(count);
}
