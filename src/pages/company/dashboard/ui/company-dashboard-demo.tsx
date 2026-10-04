import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";

const sampleKpis = [
  { key: "headcount", value: "248", detail: "headcountDetail" },
  { key: "roles", value: "14", detail: "rolesDetail" },
  { key: "tenure", value: "2.4", detail: "tenureDetail" },
  { key: "approvals", value: "11", detail: "approvalsDetail" },
] as const;

const sampleTrend = [200, 210, 218, 225, 230, 235, 238, 240, 242, 245, 247, 248];

const samplePeople = [
  { name: "Salma Adel", role: "Senior Product Designer", department: "Product", status: "review" },
  {
    name: "Youssef Khaled",
    role: "Frontend Engineer",
    department: "Engineering",
    status: "active",
  },
  { name: "Nour Mostafa", role: "People Partner", department: "People Ops", status: "attention" },
] as const;

export function CompanyDashboardDemo() {
  const { t } = useTranslation("organization");
  return (
    <section aria-labelledby="company-demo-title" className="space-y-4">
      <div className="flex flex-wrap items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <Badge variant="info">{t("dashboard.demo.badge")}</Badge>
        <div>
          <h2 id="company-demo-title" className="font-semibold">
            {t("dashboard.demo.title")}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("dashboard.demo.help")}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sampleKpis.map((kpi) => (
          <Card key={kpi.key} as="article">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                {t(`dashboard.demo.${kpi.key}`)}
              </p>
              <p className="text-2xl font-bold tabular-nums tracking-tight" dir="auto">
                {kpi.value}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t(`dashboard.demo.${kpi.detail}`)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_292px]">
        <div className="space-y-4">
          <Card as="article">
            <CardHeader>
              <CardTitle>{t("dashboard.demo.trend")}</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div
                role="img"
                aria-label={t("dashboard.demo.trendDescription")}
                className="flex h-48 items-end gap-2 border-b border-[var(--color-border)] pb-1"
              >
                {sampleTrend.map((value, index) => (
                  <div
                    key={index}
                    className="min-w-0 flex-1 rounded-t-[var(--radius-sm)] bg-[var(--color-primary)] opacity-80"
                    style={{ height: `${(value / 260) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>{t("dashboard.demo.jan")}</span>
                <span>{t("dashboard.demo.dec")}</span>
              </div>
            </CardContent>
          </Card>
          <Card as="article">
            <CardHeader>
              <CardTitle>{t("dashboard.demo.people")}</CardTitle>
            </CardHeader>
            <DataTable
              items={[...samplePeople]}
              getRowKey={(person) => person.name}
              minWidth="590px"
              columns={[
                {
                  id: "name",
                  header: t("dashboard.demo.person"),
                  cell: (person) => <bdi>{person.name}</bdi>,
                },
                { id: "role", header: t("dashboard.demo.role"), cell: (person) => person.role },
                {
                  id: "department",
                  header: t("dashboard.demo.department"),
                  cell: (person) => person.department,
                },
                {
                  id: "status",
                  header: t("dashboard.demo.status"),
                  cell: (person) => (
                    <Badge variant={person.status === "active" ? "success" : "warning"}>
                      {t(`dashboard.demo.${person.status}`)}
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
              <CardTitle>{t("dashboard.demo.queue")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="divide-y divide-[var(--color-border)] text-sm">
                {["approvalOne", "approvalTwo", "approvalThree"].map((key) => (
                  <li key={key} className="py-3 first:pt-0 last:pb-0">
                    {t(`dashboard.demo.${key}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card as="article">
            <CardHeader>
              <CardTitle>{t("dashboard.demo.activity")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-4 text-sm">
                {["activityOne", "activityTwo", "activityThree"].map((key) => (
                  <li key={key} className="border-s-2 border-[var(--color-primary)] ps-3">
                    {t(`dashboard.demo.${key}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
