import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { auditNamespace, humanizeAuditKey } from "@/features/audit-filters";
import type { SupportedLocale } from "@/shared/i18n";
import { formatFullInstant, formatInstant } from "@/shared/lib/format-instant";
import {
  type AuditTarget,
  collectTransitions,
  getAuditDetailKind,
  isChangedFieldList,
  isFieldDiff,
  isInstantKey,
} from "../model/audit-detail";
import {
  type AuditPortal,
  type AuditTargetIdentity,
  presentAuditTarget,
} from "../model/audit-identity";
import { auditEnumLabel, auditFieldLabel, isAuditEnumField } from "../model/audit-labels";
import { AuditTargetName } from "./audit-target-name";

interface AuditDetailProps {
  details: Record<string, unknown>;
  targets: AuditTargetIdentity[];
  /** Decides which targets this reader can navigate to; the Company portal offers none. */
  portal: AuditPortal;
  occurredAt: string;
  locale: SupportedLocale;
  eventKey: string;
  eventVersion: number;
  traceId?: string | null;
  origin?: { ip: string | null; userAgent: string | null };
}

interface DetailValueProps {
  field: string;
  value: unknown;
  targets: AuditTarget[];
  locale: SupportedLocale;
}

function findTarget(value: unknown, targets: AuditTarget[]): AuditTarget | undefined {
  if (typeof value !== "string") return undefined;
  return targets.find((target) => target.publicId === value);
}

function DetailValue({ field, value, targets, locale }: DetailValueProps) {
  const { t } = useTranslation(auditNamespace);

  if (value === null || value === undefined || value === "") {
    return <span className="text-[var(--color-text-faint)]">{t("chrome.none")}</span>;
  }

  if (typeof value === "boolean") {
    return <span>{value ? t("chrome.yes") : t("chrome.no")}</span>;
  }

  if (typeof value === "string" && isInstantKey(field)) {
    return <span className="tabular-nums">{formatInstant(value, locale)}</span>;
  }

  if (field.endsWith("PublicId")) {
    const target = findTarget(value, targets);
    const label = target
      ? humanizeAuditKey(target.targetType)
      : humanizeAuditKey(field.slice(0, -"PublicId".length));
    return (
      <span>
        {label}{" "}
        <span className="font-mono text-[12px] text-[var(--color-text-muted)]">
          {String(value)}
        </span>
      </span>
    );
  }

  if (typeof value === "string" && isAuditEnumField(field)) {
    return <span>{auditEnumLabel(t, field, value)}</span>;
  }

  if (typeof value === "string" || typeof value === "number") return <span>{String(value)}</span>;

  return <span className="text-[var(--color-text-faint)]">{t("chrome.unableToDisplay")}</span>;
}

/**
 * One before-to-after line. Both halves are read through the same field — they are two
 * readings of one value, so a token that becomes words on the right must on the left too.
 */
function ValueTransition({
  label,
  field,
  before,
  after,
  targets,
  locale,
}: {
  label: string;
  field: string;
  before: unknown;
  after: unknown;
  targets: AuditTarget[];
  locale: SupportedLocale;
}) {
  const { t } = useTranslation(auditNamespace);
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(120px,0.45fr)_1fr] sm:gap-4">
      <dt className="text-[12px] font-medium text-[var(--color-text-muted)]">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--color-text)]">
        <DetailValue field={field} value={before} targets={targets} locale={locale} />
        <span className="sr-only">{t("chrome.changedTo")}</span>
        <ArrowRight
          size={14}
          className="shrink-0 text-[var(--color-text-faint)] rtl:rotate-180"
          aria-hidden="true"
        />
        <DetailValue field={field} value={after} targets={targets} locale={locale} />
      </dd>
    </div>
  );
}

function FieldDiff({
  details,
  targets,
  locale,
}: Pick<AuditDetailProps, "details" | "targets" | "locale">) {
  const { t } = useTranslation(auditNamespace);
  if (!isFieldDiff(details)) return null;
  return (
    <dl className="space-y-3">
      {details.changes.map((change, index) => (
        <ValueTransition
          key={`${change.field}-${index}`}
          label={auditFieldLabel(t, change.field)}
          field={change.field}
          before={change.before}
          after={change.after}
          targets={targets}
          locale={locale}
        />
      ))}
    </dl>
  );
}

