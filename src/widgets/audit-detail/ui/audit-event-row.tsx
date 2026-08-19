import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import type { components } from "@/shared/api";
import type { SupportedLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { getAuditCopy } from "../model/audit-copy";
import { humanizeAuditKey } from "../model/audit-detail";
import { AuditDetail } from "./audit-detail";

export type AuditDensity = "comfortable" | "compact";

type PlatformAuditEvent = Exclude<
  components["schemas"]["PlatformAuditTrailPage"]["items"][number],
  { eventType: "audit.event.unavailable" }
>;
type CompanyAuditEvent = Exclude<
  components["schemas"]["CompanyAuditTrailPage"]["items"][number],
  { eventType: "audit.event.unavailable" }
>;
type CatalogAuditEvent = PlatformAuditEvent | CompanyAuditEvent;
type AuditActor = CatalogAuditEvent["actor"];

interface AuditEvent {
  eventType: CatalogAuditEvent["eventType"];
  eventVersion: CatalogAuditEvent["eventVersion"];
  occurredAt: string;
  outcome: "SUCCESS" | "FAILURE";
  actor: CatalogAuditEvent["actor"];
  traceId: string | null;
  targets: CatalogAuditEvent["targets"];
  details: CatalogAuditEvent["details"];
  origin?: PlatformAuditEvent["origin"];
}

interface AuditEventRowProps {
  event: AuditEvent;
  density: AuditDensity;
  expanded: boolean;
  detailId: string;
  columnCount: number;
  locale: SupportedLocale;
  subjectFallback: string;
  companyCell?: ReactNode;
  onToggle: () => void;
}

interface DegradedAuditEventRowProps {
  raw: unknown;
  expanded: boolean;
  detailId: string;
  columnCount: number;
  locale: SupportedLocale;
  companyCell?: ReactNode;
  onToggle: () => void;
}

interface UnavailableAuditEventRowProps {
  occurredAt: string;
  locale: SupportedLocale;
  companyCell?: ReactNode;
}

const degradedRecordSchema = z.record(z.unknown());
const eventTypeSchema = z.string();
const eventVersionSchema = z.number().int();
const occurredAtSchema = z.string().datetime({ offset: true });

function eventName(eventType: string): { label: string; family: string } {
  const parts = eventType.split(".");
  return {
    label: humanizeAuditKey(parts.at(-1) ?? eventType),
    family: humanizeAuditKey(parts.slice(0, -1).join(" ")),
  };
}

function actorText(
  actor: AuditActor,
  locale: SupportedLocale,
): { primary: string; secondary: string } {
  const copy = getAuditCopy(locale);
  if (actor.kind === "ANONYMOUS") return { primary: copy.anonymous, secondary: "" };
  if (actor.kind === "ATTRIBUTION_FAILED") {
    return { primary: copy.attributionFailed, secondary: "" };
  }
  if (actor.kind === "ERASED_USER") return { primary: copy.erasedIdentity, secondary: "" };
  if (actor.kind === "SYSTEM") {
    return { primary: humanizeAuditKey(actor.component), secondary: copy.system };
  }
  if ("publicId" in actor && actor.publicId) {
    return { primary: actor.publicId, secondary: humanizeAuditKey(actor.kind) };
  }
  return { primary: copy.platformAdmin, secondary: copy.identityWithheld };
}

function Subject({
  event,
  fallback,
  locale,
}: {
  event: AuditEvent;
  fallback: string;
  locale: SupportedLocale;
}) {
  const target = event.targets[0];
  if (!target) {
    const copy = getAuditCopy(locale);
    const localizedFallback =
      fallback === "Company" ? copy.company : fallback === "Platform" ? copy.platform : fallback;
    return <span className="text-[var(--color-text-muted)]">{localizedFallback}</span>;
  }
  return (
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-[var(--color-text)]">
        {humanizeAuditKey(target.targetType)}
      </p>
      <p className="max-w-52 truncate font-mono text-[11px] text-[var(--color-text-faint)]">
        {target.publicId}
      </p>
    </div>
  );
}

function EmptyCell() {
  return <td className="px-4 py-3 text-[var(--color-text-faint)]">–</td>;
}

export function AuditEventRow({
  event,
  density,
  expanded,
  detailId,
  columnCount,
  locale,
  subjectFallback,
  companyCell,
  onToggle,
}: AuditEventRowProps) {
  const name = eventName(event.eventType);
  const actor = actorText(event.actor, locale);
  const failed = event.outcome === "FAILURE";
  const copy = getAuditCopy(locale);

  return (
    <>
      <tr className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-2)]">
        <td
          className={cn(
            "px-4",
            density === "compact" ? "py-2" : "py-3",
            failed && "border-s-2 border-[var(--color-danger)]",
          )}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={onToggle}
          >
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 text-[var(--color-text-faint)] transition-transform duration-[var(--motion-fast)] ease-[var(--motion-easing)]",
                expanded && "rotate-180",
              )}
            />
            <span className="min-w-0">
              {density === "comfortable" ? (
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
                  {name.family}
                </span>
              ) : null}
              <span className="block text-[13px] font-medium text-[var(--color-text)]">
                {name.label}
              </span>
            </span>
            {failed ? <Badge variant="danger">{copy.failure}</Badge> : null}
          </button>
        </td>
        <td className="px-4 py-3">
          <p className="max-w-52 truncate text-[13px] font-medium text-[var(--color-text)]">
            {actor.primary}
          </p>
          {density === "comfortable" ? (
            <p className="text-[11px] text-[var(--color-text-faint)]">{actor.secondary}</p>
          ) : null}
        </td>
        <td className="px-4 py-3">
          <Subject event={event} fallback={subjectFallback} locale={locale} />
        </td>
        {companyCell}
        <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
          {formatInstant(event.occurredAt, locale)}
        </td>
      </tr>
      {expanded ? (
        <tr
          id={detailId}
          className="border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-2)_35%,transparent)]"
        >
          <td
            colSpan={columnCount}
            className={cn("px-10 py-5", failed && "border-s-2 border-[var(--color-danger)]")}
          >
            <AuditDetail
              details={event.details}
              targets={event.targets}
              occurredAt={event.occurredAt}
              locale={locale}
              eventKey={event.eventType}
              eventVersion={event.eventVersion}
              traceId={event.traceId}
              origin={event.origin}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function DegradedAuditEventRow({
  raw: rawValue,
  expanded,
  detailId,
  columnCount,
  locale,
  companyCell,
  onToggle,
}: DegradedAuditEventRowProps) {
  const parsed = degradedRecordSchema.safeParse(rawValue);
  const raw = parsed.success ? parsed.data : {};
  const eventType = eventTypeSchema.safeParse(raw.eventType);
  const eventVersion = eventVersionSchema.safeParse(raw.eventVersion);
  const occurredAt = occurredAtSchema.safeParse(raw.occurredAt);
  const copy = getAuditCopy(locale);

  return (
    <>
      <tr className="border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-warning-soft)_30%,transparent)]">
        <td className="border-s-2 border-[var(--color-warning)] px-4 py-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={onToggle}
          >
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 text-[var(--color-text-faint)] transition-transform duration-[var(--motion-fast)] ease-[var(--motion-easing)]",
                expanded && "rotate-180",
              )}
            />
            <span className="font-medium text-[var(--color-text)]">{copy.unrecognizedEvent}</span>
            <Badge variant="warning">{copy.portalGap}</Badge>
          </button>
        </td>
        <EmptyCell />
        <EmptyCell />
        {companyCell}
        <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
          {occurredAt.success ? formatInstant(occurredAt.data, locale) : copy.unknownTime}
        </td>
      </tr>
      {expanded ? (
        <tr id={detailId} className="border-b border-[var(--color-border)]">
          <td colSpan={columnCount} className="border-s-2 border-[var(--color-warning)] px-10 py-4">
            <p className="text-[13px] font-medium text-[var(--color-text)]">{copy.degradedTitle}</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {copy.degradedDescription}
            </p>
            <footer className="mt-4 break-all border-t border-[var(--color-border)] pt-3 font-mono text-[11px] tabular-nums text-[var(--color-text-faint)]">
              {eventType.success ? eventType.data : copy.unknownEvent} v
              {eventVersion.success ? eventVersion.data : "?"} ·{" "}
              {occurredAt.success ? occurredAt.data : copy.unknownTime}
            </footer>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function UnavailableAuditEventRow({
  occurredAt,
  locale,
  companyCell,
}: UnavailableAuditEventRowProps) {
  const copy = getAuditCopy(locale);
  return (
    <tr className="border-b border-[var(--color-border)]">
      <td className="border-s-2 border-[var(--color-warning)] px-4 py-3 font-medium text-[var(--color-text)]">
        {copy.unavailableEvent}
      </td>
      <EmptyCell />
      <EmptyCell />
      {companyCell}
      <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
        {formatInstant(occurredAt, locale)}
      </td>
    </tr>
  );
}
