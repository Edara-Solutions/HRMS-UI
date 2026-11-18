import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, History, LayoutDashboard, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  type PlatformOverview,
  platformCompanyOperations,
  platformLeadOperations,
  platformOverviewQuery,
  usePlatformAccess,
} from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { ActivityFeed } from "@/shared/ui/activity-feed";
import { Badge } from "@/shared/ui/badge";
import { BarList } from "@/shared/ui/bar-list";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { KpiCard } from "@/shared/ui/kpi-card";
import { SectionCard } from "@/shared/ui/section-card";
import { Skeleton } from "@/shared/ui/skeleton";

const LIFECYCLE_ORDER = ["ACTIVE", "ONBOARDING", "SUSPENDED", "CLOSED"];
const AUDIT_HREF: string = "/platform/audit";
const COMPANIES_HREF: string = "/platform/companies";
const LEADS_HREF: string = "/platform/leads";

const actionClassName =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";
const linkClassName =
  "shrink-0 text-xs font-medium text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

const todayFormatters = {
  en: new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  ar: new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
};

const rank = (status: string) => {
  const index = LIFECYCLE_ORDER.indexOf(status);
  return index === -1 ? LIFECYCLE_ORDER.length : index;
};

type Activity = NonNullable<PlatformOverview["recentActivity"]>[number];

function actorName(item: Activity, t: (key: string) => string) {
  const actor = "actor" in item ? item.actor : undefined;
  if (!actor) return undefined;
  if ((actor.kind === "USER" || actor.kind === "PLATFORM_USER") && actor.name) return actor.name;
  const kind = actor.kind === "ERASED_USER" ? "ERASED" : actor.kind;
  return t(`audit:chrome.actorKind.${kind}`);
}

export function PlatformDashboardPage() {
  const { t } = useTranslation(["platform-dashboard", "platform-companies", "audit"]);
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const { data, error, isPending, refetch } = useQuery({
    ...platformOverviewQuery(access.user?.publicId ?? "", "recentActivity"),
    enabled: !!access.user,
  });
  if (!access.user) return null;

  const readsCompanies =
    access.availability(platformCompanyOperations.companies.key).state === "enabled";
  const createsLeads = access.availability(platformLeadOperations.create.key).state === "enabled";
  const canAudit = access.availability("GET /api/v1/platform/audit-trail").state !== "hidden";
  const trend = (added: number) => ({
    rising: added > 0,
    label: added > 0 ? t("trend.up", { count: added }) : t("trend.none"),
  });

  const body = (() => {
    if (isPending)
      return (
        <output aria-label={t("loading")} className="block space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))]">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-56" />
        </output>
      );
    if (error)
      return (
        <Card>
          <EmptyState
            role="alert"
            icon={LayoutDashboard}
            title={t("error.title")}
            description={
              error instanceof ContractViolation ? t("contract") : t("error.description")
            }
            action={
              !(error instanceof ContractViolation) && (
                <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                  {t("error.action")}
                </Button>
              )
            }
          />
        </Card>
      );
    if (!data) return null;
    const hasAny = Boolean(
      data.companies ||
        data.subscriptions ||
        data.leads ||
        data.conversionRequests ||
        data.recentActivity,
    );
    if (!hasAny)
      return (
        <Card>
          <EmptyState
            icon={LayoutDashboard}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        </Card>
      );
    const lifecycleRows = data.companies
      ? Object.entries(data.companies.byLifecycle)
          .filter(([, count]) => count > 0)
          .sort(([a], [b]) => rank(a) - rank(b))
          .map(([status, count]) => ({
            key: status,
            label: t(`platform-companies:state.${status}`, { defaultValue: status }),
            value: count,
          }))
      : [];
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))]">
          {data.companies && (
            <KpiCard
              label={t("kpi.companies")}
              value={data.companies.total}
              trend={trend(data.companies.createdThisMonth)}
              footer={t("kpi.companiesFooter", { count: data.companies.createdLastMonth })}
            />
          )}
          {data.subscriptions && (
            <KpiCard
              label={t("kpi.subscriptions")}
              value={data.subscriptions.active}
              footer={t("kpi.subscriptionsFooter")}
            />
          )}
          {data.leads && (
            <KpiCard
              label={t("kpi.leads")}
              value={data.leads.open}
              trend={trend(data.leads.createdThisMonth)}
              footer={t("kpi.leadsFooter", { count: data.leads.createdLastMonth })}
            />
          )}
          {data.conversionRequests && (
            <KpiCard
              label={t("kpi.requests")}
              value={data.conversionRequests.pending}
              footer={t("kpi.requestsFooter")}
            />
          )}
        </div>
        {data.companies && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
            <SectionCard
              title={t("byLifecycle.title")}
              description={t("byLifecycle.description")}
              contentClassName="p-4"
              action={
                <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
                  {t("byLifecycle.total", { count: data.companies.total })}
                </span>
              }
            >
              <BarList rows={lifecycleRows} />
            </SectionCard>
            <SectionCard
              title={t("recentCompanies.title")}
              description={t("recentCompanies.description")}
              action={
                <Link to={COMPANIES_HREF} className={linkClassName}>
                  {t("recentCompanies.open")}
                </Link>
              }
            >
              {data.companies.latest.length === 0 ? (
                <EmptyState className="py-8" icon={Building2} title={t("recentCompanies.empty")} />
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {data.companies.latest.map((company) => (
                    <li key={company.publicId} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/platform/companies/$publicId"
                          params={{ publicId: company.publicId }}
                          className="block truncate text-[13px] font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
                        >
                          <bdi>{company.name}</bdi>
                        </Link>
                        <p className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
                          <span className="font-mono">{company.companyCode}</span> ·{" "}
                          {formatInstant(company.createdAt, locale)}
                        </p>
                      </div>
                      <Badge
                        variant={company.lifecycleStatus === "ACTIVE" ? "success" : "default"}
                        className="shrink-0 whitespace-nowrap"
                      >
                        {t(`platform-companies:state.${company.lifecycleStatus}`, {
                          defaultValue: company.lifecycleStatus,
                        })}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        )}
        {data.recentActivity && (
          <SectionCard
            title={t("activity.title")}
            description={t("activity.description")}
            action={
              canAudit && (
                <Link to={AUDIT_HREF} className={linkClassName}>
                  {t("activity.open")}
                </Link>
              )
            }
          >
            {data.recentActivity.length === 0 ? (
              <EmptyState className="py-8" icon={History} title={t("activity.empty")} />
            ) : (
              <ActivityFeed
                items={data.recentActivity.map((item, index) => ({
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
        )}
      </div>
    );
  })();

  return (
    <div className="mx-auto min-w-0 max-w-[1480px] space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            {t("greeting", { name: access.user.firstName })}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {(locale === "ar" ? todayFormatters.ar : todayFormatters.en).format(new Date())}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {readsCompanies && (
            <Link
              to={COMPANIES_HREF}
              className={`${actionClassName} border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]`}
            >
              <Building2 size={15} aria-hidden="true" />
              {t("viewCompanies")}
            </Link>
          )}
          {createsLeads && (
            <Link
              to={LEADS_HREF}
              className={`${actionClassName} bg-[var(--color-primary-fill)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fill-hover)]`}
            >
              <Plus size={15} aria-hidden="true" />
              {t("addLead")}
            </Link>
          )}
        </div>
      </header>
      {body}
    </div>
  );
}
