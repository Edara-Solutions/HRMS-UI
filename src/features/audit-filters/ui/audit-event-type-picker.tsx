import { Check, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { TruncatedText } from "@/shared/ui/truncated-text";
import { buildAuditEventTaxonomy } from "../model/audit-event-taxonomy";
import { auditGroupLabel, auditNamespace } from "../model/audit-text";
import { AuditFilterPopover } from "./audit-filter-popover";

interface AuditEventTypePickerProps {
  id: string;
  /** Every event type this trail's contract admits — the picker is only ever as wide as that. */
  eventTypes: readonly string[];
  selected: string[];
  onChange: (eventTypes: string[] | undefined) => void;
}

/**
 * Picks event types through their derived families. Selecting a family selects its members:
 * the wire carries no family, so a family is only ever shorthand for the types under it.
 */
export function AuditEventTypePicker({
  id,
  eventTypes,
  selected,
  onChange,
}: AuditEventTypePickerProps) {
  const { t } = useTranslation(auditNamespace);
  const [query, setQuery] = useState("");
  const taxonomy = useMemo(() => buildAuditEventTaxonomy(eventTypes), [eventTypes]);
  const selectedTypes = new Set(selected);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  function matchesQuery(eventType: string): boolean {
    if (!normalizedQuery) return true;
    return `${eventType} ${t(eventType)}`.toLocaleLowerCase().includes(normalizedQuery);
  }

  function commit(next: Set<string>) {
    onChange(next.size === 0 ? undefined : [...next].sort());
  }

  function toggleEventType(eventType: string) {
    const next = new Set(selectedTypes);
    if (!next.delete(eventType)) next.add(eventType);
    commit(next);
  }

  function toggleFamily(members: string[]) {
    const next = new Set(selectedTypes);
    const allSelected = members.every((member) => next.has(member));
    for (const member of members) {
      if (allSelected) next.delete(member);
      else next.add(member);
    }
    commit(next);
  }

  return (
    <AuditFilterPopover
      id={id}
      label={t("chrome.filterEventType")}
      summary={
        selected.length > 0
          ? t("chrome.filterTypesSelected", { count: selected.length })
          : undefined
      }
      onClear={() => onChange(undefined)}
    >
      {() => (
        <div className="flex flex-col gap-2">
          <Input
            aria-label={t("chrome.filterEventTypeSearch")}
            placeholder={t("chrome.filterEventTypeSearch")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="scrollbar-calm -mx-1 max-h-72 overflow-y-auto px-1">
            {taxonomy.map((domain) => {
              const families = domain.families
                .map((family) => ({
                  ...family,
                  eventTypes: family.eventTypes.filter(matchesQuery),
                }))
                .filter((family) => family.eventTypes.length > 0);
              if (families.length === 0) return null;

              return (
                <section key={domain.domain} className="mb-2 last:mb-0">
                  <h3 className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
                    {auditGroupLabel(t, domain.domain)}
                  </h3>
                  {families.map((family) => {
                    const selectedCount = family.eventTypes.filter((eventType) =>
                      selectedTypes.has(eventType),
                    ).length;

                    return (
                      <div key={family.family}>
                        <button
                          type="button"
                          aria-pressed={selectedCount === family.eventTypes.length}
                          className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-start transition-colors hover:bg-[var(--color-surface-2)]"
                          onClick={() => toggleFamily(family.eventTypes)}
                        >
                          <SelectionMark
                            checked={selectedCount === family.eventTypes.length}
                            partial={selectedCount > 0}
                          />
                          <TruncatedText
                            text={auditGroupLabel(t, family.family)}
                            focusable={false}
                            className="flex-1 text-[13px] font-medium text-[var(--color-text)]"
                          />
                          <span className="text-[11px] tabular-nums text-[var(--color-text-faint)]">
                            {family.eventTypes.length}
                          </span>
                        </button>
                        <ul className="ms-3 border-s border-[var(--color-border)] ps-1">
                          {family.eventTypes.map((eventType) => (
                            <li key={eventType}>
                              <button
                                type="button"
                                aria-pressed={selectedTypes.has(eventType)}
                                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-start transition-colors hover:bg-[var(--color-surface-2)]"
                                onClick={() => toggleEventType(eventType)}
                              >
                                <SelectionMark checked={selectedTypes.has(eventType)} />
                                <TruncatedText
                                  text={t(eventType)}
                                  focusable={false}
                                  className="text-[12px] text-[var(--color-text-muted)]"
                                />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>

          {selected.length > 0 ? (
            <Button intent="utility" size="xs" onClick={() => onChange(undefined)}>
              {t("chrome.filterClearSelection")}
            </Button>
          ) : null}
        </div>
      )}
    </AuditFilterPopover>
  );
}

interface SelectionMarkProps {
  checked: boolean;
  /** Some but not all of a family's types are chosen. */
  partial?: boolean;
}

function SelectionMark({ checked, partial = false }: SelectionMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-3.5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
        checked || partial
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
          : "border-[var(--color-border)]",
      )}
    >
      {checked ? <Check size={10} /> : partial ? <Minus size={10} /> : null}
    </span>
  );
}
