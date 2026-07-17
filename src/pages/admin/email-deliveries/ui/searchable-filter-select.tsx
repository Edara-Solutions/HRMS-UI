import { Check, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { DeliveryFilterOption } from "../api/delivery-filter-options";

interface SearchableFilterSelectProps {
  id: string;
  label: string;
  options: DeliveryFilterOption[] | undefined;
  value: string;
  placeholder: string;
  loading: boolean;
  error: boolean;
  onValueChange: (value: string) => void;
}

/** Reusable searchable selector for safe delivery-history filter values. */
export function SearchableFilterSelect({
  id,
  label,
  options,
  value,
  placeholder,
  loading,
  error,
  onValueChange,
}: SearchableFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options?.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = useMemo(
    () =>
      (options ?? []).filter((option) =>
        option.searchText.toLocaleLowerCase().includes(normalizedQuery),
      ),
    [options, normalizedQuery],
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target))
        setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectOption(option: DeliveryFilterOption) {
    onValueChange(option.value);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative min-h-[74px]">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <Search
          size={14}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
          aria-hidden="true"
        />
        <Input
          id={id}
          className="ps-8 pe-8"
          value={open ? query : (selected?.code ?? "")}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              selectOption(results[0]);
            }
          }}
        />
        {value ? (
          <Button
            variant="ghost"
            size="iconXs"
            className="absolute end-0.5 top-1/2 -translate-y-1/2"
            aria-label={`Clear ${label}`}
            onClick={() => onValueChange("")}
          >
            <X size={14} />
          </Button>
        ) : null}
      </div>
      <div className="mt-1 min-h-5 text-[11px] text-[var(--color-text-muted)]">
        {selected && !open ? (
          <span className="inline-flex max-w-full items-center">
            <span className="truncate">
              <code className="font-semibold text-[var(--color-primary)]">{selected.code}</code>
              <span aria-hidden="true"> · </span>
              {selected.label}
            </span>
          </span>
        ) : null}
      </div>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="scrollbar-calm absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-md)]"
        >
          {loading ? (
            <p className="px-2.5 py-2 text-xs text-[var(--color-text-muted)]">Loading…</p>
          ) : null}
          {error ? (
            <p className="px-2.5 py-2 text-xs text-[var(--color-danger)]">Options unavailable.</p>
          ) : null}
          {!loading && !error && results.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-[var(--color-text-muted)]">
              No matching options.
            </p>
          ) : null}
          {!loading && !error
            ? results.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-start transition-colors hover:bg-[var(--color-surface-2)]",
                    option.value === value && "bg-[var(--color-primary-soft)]",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  <span className="min-w-0">
                    <code className="block truncate text-xs font-semibold text-[var(--color-primary)]">
                      {option.code}
                    </code>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">
                      {option.label}
                    </span>
                  </span>
                  {option.value === value ? (
                    <Check size={14} className="shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
