import { Link } from "@tanstack/react-router";
import { History, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import type { CompanyOverview } from "../model/company-dashboard";

const linkClassName =
  "text-xs font-medium text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

const STATUS_ORDER = ["ACTIVE", "ONBOARDING", "PROBATION", "SUSPENDED", "RESIGNED", "TERMINATED"];

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
      <div className="min-w-0">
        <CardTitle>{title}</CardTitle>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
      </div>
      {action}
    </CardHeader>
  );
}

export function PeopleByStatus({ people }: { people: NonNullable<CompanyOverview["people"]> }) {
  const { t } = useTranslation(["organization", "people"]);
  const rows = Object.entries(people.byStatus)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => {
      const rank = (status: string) => {
        const index = STATUS_ORDER.indexOf(status);
        return index === -1 ? STATUS_ORDER.length : index;
      };
      return rank(a) - rank(b);
    });
  const largest = Math.max(1, ...rows.map(([, count]) => count));

  return (
    <Card as="section" aria-label={t("dashboard.byStatus.title")}>
      <SectionHeader
        title={t("dashboard.byStatus.title")}
        description={t("dashboard.byStatus.description")}
        action={
          <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
            {t("dashboard.byStatus.total", { count: people.total })}
          </span>
        }
      />
      <CardContent className="space-y-3 p-4">
        {rows.map(([status, count]) => (
          <div
            key={status}
            className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_2.5rem] items-center gap-3"
          >
            <span className="truncate text-[13px] text-[var(--color-text)]">
              {t(`people:status.${status}`, { defaultValue: status })}
            </span>
            <span
              aria-hidden="true"
              className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
            >
              <span
                className="block h-full rounded-full bg-[var(--color-primary)] opacity-80"
                style={{ width: `${(count / largest) * 100}%` }}
              />
            </span>
            <span className="text-end text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
              {count}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function NextSetupSteps({ setup }: { setup: NonNullable<CompanyOverview["setup"]> }) {
  const { t } = useTranslation("organization");
  return (
    <Card as="section" aria-label={t("dashboard.nextSteps.title")}>
      <SectionHeader
        title={t("dashboard.nextSteps.title")}
        description={t("dashboard.nextSteps.description")}
        action={
          <Link to="/company/setup" className={`shrink-0 ${linkClassName}`}>
            {t("dashboard.nextSteps.open")}
          </Link>
        }
      />
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
  );
}

type Activity = NonNullable<CompanyOverview["recentActivity"]>[number];

const AUDIT_HREF: string = "/company/audit";

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
    <Card as="section" aria-label={t("dashboard.activity.title")}>
      <SectionHeader
        title={t("dashboard.activity.title")}
        description={t("dashboard.activity.description")}
        action={
          canOpenAudit && (
            <Link to={AUDIT_HREF} className={`shrink-0 ${linkClassName}`}>
              {t("dashboard.activity.open")}
            </Link>
          )
        }
      />
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState className="py-8" icon={History} title={t("dashboard.activity.empty")} />
        ) : (
          <ul className="px-4 py-3">
            {items.map((item, index) => (
              <li
                key={`${item.eventType}-${item.occurredAt}-${index}`}
                className="relative flex gap-2.5 pb-3.5 last:pb-0"
              >
                {index < items.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-[-6px] start-[3px] top-[14px] w-px bg-[var(--color-border)]"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="z-10 mt-1.5 size-2 shrink-0 rounded-full bg-[var(--color-primary)] opacity-80"
                />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium leading-snug text-[var(--color-text)]">
                    {t(`audit:${item.eventType}`, {
                      defaultValue: t("audit:audit.event.unavailable"),
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
                    {[actorName(item, t), formatInstant(item.occurredAt, locale)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
