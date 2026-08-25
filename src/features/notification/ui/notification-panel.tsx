import { BellOff } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import type { NotificationFeedItem } from "../api/notification-feed";
import { useNotificationFeed } from "../api/notification-feed";
import {
  SEEN_BATCH_LIMIT,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMarkNotificationsSeen,
} from "../api/notification-lifecycle";
import { NOTIFICATION_CATALOG } from "../model/notification-catalog";
import {
  type NotificationRowState,
  notificationRowState,
  useBulkReadCursor,
} from "../model/notification-read-state";
import { RECENCY_BUCKETS, type RecencyBucket, recencyBucketOf } from "../model/recency-bucket";
import { NotificationRow } from "./notification-row";

interface NotificationPanelProps {
  open: boolean;
  panelId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

interface NotificationRowModel {
  readonly item: NotificationFeedItem;
  readonly state: NotificationRowState;
}

export function NotificationPanel({ open, panelId, panelRef, onClose }: NotificationPanelProps) {
  const { t } = useTranslation("notification", { useSuspense: false });
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotificationFeed(open);
  const bulkReadCursorAt = useBulkReadCursor((cursor) => cursor.cursorAt);
  const markSeen = useMarkNotificationsSeen();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // A type the mirror does not know cannot be rendered, and must not leave an empty bucket behind.
  const rows: NotificationRowModel[] = (data ?? [])
    .filter((item) => NOTIFICATION_CATALOG.has(item.typeKey))
    .map((item) => ({ item, state: notificationRowState(item, bulkReadCursorAt) }));

  const hasUnread = rows.some((row) => row.state !== "read");
  const lifecycleFailed = markSeen.isError || markRead.isError || markAllRead.isError;
  const unseenIds = rows.filter((row) => row.state === "unseen").map((row) => row.item.id);
  const unseenKey = unseenIds.join(",");
  const seenSent = useRef(false);

  useEffect(() => {
    if (!open) {
      seenSent.current = false;
      return;
    }

    if (seenSent.current || unseenIds.length === 0) return;

    // Reopening with nothing unseen left never reaches this point, which is what keeps the
    // contract at one request per open rather than one per render.
    seenSent.current = true;
    markSeen.mutate(unseenIds.slice(0, SEEN_BATCH_LIMIT));
    // Keyed on the id list rather than the feed object: the rows re-render far more often than
    // their identities change, and only a changed identity can owe a request.
  }, [open, unseenKey]);

  return (
    <div
      ref={panelRef}
      id={panelId}
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
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
          {t("panel.title")}
        </h2>
        <Button
          variant="ghost"
          size="xs"
          disabled={!hasUnread}
          isLoading={markAllRead.isPending}
          onClick={() =>
            markAllRead.mutate(undefined, {
              // The affordance disables itself once the feed is clear, so focus is handed back
              // to the dialog rather than left on a button that has left the tab order.
              onSuccess: () => panelRef.current?.focus(),
            })
          }
        >
          {t("panel.markAllRead")}
        </Button>
      </header>

      {lifecycleFailed ? (
        <p
          role="alert"
          className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-danger-soft)] px-4 py-2 text-xs text-[var(--color-danger)]"
        >
          {t("panel.actionError")}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? <PanelMessage>{t("panel.loading")}</PanelMessage> : null}
        {isError ? <PanelMessage>{t("panel.error")}</PanelMessage> : null}
        {!isPending && !isError && rows.length === 0 ? (
          <EmptyFeed title={t("panel.empty.title")} hint={t("panel.empty.hint")} />
        ) : null}

        {RECENCY_BUCKETS.map((bucket) => (
          <BucketSection
            key={bucket}
            bucket={bucket}
            label={t(`panel.buckets.${bucket}`)}
            rows={rows.filter((row) => recencyBucketOf(row.item.createdAt) === bucket)}
            onActivate={(row) => {
              if (row.state !== "read") markRead.mutate(row.item.id);
              onClose();
            }}
          />
        ))}
      </div>

      {hasNextPage ? (
        <footer className="shrink-0 border-t border-[var(--color-border)] p-2">
          <Button
            variant="ghost"
            size="block"
            isLoading={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {t("panel.showOlder")}
          </Button>
        </footer>
      ) : null}
    </div>
  );
}

interface BucketSectionProps {
  bucket: RecencyBucket;
  label: string;
  rows: NotificationRowModel[];
  onActivate: (row: NotificationRowModel) => void;
}

function BucketSection({ bucket, label, rows, onActivate }: BucketSectionProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={`notification-bucket-${bucket}`}>
      <h3
        id={`notification-bucket-${bucket}`}
        className="sticky top-0 bg-[var(--color-surface)] px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]"
      >
        {label}
      </h3>
      <ul>
        {rows.map((row) => (
          <NotificationRow
            key={row.item.id}
            item={row.item}
            state={row.state}
            onActivate={() => onActivate(row)}
          />
        ))}
      </ul>
    </section>
  );
}

interface PanelMessageProps {
  children: string;
}

function PanelMessage({ children }: PanelMessageProps) {
  return (
    <p className="px-4 py-8 text-center text-[13px] text-[var(--color-text-muted)]">{children}</p>
  );
}

interface EmptyFeedProps {
  title: string;
  hint: string;
}

function EmptyFeed({ title, hint }: EmptyFeedProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-faint)]"
      >
        <BellOff size={16} />
      </span>
      <p className="text-[13px] font-medium text-[var(--color-text)]">{title}</p>
      <p className="max-w-[240px] text-xs leading-relaxed text-[var(--color-text-faint)]">{hint}</p>
    </div>
  );
}
