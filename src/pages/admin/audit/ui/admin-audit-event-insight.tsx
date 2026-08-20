import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/features/audit-filters";
import { auditEventMetadata } from "@/shared/audit-catalog";
import type { SupportedLocale } from "@/shared/i18n";
import { formatElapsed, formatFullInstant } from "@/shared/lib/format-instant";

interface AdminAuditEventInsightProps {
  eventType: string;
  occurredAt: string;
  recordingBinding: "TRANSACTIONAL" | "STANDALONE";
  recordedAt: string;
  locale: SupportedLocale;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
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

/**
 * What the system knows about the event that the row itself cannot say: how the record came
 * to exist, and what the catalog means by this event type. Both are Edara's own machinery, so
 * this belongs to the Platform Admin alone and never reaches a Company's trail.
 */
function Provenance({
  occurredAt,
  recordingBinding,
  recordedAt,
  locale,
}: Omit<AdminAuditEventInsightProps, "eventType">) {
  const { t } = useTranslation(auditNamespace);
  const transactional = recordingBinding === "TRANSACTIONAL";
  // Below a second the gap is clock noise; above it, a STANDALONE write drifting is a signal.
  const lag = formatElapsed(occurredAt, recordedAt, locale);

  return (
    <Section
      icon={transactional ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
      title={t("chrome.provenance")}
    >
      <p className="text-[13px] text-[var(--color-text)]">
        {transactional ? t("chrome.bindingTransactional") : t("chrome.bindingStandalone")}
      </p>
      {lag ? (
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
          {t("chrome.recordedLater", { elapsed: lag })}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] tabular-nums text-[var(--color-text-faint)]">
        {t("chrome.recordedAt")} · {formatFullInstant(recordedAt, locale)}
      </p>
    </Section>
  );
}

function AboutThisEvent({ eventType }: { eventType: string }) {
  const { t } = useTranslation(auditNamespace);
  const metadata = auditEventMetadata(eventType);
  if (!metadata) return null;

  return (
    <Section icon={<FileText size={12} />} title={t("chrome.aboutThisEvent")}>
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
    </Section>
  );
}

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
      <Provenance
        occurredAt={occurredAt}
        recordingBinding={recordingBinding}
        recordedAt={recordedAt}
        locale={locale}
      />
    </div>
  );
}