function ChangedFieldList({
  details,
  targets,
  locale,
}: Pick<AuditDetailProps, "details" | "targets" | "locale">) {
  const { t } = useTranslation(auditNamespace);
  if (!isChangedFieldList(details)) return null;
  const remainingDetails = Object.fromEntries(
    Object.entries(details).filter(([field]) => field !== "changedFields"),
  );
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[12px] font-medium text-[var(--color-text-muted)]">
          {t("chrome.changedFields")}
        </p>
        <ul className="flex flex-wrap gap-2" aria-label={t("chrome.changedFields")}>
          {details.changedFields.map((field) => (
            <li
              key={field}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-[12px] text-[var(--color-text)]"
            >
              {auditFieldLabel(t, field)}
            </li>
          ))}
        </ul>
      </div>
      {Object.keys(remainingDetails).length > 0 ? (
        <ScalarBag details={remainingDetails} targets={targets} locale={locale} />
      ) : null}
    </div>
  );
}

function ScalarBag({
  details,
  targets,
  locale,
}: Pick<AuditDetailProps, "details" | "targets" | "locale">) {
  const { t } = useTranslation(auditNamespace);
  const { transitions, consumedKeys } = collectTransitions(details);
  const scalarEntries = Object.entries(details).filter(([key]) => !consumedKeys.has(key));

  if (transitions.length === 0 && scalarEntries.length === 0) {
    return (
      <p className="text-[13px] text-[var(--color-text-muted)]">
        {t("chrome.noAdditionalDetails")}
      </p>
    );
  }

  return (
    <dl className="space-y-3">
      {transitions.map((transition) => (
        <ValueTransition
          key={`${transition.beforeKey}-${transition.afterKey}`}
          label={auditFieldLabel(t, transition.afterKey)}
          field={transition.afterKey}
          before={transition.before}
          after={transition.after}
          targets={targets}
          locale={locale}
        />
      ))}
      {scalarEntries.map(([field, value]) => (
        <div key={field} className="grid gap-1 sm:grid-cols-[minmax(120px,0.45fr)_1fr] sm:gap-4">
          <dt className="text-[12px] font-medium text-[var(--color-text-muted)]">
            {auditFieldLabel(t, field)}
          </dt>
          <dd className="min-w-0 break-words text-[13px] text-[var(--color-text)]">
            <DetailValue field={field} value={value} targets={targets} locale={locale} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditDetail({
  details,
  targets,
  portal,
  occurredAt,
  locale,
  eventKey,
  eventVersion,
  traceId,
  origin,
}: AuditDetailProps) {
  const { t } = useTranslation(auditNamespace);
  const kind = getAuditDetailKind(details);

  return (
    <div data-audit-renderer={kind} className="space-y-4">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
          {t("chrome.recordedAt")}
        </p>
        <p className="text-[13px] tabular-nums text-[var(--color-text)]">
          {formatFullInstant(occurredAt, locale)}
        </p>
      </div>

      {kind === "field-diff" ? (
        <FieldDiff details={details} targets={targets} locale={locale} />
      ) : kind === "changed-field-list" ? (
        <ChangedFieldList details={details} targets={targets} locale={locale} />
      ) : (
        <ScalarBag details={details} targets={targets} locale={locale} />
      )}

      {targets.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
            {t("chrome.targets")}
          </p>
          <ul className="space-y-1 text-[12px] text-[var(--color-text-muted)]">
            {targets.map((target) => {
              const presented = presentAuditTarget(target, portal);
              return (
                <li
                  key={`${target.targetType}-${target.publicId}`}
                  className="flex min-w-0 items-center gap-1.5"
                >
                  {presented.typeLabel} ·
                  <AuditTargetName target={presented} className="max-w-80" />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {origin ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
            {t("chrome.origin")}
          </p>
          <dl className="space-y-1 text-[12px] text-[var(--color-text-muted)]">
            <div className="flex gap-2">
              <dt>{t("chrome.ip")}</dt>
              <dd className="font-mono">{origin.ip ?? t("chrome.none")}</dd>
            </div>
            <div className="flex gap-2">
              <dt>{t("chrome.userAgent")}</dt>
              <dd className="break-all font-mono">{origin.userAgent ?? t("chrome.none")}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <footer className="break-all border-t border-[var(--color-border)] pt-3 font-mono text-[11px] tabular-nums text-[var(--color-text-faint)]">
        {eventKey} v{eventVersion} · {occurredAt}
        {traceId ? ` · trace ${traceId}` : ""}
      </footer>
    </div>
  );
}
