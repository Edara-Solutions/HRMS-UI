import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Building2, CreditCard, Package, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  platformCompanyOperations,
  platformLeadOperations,
  platformPlanOperations,
  usePlatformAccess,
} from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";

const sampleKpis = [
  { key: "companies", value: "142", detail: "companiesDetail" },
  { key: "subscriptions", value: "127", detail: "subscriptionsDetail" },
  { key: "revenue", value: "189,450 SAR", detail: "revenueDetail" },
  { key: "health", value: "99.8%", detail: "healthDetail" },
] as const;

const sampleTrend = [120, 135, 142, 155, 162, 170, 175, 180, 185, 189, 195, 200];

const sampleSignups = [
  { name: "Nexus Technologies", plan: "Enterprise", status: "active", people: 85 },
  { name: "CloudNine Solutions", plan: "Professional", status: "onboarding", people: 32 },
  { name: "Digital Dynamics", plan: "Starter", status: "trial", people: 12 },
] as const;

export function PlatformDashboardPage() {
  const { t } = useTranslation("platform-dashboard");
  const access = usePlatformAccess();
  const can = (key: string) => access.availability(key).state === "enabled";

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 [overflow-wrap:anywhere]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("intro")}</p>
        </div>
        {can(platformCompanyOperations.companies.key) && (
          <Link
            to="/platform/companies"
            search={{ page: 1 }}
            className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <Building2 size={16} aria-hidden="true" />
            {t("openCompanies")}
          </Link>
        )}
      </header>

      <section aria-labelledby="platform-live-workflows" className="space-y-3">
        <div>
          <h2 id="platform-live-workflows" className="text-base font-semibold">
            {t("liveTitle")}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">{t("liveHelp")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {can(platformPlanOperations.plans.key) && (
            <WorkflowLink to="/platform/plans" icon={<Package size={18} />} label={t("plans")} />
          )}
          {can(platformLeadOperations.leads.key) && (
            <WorkflowLink to="/platform/leads" icon={<Target size={18} />} label={t("leads")} />
          )}
          {can(platformLeadOperations.requests.key) && (
            <WorkflowLink
              to="/platform/conversion-requests"
              icon={<ArrowUpRight size={18} />}
              label={t("requests")}
            />
          )}
          {can(platformCompanyOperations.subscription.key) && (
            <WorkflowLink
              to="/platform/subscriptions"
              icon={<CreditCard size={18} />}
              label={t("subscriptions")}
            />
          )}
        </div>
      </section>

      <section aria-labelledby="platform-sample-overview" className="space-y-4">
        <div className="flex flex-wrap items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <Badge variant="info">{t("sampleBadge")}</Badge>
          <div>
            <h2 id="platform-sample-overview" className="font-semibold">
              {t("sampleTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("sampleHelp")}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sampleKpis.map((kpi) => (
            <Card key={kpi.key} as="article">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm text-[var(--color-text-muted)]">{t(`kpi.${kpi.key}`)}</p>
                <p className="text-2xl font-bold tabular-nums tracking-tight" dir="auto">
                  {kpi.value}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{t(`kpi.${kpi.detail}`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_292px]">
          <div className="space-y-4">
            <Card as="article">
              <CardHeader>
                <CardTitle>{t("trend")}</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div
                  role="img"
                  aria-label={t("trendDescription")}
                  className="flex h-48 items-end gap-2 border-b border-[var(--color-border)] pb-1"
                >
                  {sampleTrend.map((value, index) => (
                    <div
                      key={index}
                      className="min-w-0 flex-1 rounded-t-[var(--radius-sm)] bg-[var(--color-primary)] opacity-80"
                      style={{ height: `${(value / 210) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{t("jan")}</span>
                  <span>{t("dec")}</span>
                </div>
              </CardContent>
            </Card>
            <Card as="article">
              <CardHeader>
                <CardTitle>{t("recentSignups")}</CardTitle>
              </CardHeader>
              <DataTable
                items={[...sampleSignups]}
                getRowKey={(item) => item.name}
                minWidth="560px"
                columns={[
                  { id: "company", header: t("company"), cell: (item) => <bdi>{item.name}</bdi> },
                  { id: "plan", header: t("plan"), cell: (item) => item.plan },
                  { id: "people", header: t("people"), cell: (item) => item.people },
                  {
                    id: "status",
                    header: t("status"),
                    cell: (item) => (
                      <Badge variant={item.status === "active" ? "success" : "info"}>
                        {t(`sampleStatus.${item.status}`)}
                      </Badge>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
          <div className="space-y-4">
            <Card as="article">
              <CardHeader>
                <CardTitle>{t("mix")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {[
                  ["Enterprise", 33],
                  ["Professional", 46],
                  ["Starter", 21],
                ].map(([name, value]) => (
                  <div key={name}>
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span>{name}</span>
                      <span className="tabular-nums">{value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card as="article">
              <CardHeader>
                <CardTitle>{t("activity")}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ul className="space-y-4 text-sm">
                  {["activityOne", "activityTwo", "activityThree"].map((key) => (
                    <li key={key} className="border-s-2 border-[var(--color-primary)] ps-3">
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

function WorkflowLink({
  to,
  icon,
  label,
}: {
  to:
    | "/platform/plans"
    | "/platform/leads"
    | "/platform/conversion-requests"
    | "/platform/subscriptions";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-16 items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm font-semibold hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      <span className="flex items-center gap-3 text-[var(--color-text)]">
        <span className="text-[var(--color-primary)]" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-[var(--color-text-muted)]"
        aria-hidden="true"
      />
    </Link>
  );
}
