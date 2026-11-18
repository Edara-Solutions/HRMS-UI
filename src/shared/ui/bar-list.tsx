export interface BarListRow {
  key: string;
  label: string;
  value: number;
}

export function BarList({ rows }: { rows: readonly BarListRow[] }) {
  const largest = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_2.5rem] items-center gap-3"
        >
          <span className="truncate text-[13px] text-[var(--color-text)]">{row.label}</span>
          <span
            aria-hidden="true"
            className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
          >
            <span
              className="block h-full rounded-full bg-[var(--color-primary)] opacity-80"
              style={{ width: `${(row.value / largest) * 100}%` }}
            />
          </span>
          <span className="text-end text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
