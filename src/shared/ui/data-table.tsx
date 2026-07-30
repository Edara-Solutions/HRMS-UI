import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface DataTableColumn<TItem> {
  id: string;
  header: ReactNode;
  cell: (item: TItem) => ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<TItem> {
  items: Array<TItem>;
  columns: Array<DataTableColumn<TItem>>;
  getRowKey: (item: TItem) => string;
  minWidth?: string;
  mobileBreakpoint?: "sm" | "md" | "lg";
  renderMobileItem?: (item: TItem) => ReactNode;
  className?: string;
}

const alignClassName: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
};

const desktopDisplayClassName = {
  sm: "sm:block",
  md: "md:block",
  lg: "lg:block",
};

const mobileDisplayClassName = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
};

export function DataTable<TItem>({
  items,
  columns,
  getRowKey,
  minWidth = "800px",
  mobileBreakpoint = "lg",
  renderMobileItem,
  className,
}: DataTableProps<TItem>) {
  const table = (
    <div
      className={cn(
        "scrollbar-calm overflow-x-auto",
        renderMobileItem && "hidden",
        renderMobileItem && desktopDisplayClassName[mobileBreakpoint],
      )}
    >
      <table className={cn("w-full border-collapse", className)} style={{ minWidth }}>
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                  alignClassName[column.align ?? "start"],
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={getRowKey(item)}
              className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    "px-4 py-3 align-middle text-[13px] text-[var(--color-text-muted)]",
                    alignClassName[column.align ?? "start"],
                    column.className,
                  )}
                >
                  {column.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!renderMobileItem) return table;

  return (
    <>
      <div
        className={cn(
          "divide-y divide-[var(--color-border)]",
          mobileDisplayClassName[mobileBreakpoint],
        )}
      >
        {items.map((item) => (
          <div key={getRowKey(item)}>{renderMobileItem(item)}</div>
        ))}
      </div>
      {table}
    </>
  );
}
