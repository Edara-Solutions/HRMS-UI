export interface ActivityFeedItem {
  id: string;
  title: string;
  meta: string;
}

export function ActivityFeed({ items }: { items: readonly ActivityFeedItem[] }) {
  return (
    <ul className="px-4 py-3">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-2.5 pb-3.5 last:pb-0">
          {index < items.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute bottom-[-6px] start-[3px] top-[14px] w-px bg-[var(--color-border)]"
            />
          )}
          <span
            aria-hidden="true"
            className="z-10 mt-1.5 size-2 shrink-0 rounded-full bg-[var(--color-primary)] opacity-80"
          />
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium leading-snug text-[var(--color-text)]">
              {item.title}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
              <bdi>{item.meta}</bdi>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
