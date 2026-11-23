import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { SectionCard } from "@/shared/ui/section-card";
import type { Plan } from "../api/catalogue";
import { supportedPlanFeatures } from "../model/catalogue-form";
import { formatPlanDate } from "../model/plan-date";

export const SYSTEM_PLAN = "Default Full Access";
const nowrapBadge = "shrink-0 whitespace-nowrap";
const eyebrow =
  "text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={eyebrow}>{label}</dt>
      <dd className="mt-1 text-sm text-[var(--color-text)]">{children}</dd>
    </div>
  );
}

export function PlanDefinition({ plan }: { plan: Plan }) {
  const { t, i18n } = useTranslation("platform-plans");
  const limits = Object.entries(plan.limits ?? {});
  const systemPlan = plan.name === SYSTEM_PLAN;
  const featureLabel = (code: string) =>
    supportedPlanFeatures.has(code) ? t(`feature.${code}`) : t("unknownFeature");
  return (
    <SectionCard
      title={t("definition")}
      description={t("definitionHelp")}
      contentClassName="space-y-5 p-4 sm:p-5"
    >
      <dl className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-6 gap-y-4 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
        <Fact label={t("duration")}>
          <span className="tabular-nums">{plan.duration}</span>
        </Fact>
        <Fact label={t("visibility")}>{t(plan.isPublic ? "public" : "private")}</Fact>
        <Fact label={t("status")}>{t(plan.isActive ? "active" : "inactive")}</Fact>
        <Fact label={t("updated")}>
          <time dateTime={plan.updatedAt} className="tabular-nums">
            {formatPlanDate(plan.updatedAt, i18n.language)}
          </time>
        </Fact>
      </dl>
      <div className="grid gap-5 border-t border-[var(--color-border)] pt-4 md:grid-cols-[repeat(2,minmax(0,1fr))]">
        <div>
          <p className={eyebrow}>{t("featuresColumn")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.features.map((feature) => (
              <Badge key={feature} variant="default" className={nowrapBadge}>
                <bdi>{featureLabel(feature)}</bdi>
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className={eyebrow}>{t("limits")}</p>
          {limits.length ? (
            <dl className="mt-2 space-y-1 text-sm">
              {limits.map(([name, value]) => (
                <div key={name} className="flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">{t(name)}</dt>
                  <dd className="tabular-nums text-[var(--color-text)]">
                    <bdi>{value}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-text-faint)]">{t("noLimitsSet")}</p>
          )}
        </div>
      </div>
      {systemPlan && (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
          {t("systemHelp")}
        </p>
      )}
    </SectionCard>
  );
}
