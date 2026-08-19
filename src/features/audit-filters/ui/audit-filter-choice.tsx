import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { AuditFilterPopover } from "./audit-filter-popover";

export interface AuditFilterChoiceOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface AuditFilterChoiceProps<TValue extends string> {
  id: string;
  label: string;
  options: readonly AuditFilterChoiceOption<TValue>[];
  value?: TValue;
  onChange: (value: TValue | undefined) => void;
}

/** A filter over a handful of fixed values — the closed-set counterpart of the combobox. */
export function AuditFilterChoice<TValue extends string>({
  id,
  label,
  options,
  value,
  onChange,
}: AuditFilterChoiceProps<TValue>) {
  const selected = options.find((option) => option.value === value);

  return (
    <AuditFilterPopover
      id={id}
      label={label}
      summary={selected?.label}
      onClear={() => onChange(undefined)}
    >
      {(close) => (
        <ul role="listbox" aria-label={label} className="-mx-1 flex flex-col px-1">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-start text-[13px] transition-colors hover:bg-[var(--color-surface-2)]",
                  option.value === value
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)]",
                )}
                onClick={() => {
                  onChange(option.value === value ? undefined : option.value);
                  close();
                }}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.value === value ? (
                  <Check size={13} className="shrink-0 text-[var(--color-primary)]" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </AuditFilterPopover>
  );
}
