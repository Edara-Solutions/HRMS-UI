import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id: string;
  value?: string;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  onValueChange: (value: string | undefined) => void;
  allowClear?: boolean;
}

export function SearchableSelect({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  onValueChange,
  allowClear = false,
}: SearchableSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = normalizedQuery
    ? options.filter(
        (option) =>
          option.value.toLowerCase().includes(normalizedQuery) ||
          option.label.toLowerCase().includes(normalizedQuery),
      )
    : options;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function selectOption(nextValue: string) {
    onValueChange(nextValue);
    setQuery("");
    setOpen(false);
  }

  function clearValue() {
    onValueChange(undefined);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          "flex h-[34px] w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] ps-3 pe-2.5 text-[13px] text-[var(--color-text)] outline-none transition-colors focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--color-primary)_50%,var(--color-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]",
          open && "border-[var(--color-primary)]",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-start",
            !selectedOption && "text-[var(--color-text-faint)]",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-[var(--color-text-muted)] transition-transform duration-[var(--motion-fast)]",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-[70] mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-md)]"
        >
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              placeholder={searchPlaceholder}
              autoFocus
              className="ps-7"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="scrollbar-calm mt-2 max-h-52 overflow-y-auto">
            {allowClear && value && (
              <Button
                intent="utility"
                type="button"
                size="sm"
                leadingIcon={<X size={13} />}
                className="mb-1 w-full justify-start"
                onClick={clearValue}
              >
                Clear selection
              </Button>
            )}
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectOption(option.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-start text-[13px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-2)]",
                      isSelected && "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check size={14} className="shrink-0" aria-hidden="true" />}
                  </button>
                );
              })
            ) : (
              <p className="px-2.5 py-3 text-center text-xs text-[var(--color-text-faint)]">
                {emptyText}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
