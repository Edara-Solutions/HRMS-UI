import { useTranslation } from "react-i18next";
import type { NotificationRowModel } from "../lib/use-notification-center";
import { RECENCY_BUCKETS, type RecencyBucket, recencyBucketOf } from "../model/recency-bucket";
import { NotificationRow } from "./notification-row";

interface NotificationBucketListProps {
  rows: readonly NotificationRowModel[];
  onActivate: (row: NotificationRowModel) => void;
  /** Passed on to every row that can still be read; absent leaves rows without the control. */
  onMarkRead?: (row: NotificationRowModel) => void;
  density?: "compact" | "roomy";
}

/** The feed under calendar-day headings — how the panel and the sheet both group their rows. */
export function NotificationBucketList({
  rows,
  onActivate,
  onMarkRead,
  density,
}: NotificationBucketListProps) {
  const { t } = useTranslation("notification", { useSuspense: false });

  return (
    <>
      {RECENCY_BUCKETS.map((bucket) => (
        <BucketSection
          key={bucket}
          bucket={bucket}
          label={t(`panel.buckets.${bucket}`)}
          rows={rows.filter((row) => recencyBucketOf(row.item.createdAt) === bucket)}
          onActivate={onActivate}
          onMarkRead={onMarkRead}
          density={density}
        />
      ))}
    </>
  );
}

interface BucketSectionProps {
  bucket: RecencyBucket;
  label: string;
  rows: readonly NotificationRowModel[];
  onActivate: (row: NotificationRowModel) => void;
  onMarkRead?: (row: NotificationRowModel) => void;
  density?: "compact" | "roomy";
}

function BucketSection({
  bucket,
  label,
  rows,
  onActivate,
  onMarkRead,
  density,
}: BucketSectionProps) {
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
            onMarkRead={onMarkRead ? () => onMarkRead(row) : undefined}
            density={density}
          />
        ))}
      </ul>
    </section>
  );
}
