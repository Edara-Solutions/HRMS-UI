import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { components } from "@/shared/api";
import type { SupportedLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { humanizeAuditKey } from "../model/audit-detail";
import { type AuditTranslate, auditNamespace } from "../model/audit-labels";
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
  /** Already-resolved text for a row whose event names no target. */
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

/** The dotted prefix of an event type, read as a grouping line above the label. */
function eventFamily(eventType: string): string {
  return humanizeAuditKey(eventType.split(".").slice(0, -1).join(" "));
}

function actorText(actor: AuditActor, t: AuditTranslate): { primary: string; secondary: string } {
  if (actor.kind === "ANONYMOUS") return { primary: t("chrome.anonymous"), secondary: "" };
  if (actor.kind === "ATTRIBUTION_FAILED") {
    return { primary: t("chrome.attributionFailed"), secondary: "" };
  }
  if (actor.kind === "ERASED_USER") return { primary: t("chrome.erasedIdentity"), secondary: "" };
  if (actor.kind === "SYSTEM") {
    return { primary: humanizeAuditKey(actor.component), secondary: t("chrome.system") };
  }
  if ("publicId" in actor && actor.publicId) {
    return { primary: actor.publicId, secondary: humanizeAuditKey(actor.kind) };
  }
  // The Company trail withholds the Platform Admin's identity, so the actor is a fixed
  // client-side constant: there is no server field it could leak through.
  return { primary: t("chrome.platformAdmin"), secondary: t("chrome.identityWithheld") };
}

function Subject({ event, fallback }: { event: AuditEvent; fallback: string }) {
  const target = event.targets[0];

  if (!target) {
    return <span className="text-[var(--color-text-muted)]">{fallback}</span>;
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
  const { t, i18n } = useTranslation(auditNamespace);
  // A known event with no authored label is a pure presentation gap: it renders as the
  // raw event type in mono, visibly wrong beside the sentence-case labels around it.
  const labelled = i18n.exists(event.eventType, { ns: auditNamespace });
  const actor = actorText(event.actor, t);
  const failed = event.outcome === "FAILURE";

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
                  {eventFamily(event.eventType)}
                </span>
              ) : null}
              <span
                className={cn(
                  "block text-[13px] font-medium text-[var(--color-text)]",
                  !labelled && "font-mono text-[12px]",
                )}
              >
                {t(event.eventType)}
              </span>
            </span>
            {failed ? <Badge variant="danger">{t("chrome.failure")}</Badge> : null}
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
          <Subject event={event} fallback={subjectFallback} />
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
  const { t } = useTranslation(auditNamespace);
  const parsed = degradedRecordSchema.safeParse(rawValue);
  const raw = parsed.success ? parsed.data : {};
  const eventType = eventTypeSchema.safeParse(raw.eventType);
  const eventVersion = eventVersionSchema.safeParse(raw.eventVersion);
  const occurredAt = occurredAtSchema.safeParse(raw.occurredAt);

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
            <span className="font-medium text-[var(--color-text)]">
              {t("chrome.unrecognizedEvent")}
            </span>
            <Badge variant="warning">{t("chrome.portalGap")}</Badge>
          </button>
        </td>
        <EmptyCell />
        <EmptyCell />
        {companyCell}
        <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
          {occurredAt.success ? formatInstant(occurredAt.data, locale) : t("chrome.unknownTime")}
        </td>
      </tr>
      {expanded ? (
        <tr id={detailId} className="border-b border-[var(--color-border)]">
          <td colSpan={columnCount} className="border-s-2 border-[var(--color-warning)] px-10 py-4">
            <p className="text-[13px] font-medium text-[var(--color-text)]">
              {t("chrome.degradedTitle")}
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {t("chrome.degradedDescription")}
            </p>
            <footer className="mt-4 break-all border-t border-[var(--color-border)] pt-3 font-mono text-[11px] tabular-nums text-[var(--color-text-faint)]">
              {eventType.success ? eventType.data : t("chrome.unknownEvent")} v
              {eventVersion.success ? eventVersion.data : "?"} ·{" "}
              {occurredAt.success ? occurredAt.data : t("chrome.unknownTime")}
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
  const { t } = useTranslation(auditNamespace);
  return (
    <tr className="border-b border-[var(--color-border)]">
      <td className="border-s-2 border-[var(--color-warning)] px-4 py-3 font-medium text-[var(--color-text)]">
        {t("audit.event.unavailable")}
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
