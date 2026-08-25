import { BellOff } from "lucide-react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import type { NotificationFeedItem } from "../api/notification-feed";
import { useNotificationFeed } from "../api/notification-feed";
import { NOTIFICATION_CATALOG } from "../model/notification-catalog";
import { RECENCY_BUCKETS, type RecencyBucket, recencyBucketOf } from "../model/recency-bucket";
import { NotificationRow } from "./notification-row";

interface NotificationPanelProps {
  open: boolean;
  panelId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function NotificationPanel({ open, panelId, panelRef, onClose }: NotificationPanelProps) {
  const { t } = useTranslation("notification", { useSuspense: false });
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotificationFeed(open);

  // A type the mirror does not know cannot be rendered, and must not leave an empty bucket behind.
  const items = (data ?? []).filter((item) => NOTIFICATION_CATALOG.has(item.typeKey));

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
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
          {t("panel.title")}
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? <PanelMessage>{t("panel.loading")}</PanelMessage> : null}
        {isError ? <PanelMessage>{t("panel.error")}</PanelMessage> : null}
        {!isPending && !isError && items.length === 0 ? (
          <EmptyFeed title={t("panel.empty.title")} hint={t("panel.empty.hint")} />
        ) : null}

        {RECENCY_BUCKETS.map((bucket) => (
          <BucketSection
            key={bucket}
            bucket={bucket}
            label={t(`panel.buckets.${bucket}`)}
            items={items.filter((item) => recencyBucketOf(item.createdAt) === bucket)}
            onNavigate={onClose}
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
  items: NotificationFeedItem[];
  onNavigate: () => void;
}

function BucketSection({ bucket, label, items, onNavigate }: BucketSectionProps) {
  if (items.length === 0) {
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
        {items.map((item) => (
          <NotificationRow key={item.id} item={item} onNavigate={onNavigate} />
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
