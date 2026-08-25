import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { useOverlayDismiss } from "../lib/use-overlay-dismiss";
import type { NotificationShapeProps } from "../model/notification-shape";
import { NotificationBucketList } from "./notification-bucket-list";
import { NotificationFeedStatus } from "./notification-feed-status";
import { NotificationLifecycleAlert } from "./notification-lifecycle-alert";
import { NotificationOlderFooter } from "./notification-older-footer";
import { NotificationStylePicker } from "./notification-style-picker";

/** The anchored dropdown: the notification center for a quick glance without leaving the page. */
export function NotificationPanel({
  open,
  center,
  overlayId,
  overlayRef,
  triggerRef,
  view,
  onClose,
  onViewChange,
}: NotificationShapeProps) {
  const { t } = useTranslation("notification", { useSuspense: false });

  useOverlayDismiss({ open, overlayRef, triggerRef, onClose });

  return (
    <div
      ref={overlayRef}
      id={overlayId}
      role="dialog"
      aria-label={t("panel.title")}
      tabIndex={-1}
      inert={!open}
      aria-hidden={!open}
      className={cn(
        "absolute top-[calc(100%+8px)] end-0 z-40 flex max-h-[min(560px,calc(100dvh-88px))] w-[384px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] outline-none",
        // Scales out of the bell it hangs from; exit is shorter than entry.
        "origin-top transition-[transform,opacity,visibility] ease-[var(--motion-easing)] ltr:origin-top-right rtl:origin-top-left",
        open
          ? "visible translate-y-0 scale-100 opacity-100 duration-[var(--motion-base)]"
          : "pointer-events-none invisible -translate-y-1 scale-[0.98] opacity-0 duration-[var(--motion-fast)]",
      )}
    >
      {view === "settings" ? (
        <NotificationStylePicker onBack={() => onViewChange("feed")} />
      ) : (
        <>
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
              {t("panel.title")}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="xs"
                disabled={!center.hasUnread}
                isLoading={center.isMarkingAllRead}
                onClick={() =>
                  // The affordance disables itself once the feed is clear, so focus is handed
                  // back to the dialog rather than left on a button that has left the tab order.
                  center.markAllRead(() => overlayRef.current?.focus())
                }
              >
                {t("panel.markAllRead")}
              </Button>
              <Button
                intent="toggle"
                size="iconXs"
                title={t("picker.open")}
                aria-label={t("picker.open")}
                onClick={() => onViewChange("settings")}
                leadingIcon={<Settings2 size={14} />}
                iconOnly
              />
            </div>
          </header>

          <NotificationLifecycleAlert failed={center.lifecycleFailed} />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <NotificationFeedStatus
              isPending={center.isPending}
              isError={center.isError}
              isEmpty={center.rows.length === 0}
            />
            <NotificationBucketList
              rows={center.rows}
              onActivate={(row) => {
                center.activate(row);
                onClose();
              }}
            />
          </div>

          <NotificationOlderFooter center={center} />
        </>
      )}
    </div>
  );
}
