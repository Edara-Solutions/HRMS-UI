import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { platformPlanOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { type CatalogueFilters, plansQuery } from "../api/catalogue";
import { CatalogueEditor } from "./catalogue-editor";
import { CatalogueFilterForm } from "./catalogue-filters";

interface Props {
  search: CatalogueFilters;
}
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
      <QueryPanel title={t("filters")}>
        <CatalogueFilterForm search={search} />
      </QueryPanel>
      <QueryPanel
        title={t("catalogue")}
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      >
        {data?.data.length === 0 && <p>{t(Object.keys(search).length ? "noMatches" : "empty")}</p>}
        <ul className="divide-y divide-[var(--color-border)]">
          {data?.data.map((plan) => (
            <li key={plan.publicId} className="space-y-2 py-4">
              {access.availability(operations.plan.key).state === "enabled" ? (
                <Link
                  className="font-semibold underline"
                  to="/platform/plans/$publicId"
                  params={{ publicId: plan.publicId }}
                  search={{}}
                >
                  <bdi>{plan.name}</bdi>
                </Link>
              ) : (
                <h2>
                  <bdi>{plan.name}</bdi>
                </h2>
              )}
              <p dir="auto">{plan.description}</p>
              <p>
                {t(plan.isActive ? "active" : "inactive")} ·{" "}
                {t(plan.isPublic ? "public" : "private")}
              </p>
            </li>
          ))}
        </ul>
      </QueryPanel>
      {creating && <CatalogueEditor target={{ kind: "plan" }} close={() => setCreating(false)} />}
    </div>
  );
}
