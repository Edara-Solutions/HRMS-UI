import { CheckCheck, Settings2 } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { getDirection } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { nextRovingChoice } from "../lib/roving-choice";
import { useNotificationCenter } from "../lib/use-notification-center";
import { useOverlayDismiss } from "../lib/use-overlay-dismiss";
import type { NotificationShapeProps } from "../model/notification-shape";
import { NotificationFeedStatus } from "./notification-feed-status";
import { NotificationLifecycleAlert } from "./notification-lifecycle-alert";
import { NotificationRow } from "./notification-row";
import { NotificationStylePicker } from "./notification-style-picker";

const FEED_FILTERS = ["all", "unread"] as const;

type FeedFilter = (typeof FEED_FILTERS)[number];

/** The compact list: newest first, no day headings, and a filter for the unread pile. */
export function NotificationFlat({
  open,
  overlayId,
  overlayRef,
  triggerRef,
  view,
  onClose,
  onViewChange,
}: NotificationShapeProps) {
  const { t } = useTranslation("notification", { useSuspense: false });
  const locale = usePreferencesStore((preferences) => preferences.locale);
  const center = useNotificationCenter(open);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const filtersRef = useRef<HTMLDivElement>(null);

  useOverlayDismiss({ open, overlayRef, triggerRef, onClose });

  function onFilterKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextRovingChoice(event.key, getDirection(locale), FEED_FILTERS, filter);
    if (!next) return;

    event.preventDefault();
    setFilter(next);
    filtersRef.current?.querySelector<HTMLButtonElement>(`[data-filter="${next}"]`)?.focus();
  }

  const rows =
    filter === "unread" ? center.rows.filter((row) => row.state !== "read") : center.rows;

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
        "absolute top-[calc(100%+8px)] end-0 z-40 flex max-h-[min(560px,calc(100dvh-88px))] w-[352px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] outline-none",
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
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2.5">
            <div
              ref={filtersRef}
              role="radiogroup"
              aria-label={t("filter.label")}
              onKeyDown={onFilterKeyDown}
              className="flex items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-0.5"
            >
              {FEED_FILTERS.map((option) => (
                <FilterSegment
                  key={option}
                  filter={option}
                  label={t(`filter.${option}`)}
                  selected={filter === option}
                  onSelect={() => setFilter(option)}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                intent="toggle"
                size="iconXs"
                title={t("panel.markAllRead")}
                aria-label={t("panel.markAllRead")}
                disabled={!center.hasUnread}
                isLoading={center.isMarkingAllRead}
                onClick={() => center.markAllRead(() => overlayRef.current?.focus())}
                leadingIcon={<CheckCheck size={14} />}
                iconOnly
              />
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
              isEmpty={rows.length === 0}
            />
            <ul>
              {rows.map((row) => (
                <NotificationRow
                  key={row.item.id}
                  item={row.item}
                  state={row.state}
                  onActivate={() => {
                    if (row.state !== "read") center.markRead(row.item.id);
                    onClose();
                  }}
                  onMarkRead={() => center.markRead(row.item.id)}
                />
              ))}
            </ul>
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
  );
}

interface FilterSegmentProps {
  filter: FeedFilter;
  label: string;
  selected: boolean;
  onSelect: () => void;
}

/** One segment of the track: the chosen one lifts onto the surface rather than filling with hue. */
function FilterSegment({ filter, label, selected, onSelect }: FilterSegmentProps) {
  return (
    <button
      type="button"
      role="radio"
      data-filter={filter}
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        // One weight in both states: a segment that thickens when chosen shifts the track's
        // widths under the pointer, and the fill already says which one is on.
        "cursor-pointer rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12px] font-medium leading-none transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]",
        selected
          ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]"
          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {label}
    </button>
  );
}
