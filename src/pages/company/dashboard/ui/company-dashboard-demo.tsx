import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { ProgressBar } from "@/shared/ui/progress-bar";

const sampleKpis = [
  {
    key: "headcount",
    value: "248",
    detail: "headcountDetail",
    trend: "+6",
    sparkline: [20, 17, 14, 11, 8, 5, 3, 2],
  },
  {
    key: "roles",
    value: "14",
    detail: "rolesDetail",
    trend: "+3",
    sparkline: [18, 14, 19, 11, 15, 8, 12, 7],
  },
  {
    key: "tenure",
    value: "2.4",
    detail: "tenureDetail",
    trend: "≈",
    sparkline: [13, 11, 15, 12, 10, 14, 11, 10],
  },
  {
    key: "approvals",
    value: "11",
    detail: "approvalsDetail",
    trend: "!",
    sparkline: [17, 7, 16, 5, 13, 4, 9, 6],
  },
] as const;

const sampleTrend = [200, 210, 218, 225, 230, 235, 238, 240, 242, 245, 247, 248];

const samplePeople = [
  {
    name: "Salma Adel",
    role: "Senior Product Designer",
    department: "Product",
    status: "review",
    next: "Schedule Q2 check-in",
    timeOff: "14 days",
  },
  {
    name: "Youssef Khaled",
    role: "Frontend Engineer",
    department: "Engineering",
    status: "active",
    next: "Approve equipment request",
    timeOff: "9 days",
  },
  {
    name: "Nour Mostafa",
    role: "People Partner",
    department: "People Ops",
    status: "attention",
    next: "Resolve attendance exception",
    timeOff: "21 days",
  },
  {
    name: "Omar Amin",
    role: "Sales Manager",
    department: "Sales",
    status: "complete",
    next: "Archive signed addendum",
    timeOff: "6 days",
  },
  {
    name: "Lina Riad",
    role: "Legal Counsel",
    department: "Legal",
    status: "review",
    next: "Renewal clause sign-off",
    timeOff: "18 days",
  },
] as const;

const sampleEvents = [
  {
    day: "22",
    month: "May",
    title: "Payroll lock window",
    detail: "Finance and People checkpoint",
  },
  { day: "23", month: "May", title: "Engineering onboarding", detail: "Four new hires" },
  { day: "26", month: "May", title: "Performance calibration", detail: "Q2 leadership review" },
  { day: "29", month: "May", title: "Recruitment panel", detail: "Three candidates" },
] as const;

const sampleDepartments = [
  { name: "Engineering", count: 72, color: "primary" },
  { name: "Sales", count: 46, color: "info" },
  { name: "Operations", count: 34, color: "warning" },
  { name: "Product", count: 28, color: "success" },
  { name: "Finance", count: 22, color: "faint" },
  { name: "People Ops", count: 18, color: "faint" },
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
              <div className="flex items-end justify-between gap-3">
                <p className="text-2xl font-bold tabular-nums tracking-tight" dir="auto">
                  {kpi.value}
                </p>
                <span className="text-xs font-semibold text-[var(--color-primary)]">
                  {kpi.trend}
                </span>
              </div>
              <div className="flex h-7 items-end gap-0.5" aria-hidden="true">
                {kpi.sparkline.map((point, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t-sm bg-[var(--color-primary)]/65"
                    style={{ height: `${Math.max(20, (point / 20) * 100)}%` }}
                  />
                ))}
              </div>
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
              minWidth="820px"
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
                {
                  id: "next",
                  header: t("dashboard.demo.nextAction"),
                  cell: (person) => person.next,
                },
                {
                  id: "timeOff",
                  header: t("dashboard.demo.timeOff"),
                  cell: (person) => person.timeOff,
                },
              ]}
            />
          </Card>
          <Card as="article">
            <CardHeader>
              <CardTitle>{t("dashboard.demo.shortcuts")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 sm:grid-cols-2">
              {[
                "peopleShortcut",
                "approvalsShortcut",
                "performanceShortcut",
                "payrollShortcut",
              ].map((key) => (
                <div
                  key={key}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm font-medium"
                >
                  {t(`dashboard.demo.${key}`)}
                </div>
              ))}
              <p className="text-xs text-[var(--color-text-muted)] sm:col-span-2">
                {t("dashboard.demo.shortcutsHelp")}
              </p>
            </CardContent>
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
              <CardTitle>{t("dashboard.demo.events")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="divide-y divide-[var(--color-border)] text-sm">
                {sampleEvents.map((event) => (
                  <li key={event.day} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-center text-xs">
                      <span className="block">{event.month}</span>
                      <strong>{event.day}</strong>
                    </span>
                    <span>
                      <strong className="block font-medium">{event.title}</strong>
                      <span className="text-xs text-[var(--color-text-muted)]">{event.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card as="article">
            <CardHeader>
              <CardTitle>{t("dashboard.demo.departmentMix")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {sampleDepartments.map((department) => (
                <div
                  key={department.name}
                  className="grid grid-cols-[90px_1fr_30px] items-center gap-2 text-xs"
                >
                  <span className="truncate">{department.name}</span>
                  <ProgressBar value={department.count} color={department.color} />
                  <span className="text-end tabular-nums">{department.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card as="article">
            <CardHeader>
              <CardTitle>{t("dashboard.demo.activity")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-4 text-sm">
                {[
                  "activityOne",
                  "activityTwo",
                  "activityThree",
                  "activityFour",
                  "activityFive",
                ].map((key) => (
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
