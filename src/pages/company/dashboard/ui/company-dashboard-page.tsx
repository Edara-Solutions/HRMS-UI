import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type OperationKey, useCompanyAccess } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { ProgressBar } from "@/shared/ui/progress-bar";
import { companyDashboardQueries } from "../api/company-dashboard";
import { summarizeSetup, trialDaysRemaining } from "../model/company-dashboard";
import { CompanyDashboardDemo } from "./company-dashboard-demo";
import { DashboardPanel } from "./dashboard-panel";

const linkClassName =
  "inline-flex text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

export function CompanyDashboardPage() {
  const { t } = useTranslation("organization");
  const locale = usePreferencesStore((state) => state.locale);
  const access = useCompanyAccess();
  const userPublicId = access.user?.publicId ?? "";
  const queries = companyDashboardQueries(userPublicId);
  const can = (operation: OperationKey) => access.availability(operation).state !== "hidden";
  const canRegistry = can("GET /api/v1/company/registry");
  const canActivation = can("GET /api/v1/company/activation");
  const canSubscription = can("GET /api/v1/company/subscription");
  const canAccessPolicy = can("GET /api/v1/company/access-policy");
  const canSetup = can("GET /api/v1/company/setup");
  const canEmailReadiness = can("GET /api/v1/company/email-readiness");
  const canProfile = can("GET /api/v1/company/profile");
  const registry = useQuery({ ...queries.registry, enabled: canRegistry });
  const activation = useQuery({ ...queries.activation, enabled: canActivation });
  const subscription = useQuery({ ...queries.subscription, enabled: canSubscription });
  const accessPolicy = useQuery({ ...queries.accessPolicy, enabled: canAccessPolicy });
  const setup = useQuery({ ...queries.setup, enabled: canSetup });
  const emailReadiness = useQuery({ ...queries.emailReadiness, enabled: canEmailReadiness });
  const hasPanels = [
    canRegistry,
    canActivation,
    canSubscription,
    canAccessPolicy,
    canSetup,
    canEmailReadiness,
  ].some(Boolean);
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("dashboard.greeting", { name: access.user.firstName })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">
            {registry.data?.name ?? t("dashboard.title")}
          </h1>
          {registry.data && (
            <Badge variant={registry.data.lifecycleStatus === "ACTIVE" ? "success" : "default"}>
              {t(`lifecycle.${registry.data.lifecycleStatus}`)}
            </Badge>
          )}
        </div>
      </header>

      <CompanyDashboardDemo />

      <div>
        <h2 className="text-base font-semibold">{t("dashboard.liveTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("dashboard.liveHelp")}</p>
      </div>

      {!hasPanels ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("dashboard.noOverview")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {canActivation && (
            <DashboardPanel
              id="dashboard-activation"
              title={t("activation.title")}
              query={activation}
            >
              {(data) => (
                <div className="space-y-3">
                  <p className="font-medium">
                    {data.lifecycleStatus === "ACTIVE" && data.activatedAt
                      ? t("activation.activeSince", {
                          date: formatInstant(data.activatedAt, locale),
                        })
                      : data.canActivate
                        ? t("activation.ready")
                        : t("activation.pending")}
                  </p>
                  {data.unmetRequirements.length > 0 && (
                    <ul className="space-y-1.5 text-[var(--color-text-muted)]">
                      {data.unmetRequirements.map((requirement) => (
                        <li key={requirement.code}>{t(`requirement.${requirement.code}`)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </DashboardPanel>
          )}

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
                      <span className="min-w-0 break-words font-medium">{current.plan.name}</span>
                      <Badge variant={current.status === "ACTIVE" ? "success" : "default"}>
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
                        {t("subscription.endsOn", { date: formatInstant(current.endDate, locale) })}
                      </p>
                    )}
                  </div>
                );
              }}
            </DashboardPanel>
          )}

          {canSetup && (
            <DashboardPanel id="dashboard-setup" title={t("setup.title")} query={setup}>
              {(data) => {
                const progress = summarizeSetup(data);
                return (
                  <div className="space-y-3">
                    <p className="font-medium">
                      {t("setup.progress", { resolved: progress.resolved, total: progress.total })}
                    </p>
                    <div
                      role="progressbar"
                      aria-label={t("setup.title")}
                      aria-valuemin={0}
                      aria-valuemax={progress.total}
                      aria-valuenow={progress.resolved}
                    >
                      <ProgressBar
                        value={
                          progress.total === 0 ? 0 : (progress.resolved / progress.total) * 100
                        }
                      />
                    </div>
                    <p className="text-[var(--color-text-muted)]">
                      {progress.requiredRemaining === 0
                        ? t("setup.requiredDone")
                        : t("setup.requiredRemaining", { count: progress.requiredRemaining })}
                    </p>
                    <Link to="/company/setup" className={linkClassName}>
                      {t("setup.open")}
                    </Link>
                  </div>
                );
              }}
            </DashboardPanel>
          )}

          {canAccessPolicy && (
            <DashboardPanel id="dashboard-access" title={t("access.title")} query={accessPolicy}>
              {(data) => (
                <div className="space-y-2">
                  <Badge variant={data.mode === "NORMAL" ? "success" : "warning"}>
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
                      {t("access.until", { date: formatInstant(data.effectiveUntil, locale) })}
                    </p>
                  )}
                </div>
              )}
            </DashboardPanel>
          )}

          {canEmailReadiness && (
            <DashboardPanel id="dashboard-email" title={t("email.title")} query={emailReadiness}>
              {(data) => (
                <div className="space-y-2">
                  <Badge variant={data.ready ? "success" : "warning"}>
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

          {canRegistry && (
            <DashboardPanel
              id="dashboard-organization"
              title={t("organization.title")}
              query={registry}
            >
              {(data) => (
                <div className="space-y-3">
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
                    <dt className="text-[var(--color-text-muted)]">{t("organization.code")}</dt>
                    <dd className="break-words" dir="ltr">
                      {data.companyCode}
                    </dd>
                    <dt className="text-[var(--color-text-muted)]">{t("organization.country")}</dt>
                    <dd className="break-words">{data.country}</dd>
                    {data.website && (
                      <>
                        <dt className="text-[var(--color-text-muted)]">
                          {t("organization.website")}
                        </dt>
                        <dd className="break-all" dir="ltr">
                          {data.website}
                        </dd>
                      </>
                    )}
                  </dl>
                  {canProfile && (
                    <Link to="/company/profile" className={linkClassName}>
                      {t("organization.openProfile")}
                    </Link>
                  )}
                </div>
              )}
            </DashboardPanel>
          )}
        </div>
      )}
    </div>
  );
}
