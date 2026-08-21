import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/features/audit-filters";
import { auditEventMetadata } from "@/shared/audit-catalog";
import type { SupportedLocale } from "@/shared/i18n";
import { formatElapsed, formatFullInstant } from "@/shared/lib/format-instant";
import type { AuditRecordingBinding } from "../api/audit";

interface AuditProvenanceProps {
  occurredAt: string;
  recordingBinding: AuditRecordingBinding;
  recordedAt: string;
  locale: SupportedLocale;
}

interface AdminAuditEventInsightProps extends AuditProvenanceProps {
  eventType: string;
}

interface InsightSectionProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

function InsightSection({ icon, title, children }: InsightSectionProps) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
        <span aria-hidden="true">{icon}</span>
        {title}
      </p>
      {children}
    </section>
  );
}

const bindingLabelKeys: Record<AuditRecordingBinding, string> = {
  TRANSACTIONAL: "chrome.bindingTransactional",
  STANDALONE: "chrome.bindingStandalone",
};

/**
 * How the record came to exist. The binding is the difference between evidence and a report,
 * so it is spelled out rather than badged, and the lag is stated as a sentence rather than
 * left as two timestamps the reader has to subtract.
 */
function AuditProvenance({
  occurredAt,
  recordingBinding,
  recordedAt,
  locale,
}: AuditProvenanceProps) {
  const { t } = useTranslation(auditNamespace);
  // Below a second the gap is clock noise; above it, a STANDALONE write drifting is a signal.
  const lag = formatElapsed(occurredAt, recordedAt, locale);

  return (
    <InsightSection
      icon={
        recordingBinding === "TRANSACTIONAL" ? (
          <ShieldCheck size={12} />
        ) : (
          <AlertTriangle size={12} />
        )
      }
      title={t("chrome.provenance")}
    >
      <p className="text-[13px] text-[var(--color-text)]">
        {t(bindingLabelKeys[recordingBinding])}
      </p>
      {lag ? (
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          {t("chrome.recordedLater", { elapsed: lag })}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] tabular-nums text-[var(--color-text-faint)]">
        {t("chrome.recordedAt")} · {formatFullInstant(recordedAt, locale)}
      </p>
    </InsightSection>
  );
}

interface AboutThisEventProps {
  eventType: string;
}

/** What the catalog means by this event type, in place beside the row that raised the question. */
function AboutThisEvent({ eventType }: AboutThisEventProps) {
  const { t } = useTranslation(auditNamespace);
  const metadata = auditEventMetadata(eventType);
  if (!metadata) return null;

  return (
    <InsightSection icon={<FileText size={12} />} title={t("chrome.aboutThisEvent")}>
      <p className="text-[13px] text-[var(--color-text)]">{metadata.description}</p>
      {metadata.lifecycle !== "ACTIVE" ? (
        // Retained history still carries events nobody emits any more, and a reader looking
        // for recent ones deserves to know why they stop.
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--color-warning)]">
          <AlertTriangle size={12} aria-hidden="true" />
          {t("chrome.lifecycleDeprecated")}
        </p>
      ) : null}
      {metadata.outcomePolicy === "SUCCESS_ONLY" ? (
        // Answers "why do I never see failures for this event" with a fact rather than a shrug.
        <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
          {t("chrome.outcomeSuccessOnly")}
        </p>
      ) : null}
    </InsightSection>
  );
}

/**
 * What the system knows about the event that the row itself cannot say. Both halves describe
 * Edara's own machinery and internal catalog, so this belongs to the Platform Admin alone and
 * never reaches a Company's trail.
 */
export function AdminAuditEventInsight({
  eventType,
  occurredAt,
  recordingBinding,
  recordedAt,
  locale,
}: AdminAuditEventInsightProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AboutThisEvent eventType={eventType} />
      <AuditProvenance
        occurredAt={occurredAt}
        recordingBinding={recordingBinding}
        recordedAt={recordedAt}
        locale={locale}
      />
    </div>
  );
}
