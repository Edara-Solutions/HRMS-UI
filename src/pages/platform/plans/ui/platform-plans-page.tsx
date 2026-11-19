import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  platformPlanOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { KpiCard } from "@/shared/ui/kpi-card";
import { Skeleton } from "@/shared/ui/skeleton";
import { type CatalogueFilters, type Plan, plansQuery } from "../api/catalogue";
import { supportedPlanFeatures } from "../model/catalogue-form";
import { CatalogueEditor } from "./catalogue-editor";
import { CatalogueFilterForm } from "./catalogue-filters";

interface Props {
  search: CatalogueFilters;
}

const nowrapBadge = "shrink-0 whitespace-nowrap";

const planLink = (publicId: string, label: string) => (
  <Link
    className="whitespace-nowrap font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    to="/platform/plans/$publicId"
    params={{ publicId }}
    search={{}}
  >
    <bdi>{label}</bdi>
  </Link>
);

export function PlatformPlansPage({ search }: Props) {
  const { t, i18n } = useTranslation("platform-plans");
  const access = usePlatformAccess();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const filters = search ?? {};
  const { data, error, isPending, refetch } = useQuery({
    ...plansQuery(access.user?.publicId ?? "", filters),
    enabled: access.availability(operations.plans.key).state === "enabled",
    retry: false,
  });
  if (!access.user) return null;
  if (access.availability(operations.plans.key).state === "hidden")
    throw new RouteAccessRefusal("platform");

  const plans = data?.data ?? [];
  const filtered = Object.values(filters).some((value) => value !== undefined && value !== "");
  const canOpen = access.availability(operations.plan.key).state === "enabled";
  const canEdit = access.availability(operations.update.key).state === "enabled";
  const create = access.availability(operations.create.key);
  const featureLabel = (code: string) =>
    supportedPlanFeatures.has(code) ? t(`feature.${code}`) : code;
  const updatedDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  const limitsOf = (plan: Plan) =>
    Object.entries(plan.limits ?? {}).map(([key, value]) => `${t(key)}: ${value}`);
  const header = (label: string) => <span className="whitespace-nowrap">{label}</span>;

  return (
    <div className="mx-auto min-w-0 max-w-[1480px] space-y-4">
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("intro")}</p>
        </div>
        {create.state !== "hidden" && (
          <Button
            intent="cta"
            className="shrink-0 self-start sm:self-auto"
            disabled={isPending || !!error || create.state !== "enabled"}
            onClick={() => setCreating(true)}
          >
            {t("createPlan")}
          </Button>
        )}
      </div>

      {data && (
        <section
          aria-label={t("summary")}
          className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]"
        >
          <KpiCard label={t("totalPlans")} value={plans.length} footer={t("shownFooter")} />
          <KpiCard
            label={t("activePlans")}
            value={plans.filter((plan) => plan.isActive).length}
            footer={t("inactiveFooter", { count: plans.filter((plan) => !plan.isActive).length })}
          />
          <KpiCard
            label={t("publishedPlans")}
            value={plans.filter((plan) => plan.isPublic).length}
            footer={t("privateFooter", { count: plans.filter((plan) => !plan.isPublic).length })}
          />
        </section>
      )}

      <CatalogueFilterForm search={filters} />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isPending && (
            <output aria-label={t("loading")} className="block space-y-3 p-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </output>
          )}
          {error && (
            <EmptyState
              role="alert"
              icon={Package}
              title={t("errorTitle")}
              description={
                error instanceof ContractViolation ? t("contract") : t("errorDescription")
              }
              action={
                !(error instanceof ContractViolation) && (
                  <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                    {t("errorAction")}
                  </Button>
                )
              }
            />
          )}
          {data && plans.length === 0 && (
            <EmptyState
              icon={Package}
              title={t(filtered ? "noMatchesTitle" : "empty")}
              description={t(filtered ? "noMatchesDescription" : "emptyDescription")}
            />
          )}
          {plans.length > 0 && (
            <DataTable
              items={plans}
              getRowKey={(plan) => plan.publicId}
              minWidth="1080px"
              mobileBreakpoint="lg"
              columns={[
                {
                  id: "name",
                  header: header(t("name")),
                  cell: (plan) => (
                    <div className="min-w-0 max-w-[18rem] space-y-1">
                      {canOpen ? planLink(plan.publicId, plan.name) : <bdi>{plan.name}</bdi>}
                      <p
                        className="truncate text-xs text-[var(--color-text-muted)]"
                        dir="auto"
                        title={plan.description ?? ""}
                      >
                        {plan.description}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "duration",
                  header: header(t("duration")),
                  align: "center",
                  className: "tabular-nums",
                  cell: (plan) => plan.duration,
                },
                {
                  id: "features",
                  header: header(t("featuresColumn")),
                  cell: (plan) => (
                    <div className="flex max-w-[16rem] flex-wrap gap-1">
                      {plan.features.map((feature) => (
                        <Badge key={feature} variant="default" className={nowrapBadge}>
                          <bdi>{featureLabel(feature)}</bdi>
                        </Badge>
                      ))}
                    </div>
                  ),
                },
                {
                  id: "limits",
                  header: header(t("limits")),
                  cell: (plan) => {
                    const limits = limitsOf(plan);
                    return limits.length ? (
                      <div className="space-y-0.5 text-xs">
                        {limits.map((line) => (
                          <p key={line} className="whitespace-nowrap">
                            <bdi>{line}</bdi>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[var(--color-text-faint)]">{t("noLimits")}</span>
                    );
                  },
                },
                {
                  id: "visibility",
                  header: header(t("visibility")),
                  cell: (plan) => (
                    <Badge variant={plan.isPublic ? "primary" : "default"} className={nowrapBadge}>
                      {t(plan.isPublic ? "public" : "private")}
                    </Badge>
                  ),
                },
                {
                  id: "status",
                  header: header(t("status")),
                  cell: (plan) => (
                    <Badge variant={plan.isActive ? "success" : "default"} className={nowrapBadge}>
                      {t(plan.isActive ? "active" : "inactive")}
                    </Badge>
                  ),
                },
                {
                  id: "updated",
                  header: header(t("updated")),
                  className:
                    "whitespace-nowrap tabular-nums text-xs text-[var(--color-text-muted)]",
                  cell: (plan) => (
                    <time dateTime={plan.updatedAt}>{updatedDate(plan.updatedAt)}</time>
                  ),
                },
                {
                  id: "action",
                  header: <span className="sr-only">{t("action")}</span>,
                  align: "end",
                  cell: (plan) => (
                    <div className="flex items-center justify-end gap-3">
                      {canOpen && planLink(plan.publicId, t("manage"))}
                      {canEdit && plan.deletedAt === null && (
                        <Button
                          variant="secondary"
                          size="xs"
                          className="whitespace-nowrap"
                          onClick={() => setEditing(plan)}
                        >
                          {t("editPlan")}
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
              renderMobileItem={(plan) => (
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {canOpen ? planLink(plan.publicId, plan.name) : <bdi>{plan.name}</bdi>}
                    </div>
                    <Badge variant={plan.isActive ? "success" : "default"} className={nowrapBadge}>
                      {t(plan.isActive ? "active" : "inactive")}
                    </Badge>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-[var(--color-text-muted)]" dir="auto">
                      {plan.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t("featureCount", { count: plan.features.length })} · {t("duration")}:{" "}
                    {plan.duration} · {t(plan.isPublic ? "public" : "private")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {plan.features.map((feature) => (
                      <Badge key={feature} variant="default" className={nowrapBadge}>
                        <bdi>{featureLabel(feature)}</bdi>
                      </Badge>
                    ))}
                  </div>
                  {limitsOf(plan).length > 0 && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {limitsOf(plan).join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-faint)]">
                    {t("updated")}:{" "}
                    <time dateTime={plan.updatedAt}>{updatedDate(plan.updatedAt)}</time>
                  </p>
                  {canEdit && plan.deletedAt === null && (
                    <Button variant="secondary" size="sm" onClick={() => setEditing(plan)}>
                      {t("editPlan")}
                    </Button>
                  )}
                </div>
              )}
            />
          )}
        </CardContent>
        {data && plans.length > 0 && (
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
              {t("planCount", { count: plans.length })}
            </span>
          </div>
        )}
      </Card>

      {creating && <CatalogueEditor target={{ kind: "plan" }} close={() => setCreating(false)} />}
      {editing && (
        <CatalogueEditor target={{ kind: "plan", plan: editing }} close={() => setEditing(null)} />
      )}
    </div>
  );
}
