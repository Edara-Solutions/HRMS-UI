import { Check, Search } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { TruncatedText } from "@/shared/ui/truncated-text";
import { auditNamespace } from "../model/audit-text";
import { AuditFilterPopover } from "./audit-filter-popover";

export interface AuditFilterOption {
  value: string;
  label: string;
  /** A second line — a company code, an actor's role — never the only way to tell two apart. */
  hint?: string;
}

export type AuditFilterComboboxState = "ready" | "loading" | "error" | "prompt";

/** Reads a options query's phase as the state the panel renders. */
export function auditFilterComboboxState(query: {
  isPending: boolean;
  isError: boolean;
}): AuditFilterComboboxState {
  if (query.isError) return "error";
  return query.isPending ? "loading" : "ready";
}

interface AuditFilterComboboxProps {
  id: string;
  label: string;
  searchPlaceholder: string;
  /** The chosen value in words, so a URL carrying only an id still reads as a name. */
  summary?: string;
  value?: string;
  options: AuditFilterOption[];
  state: AuditFilterComboboxState;
  /** Called as the reader types, for a control whose options come from the server. */
  onQueryChange?: (query: string) => void;
  onSelect: (option: AuditFilterOption) => void;
  onClear: () => void;
}

/** A one-of-many filter picked by name — the only alternative to typing an identifier. */
export function AuditFilterCombobox({
  id,
  label,
  searchPlaceholder,
  summary,
  value,
  options,
  state,
  onQueryChange,
  onSelect,
  onClear,
}: AuditFilterComboboxProps) {
  const { t } = useTranslation(auditNamespace);
  const [query, setQuery] = useState("");
  const listboxId = useId();
  const searchId = `${id}-search`;
  const matches = onQueryChange ? options : filterByQuery(options, query);

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery);
    onQueryChange?.(nextQuery);
  }

  return (
    <AuditFilterPopover id={id} label={label} summary={summary} onClear={onClear}>
      {(close) => (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search
              size={13}
              aria-hidden="true"
              className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
            />
            <Input
              id={searchId}
              autoFocus
              role="combobox"
              aria-label={searchPlaceholder}
              aria-expanded
              aria-controls={listboxId}
              aria-autocomplete="list"
              className="ps-8"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
            />
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="scrollbar-calm -mx-1 flex max-h-56 flex-col overflow-y-auto px-1"
          >
            {state === "ready" && matches.length > 0 ? (
              matches.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-start transition-colors hover:bg-[var(--color-surface-2)]",
                    option.value === value && "bg-[var(--color-primary-soft)]",
                  )}
                  onClick={() => {
                    onSelect(option);
                    setQuery("");
                    close();
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <TruncatedText
                      text={option.label}
                      focusable={false}
                      className="text-[13px] text-[var(--color-text)]"
                    />
                    {option.hint ? (
                      <TruncatedText
                        text={option.hint}
                        focusable={false}
                        className="text-[11px] text-[var(--color-text-faint)]"
                      />
                    ) : null}
                  </span>
                  {option.value === value ? (
                    <Check size={13} className="shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-2 py-1.5 text-[12px] text-[var(--color-text-muted)]">
                {t(comboboxNoticeKey(state))}
              </p>
            )}
          </div>
        </div>
      )}
    </AuditFilterPopover>
  );
}

/** What the panel says instead of options — a ready list with nothing in it simply has no matches. */
function comboboxNoticeKey(state: AuditFilterComboboxState): string {
  if (state === "loading") return "chrome.filterSearching";
  if (state === "error") return "chrome.filterOptionsUnavailable";
  if (state === "prompt") return "chrome.filterTypeToSearch";
  return "chrome.filterNoMatches";
}

function filterByQuery(options: AuditFilterOption[], query: string): AuditFilterOption[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return options;

  return options.filter((option) =>
    `${option.label} ${option.hint ?? ""}`.toLocaleLowerCase().includes(normalized),
  );
}
