import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";

type SampleStatus = "ACTIVE" | "TRIAL" | "FROZEN" | "CANCELLED" | "EXPIRED";

interface SampleSubscription {
  code: string;
  company: string;
  plan: string;
  status: SampleStatus;
  flags: string;
  trialEnd: string | null;
  subscriptionEnd: string | null;
}

// Historical fixture values are presentation examples, never Company records or API results.
const samples: SampleSubscription[] = [
  {
    code: "NEXUS",
    company: "Nexus Technologies",
    plan: "Enterprise",
    status: "ACTIVE",
    flags: "",
    trialEnd: null,
    subscriptionEnd: "2027-05-20",
  },
  {
    code: "CLOUD",
    company: "CloudNine Solutions",
    plan: "Professional",
    status: "TRIAL",
    flags: "",
    trialEnd: "2026-06-18",
    subscriptionEnd: null,
  },
  {
    code: "DIGDYN",
    company: "Digital Dynamics",
    plan: "Starter",
    status: "TRIAL",
    flags: "",
    trialEnd: "2026-06-15",
    subscriptionEnd: null,
  },
  {
    code: "INNOV",
    company: "Innovate Corp",
    plan: "Enterprise",
    status: "ACTIVE",
    flags: "",
    trialEnd: null,
    subscriptionEnd: "2027-05-12",
  },
  {
    code: "SWIFT",
    company: "Swift Systems",
    plan: "Professional",
    status: "FROZEN",
    flags: "frozen",
    trialEnd: null,
    subscriptionEnd: "2027-05-10",
  },
  {
    code: "TVISTA",
    company: "TechVista Inc",
    plan: "Starter",
    status: "ACTIVE",
    flags: "",
    trialEnd: null,
    subscriptionEnd: "2027-05-08",
  },
  {
    code: "GULF",
    company: "Gulf Analytics",
    plan: "Professional",
    status: "ACTIVE",
    flags: "",
    trialEnd: null,
    subscriptionEnd: "2027-04-28",
  },
];

const statuses: SampleStatus[] = ["ACTIVE", "TRIAL", "FROZEN", "CANCELLED", "EXPIRED"];
const statusVariant: Record<
  SampleStatus,
  "success" | "primary" | "warning" | "danger" | "default"
> = {
  ACTIVE: "success",
  TRIAL: "primary",
  FROZEN: "warning",
  CANCELLED: "danger",
  EXPIRED: "default",
};
const pageSize = 5;

export function PlatformSubscriptionsDemo() {
  const { t, i18n } = useTranslation("platform-companies");
  const [status, setStatus] = useState<SampleStatus | "">("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = samples.filter((sample) => {
    if (status && sample.status !== status) return false;
    const term = query.trim().toLocaleLowerCase();
    return (
      !term ||
      [sample.company, sample.code, sample.plan].some((value) =>
        value.toLocaleLowerCase().includes(term),
      )
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const date = (value: string | null) =>
    value
      ? new Date(`${value}T00:00:00Z`).toLocaleDateString(
          i18n.language === "ar" ? "ar-SA-u-ca-gregory" : "en-GB",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          },
        )
      : "—";
  const statusBadge = (sample: SampleSubscription) => (
    <Badge variant={statusVariant[sample.status]}>
      {t(`subscriptionDemo.status.${sample.status}`)}
    </Badge>
  );

  return (
    <section aria-labelledby="subscription-demo-title" className="space-y-4">
      <div className="flex flex-wrap items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
        <Badge variant="info">{t("subscriptionDemo.badge")}</Badge>
        <div>
          <h2 id="subscription-demo-title" className="font-semibold">
            {t("subscriptionDemo.title")}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t("subscriptionDemo.help")}
          </p>
        </div>
      </div>
      <div className="grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
        {statuses.map((entry) => (
          <Card key={entry} as="article">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {t(`subscriptionDemo.status.${entry}`)}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {samples.filter((sample) => sample.status === entry).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label={t("subscriptionDemo.statusFilter")}
            >
              <Button
                size="sm"
                variant="ghost"
                pressed={!status}
                onClick={() => {
                  setStatus("");
                  setPage(1);
                }}
              >
                {t("subscriptionDemo.all")}
              </Button>
              {statuses.map((entry) => (
                <Button
                  key={entry}
                  size="sm"
                  variant="ghost"
                  pressed={status === entry}
                  onClick={() => {
                    setStatus(entry);
                    setPage(1);
                  }}
                >
                  {t(`subscriptionDemo.status.${entry}`)}
                </Button>
              ))}
            </div>
            <label className="w-full sm:ms-auto sm:max-w-xs">
              <span className="sr-only">{t("subscriptionDemo.search")}</span>
              <Input
                type="search"
                value={query}
                placeholder={t("subscriptionDemo.search")}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          {visible.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t("subscriptionDemo.empty")}</p>
          ) : (
            <DataTable
              items={visible}
              getRowKey={(sample) => sample.code}
              minWidth="820px"
              columns={[
                {
                  id: "company",
                  header: t("field.name"),
                  cell: (sample) => (
                    <span className="font-medium text-[var(--color-text)]">
                      <bdi>{sample.company}</bdi>
                      <span className="block text-xs text-[var(--color-text-muted)]">
                        {sample.code}
                      </span>
                    </span>
                  ),
                },
                { id: "plan", header: t("subscription.plan"), cell: (sample) => sample.plan },
                { id: "status", header: t("subscription.status"), cell: statusBadge },
                {
                  id: "flags",
                  header: t("subscriptionDemo.flags"),
                  cell: (sample) =>
                    sample.flags ? (
                      <Badge variant="warning">{t(`subscriptionDemo.flag.${sample.flags}`)}</Badge>
                    ) : (
                      "—"
                    ),
                },
                {
                  id: "trialEnd",
                  header: t("subscription.trialEndDate"),
                  cell: (sample) => date(sample.trialEnd),
                },
                {
                  id: "subscriptionEnd",
                  header: t("subscription.endDate"),
                  cell: (sample) => date(sample.subscriptionEnd),
                },
              ]}
              renderMobileItem={(sample) => (
                <div className="space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      <bdi>{sample.company}</bdi>
                    </span>
                    {statusBadge(sample)}
                  </div>
                  <p className="text-[var(--color-text-muted)]">
                    {sample.code} · {sample.plan}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t("subscription.trialEndDate")}: {date(sample.trialEnd)} ·{" "}
                    {t("subscription.endDate")}: {date(sample.subscriptionEnd)}
                  </p>
                </div>
              )}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
            <span>
              {t("subscriptionDemo.count", { shown: filtered.length, total: samples.length })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                intent="navigation"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t("previous")}
              </Button>
              <span>{t("page", { page, total: pageCount })}</span>
              <Button
                size="sm"
                intent="navigation"
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
