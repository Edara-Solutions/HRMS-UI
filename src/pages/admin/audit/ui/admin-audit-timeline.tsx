import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/features/audit-filters";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import { formatInstant } from "@/shared/lib/format-instant";
import { AuditDetail, keyAuditRecords, useAuditRowExpansion } from "@/widgets/audit-detail";
import type { PlatformAuditTrailItem } from "../api/audit";

type SupportedLocale = "en" | "ar";

export type AuditTimelineLens = "chronological" | "person" | "entity";

type AvailableTrailEvent = Extract<PlatformAuditTrailItem, { recordedAt: string }>;

interface ChainRecord {
  event: AvailableTrailEvent;
  rowKey: string;
}

function dayKey(instant: string): string {
  return instant.slice(0, 10);
}

function actorOf(event: AvailableTrailEvent): string {
  return "name" in event.actor && event.actor.name ? event.actor.name : event.actor.kind;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

/** One event may name several targets; the first is the one the trail row is about. */
function entityOf(event: AvailableTrailEvent): { key: string; label: string } {
  const target = (
    event.targets as { targetType: string; publicId: string; name?: string | null }[]
  ).at(0);
  if (!target) return { key: "::none", label: "" };
  return {
    key: `${target.targetType}:${target.publicId}`,
    label: target.name ?? target.publicId,
  };
}

interface ChainRowProps {
  record: ChainRecord;
  locale: SupportedLocale;
  expanded: boolean;
  onToggle: () => void;
  onTraceSelect?: undefined | ((traceId: string) => void);
}

function ChainRow({ record, locale, expanded, onToggle, onTraceSelect }: ChainRowProps) {
  const { t } = useTranslation(auditNamespace);
  const { event, rowKey } = record;
  const failed = event.outcome === "FAILURE";
  const detailId = `admin-audit-chain-${rowKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <li className="relative ps-6 pb-1.5 last:pb-0">
      <span
        aria-hidden="true"
        className={cn(
          "absolute start-[3px] top-[11px] size-2 rounded-full",
          failed ? "bg-[var(--color-danger)]" : "bg-[var(--color-primary)]",
        )}
      />
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 text-start",
          "transition-colors duration-150 ease-out hover:bg-[var(--color-surface-2)]",
        )}
      >
        <time
          dateTime={event.occurredAt}
          className="w-14 shrink-0 text-[11px] tabular-nums text-[var(--color-text-faint)]"
        >
          {formatInstant(event.occurredAt, locale)}
        </time>
        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-text)]">
          {t(event.eventType)}
        </span>
        {failed ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-danger)]">
            FAILURE
          </span>
        ) : null}
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={cn(
            "shrink-0 text-[var(--color-text-faint)] transition-transform duration-200 ease-out rtl:-scale-x-100",
            expanded && "rotate-180 rtl:rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <div
          id={detailId}
          className="mb-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        >
          <AuditDetail
            details={event.details as Record<string, unknown>}
            targets={event.targets}
            portal="admin"
            occurredAt={event.occurredAt}
            locale={locale}
            eventKey={event.eventType}
            eventVersion={event.eventVersion}
            traceId={event.traceId}
            onTraceSelect={onTraceSelect}
          />
        </div>
      ) : null}
    </li>
  );
}

interface ChainGroupProps {
  heading?: string;
  initials?: string;
  count?: number;
  records: ChainRecord[];
  locale: SupportedLocale;
  expansion: ReturnType<typeof useAuditRowExpansion>;
  onTraceSelect?: undefined | ((traceId: string) => void);
}

function ChainGroup({
  heading,
  initials,
  count,
  records,
  locale,
  expansion,
  onTraceSelect,
}: ChainGroupProps) {
  return (
    <section>
      {heading ? (
        <div className="mb-1.5 flex items-center gap-2.5 px-2 py-1">
          {initials ? (
            <span className="flex size-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-primary-soft)] text-[9px] font-semibold text-[var(--color-primary)]">
              {initials}
            </span>
          ) : null}
          <span className="truncate text-[12.5px] font-medium text-[var(--color-text)]">
            {heading}
          </span>
          {count !== undefined && count > 1 ? (
            <span className="text-[11px] tabular-nums text-[var(--color-text-faint)]">{count}</span>
          ) : null}
        </div>
      ) : null}
      <ul className="relative before:absolute before:inset-y-1 before:start-[6.5px] before:w-px before:bg-[var(--color-border)]">
        {records.map((record) => (
          <ChainRow
            key={record.rowKey}
            record={record}
            locale={locale}
            expanded={expansion.isExpanded(record.rowKey)}
            onToggle={() => expansion.toggle(record.rowKey)}
            onTraceSelect={onTraceSelect}
          />
        ))}
      </ul>
    </section>
  );
}

interface AdminAuditTimelineProps {
  items: PlatformAuditTrailItem[];
  lens?: AuditTimelineLens;
  onTraceSelect?: undefined | ((traceId: string) => void);
}

/** The same chain read three ways: in order of happening, per person, or per entity. */
export function AdminAuditTimeline({
  items,
  lens = "chronological",
  onTraceSelect,
}: AdminAuditTimelineProps) {
  const locale = usePreferencesStore((state) => state.locale);
  const expansion = useAuditRowExpansion();
  const { t } = useTranslation(auditNamespace);

  const records: ChainRecord[] = [];
  for (const record of keyAuditRecords(items)) {
    if (!("recordedAt" in record.event)) continue;
    records.push({ event: record.event, rowKey: record.rowKey });
  }

  const days = new Map<string, ChainRecord[]>();
  for (const record of records) {
    const key = dayKey(record.event.occurredAt);
    const day = days.get(key);
    if (day) day.push(record);
    else days.set(key, [record]);
  }

  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "long",
  });

  function collect(dayRecords: ChainRecord[]): {
    heading?: string;
    initials?: string;
    groups: Map<string, ChainRecord[]>;
  } {
    if (lens === "chronological") {
      return { groups: new Map([["*", dayRecords]]) };
    }
    const groups = new Map<string, ChainRecord[]>();
    for (const record of dayRecords) {
      const key =
        lens === "person"
          ? actorOf(record.event)
          : (() => {
              const entity = entityOf(record.event);
              return entity.label === "" ? `::none` : entity.key;
            })();
      const group = groups.get(key);
      if (group) group.push(record);
      else groups.set(key, [record]);
    }
    return { groups };
  }

  function groupHeading(key: string, group: ChainRecord[]): string {
    if (lens === "person") return key;
    if (key === "::none") return t("chrome.lensNoTarget");
    return entityOf(group[0].event).label || key;
  }

  return (
    <div className="scrollbar-calm px-4 py-5">
      {[...days.entries()].map(([key, dayRecords]) => (
        <section key={key} className="mb-8 last:mb-0">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <time dateTime={key}>{dateFormatter.format(new Date(`${key}T00:00:00Z`))}</time>
          </h2>
          <div className="space-y-5">
            {[...collect(dayRecords).groups.entries()].map(([groupKey, group]) => {
              const heading = lens === "chronological" ? undefined : groupHeading(groupKey, group);
              return (
                <ChainGroup
                  key={`${key}:${groupKey}`}
                  heading={heading}
                  initials={lens === "person" && heading ? initialsOf(heading) : undefined}
                  count={group.length}
                  records={group}
                  locale={locale}
                  expansion={expansion}
                  onTraceSelect={onTraceSelect}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
