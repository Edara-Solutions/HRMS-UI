import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ListChecks, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  isCompanyBlocked,
  type OperationKey,
  useCompanyAccess,
} from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { companyDashboardQueries } from "../api/company-dashboard";
import { type CompanyOverview, monthTrend, trialDaysRemaining } from "../model/company-dashboard";
import { DashboardPanel } from "./dashboard-panel";
import { KpiCard } from "./kpi-card";
import { NextSetupSteps, PeopleByStatus, RecentActivity } from "./overview-sections";

const actionClassName =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

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

function todayLine(locale: string) {
  return (locale === "ar" ? todayFormatters.ar : todayFormatters.en).format(new Date());
}

export function CompanyDashboardPage() {
  const { t } = useTranslation("organization");
  const locale = usePreferencesStore((state) => state.locale);
  const access = useCompanyAccess();
  const queries = companyDashboardQueries(access.user?.publicId ?? "");
  const can = (operation: OperationKey) => access.availability(operation).state !== "hidden";
  const canRegistry = can("GET /api/v1/company/registry");
  const canSubscription = can("GET /api/v1/company/subscription");
  const canAccessPolicy = can("GET /api/v1/company/access-policy");
  const canEmailReadiness = can("GET /api/v1/company/email-readiness");
  const overview = useQuery({ ...queries.overview, enabled: !!access.user });
  const registry = useQuery({ ...queries.registry, enabled: canRegistry });
  const subscription = useQuery({ ...queries.subscription, enabled: canSubscription });
  const accessPolicy = useQuery({ ...queries.accessPolicy, enabled: canAccessPolicy });
  const emailReadiness = useQuery({ ...queries.emailReadiness, enabled: canEmailReadiness });
  if (!access.user) return null;
  if (isCompanyBlocked(overview.error)) throw overview.error;

  const canAddPerson = access.availability("POST /api/v1/company/users").state === "enabled";
  const canAudit = can("GET /api/v1/company/audit-trail");
  const showRail = canSubscription || canAccessPolicy || canEmailReadiness;

  return (
    <div className="mx-auto min-w-0 max-w-[1480px] space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("dashboard.greeting", { name: access.user.firstName })}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-[26px] font-bold tracking-tight text-[var(--color-text)]">
              {registry.data?.name ?? t("dashboard.title")}
            </h1>
            {registry.data && (
              <Badge
                variant={registry.data.lifecycleStatus === "ACTIVE" ? "success" : "default"}
                className="shrink-0 whitespace-nowrap"
              >
                {t(`lifecycle.${registry.data.lifecycleStatus}`)}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{todayLine(locale)}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canAddPerson && (
            <Link
              to="/company/people"
              className={`${actionClassName} border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]`}
            >
              <UserPlus size={15} aria-hidden="true" />
              {t("dashboard.addPerson")}
            </Link>
          )}
          {overview.data?.setup && (
            <Link
              to="/company/setup"
              className={`${actionClassName} bg-[var(--color-primary-fill)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-fill-hover)]`}
            >
              <ListChecks size={15} aria-hidden="true" />
              {t("dashboard.reviewSetup")}
            </Link>
          )}
        </div>
      </header>

      <OverviewBody
        overview={overview}
        canAudit={canAudit}
        rail={
          showRail && (
            <aside aria-label={t("dashboard.rail.title")} className="flex min-w-0 flex-col gap-4">
              {canSubscription && (
                <DashboardPanel
                  id="dashboard-subscription"
                  title={t("subscription.title")}
                  query={subscription}
                >
                  {({ subscription: current }) => {
                    const daysLeft = trialDaysRemaining(current);
                    return (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-0 break-words font-medium">
                            {current.plan.name}
                          </span>
                          <Badge
                            variant={current.status === "ACTIVE" ? "success" : "default"}
                            className="shrink-0 whitespace-nowrap"
                          >
                            {t(`subscription.status.${current.status}`)}
                          </Badge>
                        </div>
                        {daysLeft !== null && (
                          <p className="text-[var(--color-text-muted)]">
                            {t("subscription.trialEnds", {
                              count: daysLeft,
                              date: formatInstant(current.trialEndDate, locale),
                            })}
                          </p>
                        )}
                        {current.endDate && (
                          <p className="text-[var(--color-text-muted)]">
                            {t("subscription.endsOn", {
                              date: formatInstant(current.endDate, locale),
                            })}
                          </p>
                        )}
                      </div>
                    );
                  }}
                </DashboardPanel>
              )}
              {canAccessPolicy && (
                <DashboardPanel
                  id="dashboard-access"
                  title={t("access.title")}
                  query={accessPolicy}
                >
                  {(data) => (
                    <div className="space-y-2">
                      <Badge
                        variant={data.mode === "NORMAL" ? "success" : "warning"}
                        className="whitespace-nowrap"
                      >
                        {t(`access.mode.${data.mode}`)}
                      </Badge>
                      {data.mode !== "NORMAL" && (
                        <p className="text-[var(--color-text-muted)]">
                          {t(`access.${data.mode}.description`)}
                        </p>
                      )}
                      {data.reason && <p className="break-words">{data.reason}</p>}
                      {data.effectiveUntil && (
                        <p className="text-[var(--color-text-muted)]">
                          {t("access.until", {
                            date: formatInstant(data.effectiveUntil, locale),
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </DashboardPanel>
              )}
              {canEmailReadiness && (
                <DashboardPanel
                  id="dashboard-email"
                  title={t("email.title")}
                  query={emailReadiness}
                >
                  {(data) => (
                    <div className="space-y-2">
                      <Badge
                        variant={data.ready ? "success" : "warning"}
                        className="whitespace-nowrap"
                      >
                        {data.ready ? t("email.ready") : t("email.notReady")}
                      </Badge>
                      {!data.ready && data.reason && (
                        <p className="text-[var(--color-text-muted)]">
                          {t(`email.reason.${data.reason}`)}
                        </p>
                      )}
                    </div>
                  )}
                </DashboardPanel>
              )}
            </aside>
          )
        }
      />
    </div>
  );
}

interface OverviewBodyProps {
  overview: ReturnType<typeof useQuery<CompanyOverview>>;
  canAudit: boolean;
  rail: React.ReactNode;
}

function OverviewBody({ overview, canAudit, rail }: OverviewBodyProps) {
  const { t } = useTranslation("organization");
  const data = overview.data;
  const main = (() => {
    if (overview.isPending)
      return (
        <output aria-label={t("dashboard.loading")} className="block space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-56" />
        </output>
      );
    if (overview.error)
      return (
        <Card>
          <EmptyState
            role="alert"
            icon={LayoutDashboard}
            title={t("dashboard.error.title")}
            description={
              overview.error instanceof ContractViolation
                ? t("dashboard.contract")
                : t("dashboard.error.description")
            }
            action={
              !(overview.error instanceof ContractViolation) && (
                <Button variant="secondary" size="sm" onClick={() => void overview.refetch()}>
                  {t("dashboard.error.action")}
                </Button>
              )
            }
          />
        </Card>
      );
    if (!data) return null;
    const hasAny = Boolean(data.people || data.roles || data.setup || data.recentActivity);
    if (!hasAny)
      return (
        <Card>
          <EmptyState
            icon={LayoutDashboard}
            title={t("dashboard.empty.title")}
            description={t("dashboard.empty.description")}
          />
        </Card>
      );
    const setupLeft = data.setup ? data.setup.total - data.setup.completed : 0;
    const trend = (added: number) => {
      const value = monthTrend(added);
      return {
        rising: value.rising,
        label: value.rising
          ? t("dashboard.trend.up", { count: value.added })
          : t("dashboard.trend.none"),
      };
    };
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] 2xl:grid-cols-[repeat(4,minmax(0,1fr))]">
          {data.people && (
            <KpiCard
              label={t("dashboard.kpi.people")}
              value={data.people.total}
              trend={trend(data.people.createdThisMonth)}
              footer={t("dashboard.kpi.peopleFooter", { count: data.people.createdLastMonth })}
            />
          )}
          {data.invitations && (
            <KpiCard
              label={t("dashboard.kpi.invitations")}
              value={data.invitations.pending}
              footer={t("dashboard.kpi.invitationsFooter")}
            />
          )}
          {data.roles && (
            <KpiCard
              label={t("dashboard.kpi.roles")}
              value={data.roles.total}
              footer={t("dashboard.kpi.rolesFooter")}
            />
          )}
          {data.setup && (
            <KpiCard
              label={t("dashboard.kpi.setup")}
              value={`${data.setup.completed}/${data.setup.total}`}
              footer={
                setupLeft > 0
                  ? t("dashboard.kpi.setupFooter", { count: setupLeft })
                  : t("dashboard.kpi.setupDone")
              }
            />
          )}
        </div>
        {data.people && <PeopleByStatus people={data.people} />}
        {data.setup && <NextSetupSteps setup={data.setup} />}
        {data.recentActivity && (
          <RecentActivity items={data.recentActivity} canOpenAudit={canAudit} />
        )}
      </div>
    );
  })();

  return rail ? (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_292px]">
      {main}
      {rail}
    </div>
  ) : (
    main
  );
}
