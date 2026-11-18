import { Link } from "@tanstack/react-router";
import { History, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { ActivityFeed } from "@/shared/ui/activity-feed";
import { BarList } from "@/shared/ui/bar-list";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionCard } from "@/shared/ui/section-card";
import type { CompanyOverview } from "../model/company-dashboard";

const linkClassName =
  "shrink-0 text-xs font-medium text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

const AUDIT_HREF: string = "/company/audit";
const STATUS_ORDER = ["ACTIVE", "ONBOARDING", "PROBATION", "SUSPENDED", "RESIGNED", "TERMINATED"];

const rank = (status: string) => {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
};

export function PeopleByStatus({ people }: { people: NonNullable<CompanyOverview["people"]> }) {
  const { t } = useTranslation(["organization", "people"]);
  const rows = Object.entries(people.byStatus)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([status, count]) => ({
      key: status,
      label: t(`people:status.${status}`, { defaultValue: status }),
      value: count,
    }));
  return (
    <SectionCard
      title={t("dashboard.byStatus.title")}
      description={t("dashboard.byStatus.description")}
      contentClassName="p-4"
      action={
        <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
          {t("dashboard.byStatus.total", { count: people.total })}
        </span>
      }
    >
      <BarList rows={rows} />
    </SectionCard>
  );
}

export function NextSetupSteps({ setup }: { setup: NonNullable<CompanyOverview["setup"]> }) {
  const { t } = useTranslation("organization");
  return (
    <SectionCard
      title={t("dashboard.nextSteps.title")}
      description={t("dashboard.nextSteps.description")}
      action={
        <Link to="/company/setup" className={linkClassName}>
          {t("dashboard.nextSteps.open")}
        </Link>
      }
    >
      {setup.nextSteps.length === 0 ? (
        <EmptyState className="py-8" icon={ListChecks} title={t("dashboard.nextSteps.empty")} />
      ) : (
        <ol className="divide-y divide-[var(--color-border)]">
          {setup.nextSteps.map((step, index) => (
            <li key={step.publicId} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[11px] font-semibold tabular-nums text-[var(--color-text-muted)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-text)]">
                {t(`step.${step.stepType}`, { defaultValue: step.stepType })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

type Activity = NonNullable<CompanyOverview["recentActivity"]>[number];

function actorName(item: Activity, t: (key: string) => string) {
  const actor = "actor" in item ? item.actor : undefined;
  if (!actor) return undefined;
  if (actor.kind === "USER" && actor.name) return actor.name;
  const kind = actor.kind === "ERASED_USER" ? "ERASED" : actor.kind;
  return t(`audit:chrome.actorKind.${kind}`);
}

export function RecentActivity({
  items,
  canOpenAudit,
}: {
  items: readonly Activity[];
  canOpenAudit: boolean;
}) {
  const { t } = useTranslation(["organization", "audit"]);
  const locale = usePreferencesStore((state) => state.locale);
  return (
    <SectionCard
      title={t("dashboard.activity.title")}
      description={t("dashboard.activity.description")}
      action={
        canOpenAudit && (
          <Link to={AUDIT_HREF} className={linkClassName}>
            {t("dashboard.activity.open")}
          </Link>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState className="py-8" icon={History} title={t("dashboard.activity.empty")} />
      ) : (
        <ActivityFeed
          items={items.map((item, index) => ({
            id: `${item.eventType}-${item.occurredAt}-${index}`,
            title: t(`audit:${item.eventType}`, {
              defaultValue: t("audit:audit.event.unavailable"),
            }),
            meta: [actorName(item, t), formatInstant(item.occurredAt, locale)]
              .filter(Boolean)
              .join(" · "),
          }))}
        />
      )}
    </SectionCard>
  );
}
