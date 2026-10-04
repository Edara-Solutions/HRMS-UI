import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { platformPlanOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { type CatalogueFilters, plansQuery } from "../api/catalogue";
import { CatalogueEditor } from "./catalogue-editor";
import { CatalogueFilterForm } from "./catalogue-filters";

interface Props {
  search: CatalogueFilters;
}
const planLink = (publicId: string, label: string) => (
  <Link
    className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    to="/platform/plans/$publicId"
    params={{ publicId }}
    search={{}}
  >
    <bdi>{label}</bdi>
  </Link>
);
export function PlatformPlansPage({ search }: Props) {
  const { t } = useTranslation("platform-plans");
  const access = usePlatformAccess();
  const [creating, setCreating] = useState(false);
  const { data, error, isPending, refetch } = useQuery({
    ...plansQuery(access.user?.publicId ?? "", search),
    enabled: access.availability(operations.plans.key).state === "enabled",
    retry: false,
  });
  if (!access.user) return null;
  if (access.availability(operations.plans.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  const plans = data?.data ?? [];
  const canOpen = access.availability(operations.plan.key).state === "enabled";
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 [overflow-wrap:anywhere]">
      <PageHeader
        title={t("title")}
        description={t("intro")}
        action={
          access.availability(operations.create.key).state !== "hidden" && (
            <Button
              intent="cta"
              disabled={
                isPending ||
                !!error ||
                access.availability(operations.create.key).state !== "enabled"
              }
              onClick={() => setCreating(true)}
            >
              {t("createPlan")}
            </Button>
          )
        }
      />
      {data && (
        <div className="grid gap-3 sm:grid-cols-3" aria-label={t("summary")}>
          {[
            [t("totalPlans"), plans.length],
            [t("activePlans"), plans.filter((plan) => plan.isActive).length],
            [t("publishedPlans"), plans.filter((plan) => plan.isPublic).length],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <QueryPanel title={t("filters")}>
        <CatalogueFilterForm search={search} />
      </QueryPanel>
      <QueryPanel
        title={t("catalogue")}
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      >
        {plans.length === 0 && data && (
          <p>{t(Object.keys(search).length ? "noMatches" : "empty")}</p>
        )}
        {plans.length > 0 && (
          <DataTable
            items={plans}
            getRowKey={(plan) => plan.publicId}
            minWidth="720px"
            columns={[
              {
                id: "name",
                header: t("name"),
                cell: (plan) => (
                  <div className="space-y-1">
                    {canOpen ? planLink(plan.publicId, plan.name) : <bdi>{plan.name}</bdi>}
                    <p
                      className="max-w-xs truncate text-xs"
                      dir="auto"
                      title={plan.description ?? ""}
                    >
                      {plan.description}
                    </p>
                  </div>
                ),
              },
              { id: "duration", header: t("duration"), cell: (plan) => plan.duration },
              {
                id: "features",
                header: t("featuresColumn"),
                cell: (plan) => t("featureCount", { count: plan.features.length }),
              },
              {
                id: "visibility",
                header: t("visibility"),
                cell: (plan) => <Badge>{t(plan.isPublic ? "public" : "private")}</Badge>,
              },
              {
                id: "status",
                header: t("status"),
                cell: (plan) => (
                  <Badge variant={plan.isActive ? "success" : "default"}>
                    {t(plan.isActive ? "active" : "inactive")}
                  </Badge>
                ),
              },
              {
                id: "action",
                header: t("action"),
                cell: (plan) => (canOpen ? planLink(plan.publicId, t("manage")) : null),
              },
            ]}
            renderMobileItem={(plan) => (
              <div className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {canOpen ? planLink(plan.publicId, plan.name) : <bdi>{plan.name}</bdi>}
                  <Badge variant={plan.isActive ? "success" : "default"}>
                    {t(plan.isActive ? "active" : "inactive")}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]" dir="auto">
                  {plan.description}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t("featureCount", { count: plan.features.length })} · {t("duration")}:{" "}
                  {plan.duration} · {t(plan.isPublic ? "public" : "private")}
                </p>
              </div>
            )}
          />
        )}
      </QueryPanel>
      {creating && <CatalogueEditor target={{ kind: "plan" }} close={() => setCreating(false)} />}
    </div>
  );
}
