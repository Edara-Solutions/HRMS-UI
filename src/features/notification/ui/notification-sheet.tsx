import { Settings2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { useBodyScrollLock } from "../lib/use-body-scroll-lock";
import { useNotificationCenter } from "../lib/use-notification-center";
import { useOverlayDismiss } from "../lib/use-overlay-dismiss";
import type { NotificationShapeProps } from "../model/notification-shape";
import { NotificationBucketList } from "./notification-bucket-list";
import { NotificationFeedStatus } from "./notification-feed-status";
import { NotificationLifecycleAlert } from "./notification-lifecycle-alert";
import { NotificationStylePicker } from "./notification-style-picker";

/** The end-side sheet: the notification center as a place to sit and work through the feed. */
export function NotificationSheet({
  open,
  overlayId,
  overlayRef,
  triggerRef,
  view,
  onClose,
  onViewChange,
}: NotificationShapeProps) {
  const { t } = useTranslation("notification", { useSuspense: false });
  const center = useNotificationCenter(open);

  useOverlayDismiss({ open, overlayRef, triggerRef, onClose });
  useBodyScrollLock(open);

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--color-text)_32%,transparent)] transition-[opacity,visibility] ease-[var(--motion-easing)]",
          open
            ? "visible opacity-100 duration-[var(--motion-base)]"
            : "pointer-events-none invisible opacity-0 duration-[var(--motion-fast)]",
        )}
      />
      <div
        ref={overlayRef}
        id={overlayId}
        role="dialog"
        aria-modal="true"
        aria-label={t("panel.title")}
        tabIndex={-1}
        inert={!open}
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 end-0 z-50 flex w-[420px] max-w-[calc(100vw-32px)] flex-col overflow-hidden border-s border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] outline-none",
          // Slides in from the edge it is docked to; exit is shorter than entry.
          "transition-[transform,visibility] ease-[var(--motion-easing)]",
          open
            ? "visible translate-x-0 duration-[var(--motion-base)]"
            : "invisible duration-[var(--motion-fast)] ltr:translate-x-full rtl:-translate-x-full",
        )}
      >
        {view === "settings" ? (
          <NotificationStylePicker onBack={() => onViewChange("feed")} />
        ) : (
          <>
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
                {t("panel.title")}
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={!center.hasUnread}
                  isLoading={center.isMarkingAllRead}
                  onClick={() => center.markAllRead(() => overlayRef.current?.focus())}
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
                <Button
                  intent="toggle"
                  size="iconXs"
                  title={t("sheet.close")}
                  aria-label={t("sheet.close")}
                  onClick={() => {
                    onClose();
                    triggerRef.current?.focus();
                  }}
                  leadingIcon={<X size={14} />}
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
                density="roomy"
                onActivate={(row) => {
                  if (row.state !== "read") center.markRead(row.item.id);
                  onClose();
                }}
                onMarkRead={(row) => center.markRead(row.item.id)}
              />
            </div>

            {center.hasNextPage ? (
              <footer className="shrink-0 border-t border-[var(--color-border)] p-2">
                <Button
                  variant="ghost"
                  size="block"
                  isLoading={center.isFetchingNextPage}
                  onClick={center.fetchNextPage}
                >
                  {t("panel.showOlder")}
                </Button>
              </footer>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
