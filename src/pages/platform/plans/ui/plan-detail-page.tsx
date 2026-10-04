import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  platformPlanOperations as operations,
  requestPlatformOperation,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import {
  type Market,
  type Price,
  planQuery,
  pricesQuery,
  recheckPrice,
  StaleCatalogue,
  verifyTarget,
} from "../api/catalogue";
import { useCatalogueCommand } from "../model/use-catalogue-command";
import { CatalogueEditor, type EditorTarget } from "./catalogue-editor";
import { CommandFeedback } from "./command-feedback";
import { MarketInspection } from "./market-inspection";

interface Props {
  publicId: string;
  search: Partial<Market>;
}
export function PlatformPlanDetailPage({ publicId, search }: Props) {
  const { t } = useTranslation("platform-plans");
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const command = useCatalogueCommand();
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [deleting, setDeleting] = useState<"plan" | Price | null>(null);
  const {
    data: planData,
    error: planError,
    isPending: planPending,
    isFetching: planFetching,
    refetch: refetchPlan,
  } = useQuery({
    ...planQuery(access.user?.publicId ?? "", publicId),
    enabled: access.availability(operations.plan.key).state === "enabled",
    retry: false,
  });
  const {
    data: pricesData,
    error: pricesError,
    isPending: pricesPending,
    isFetching: pricesFetching,
    refetch: refetchPrices,
  } = useQuery({
    ...pricesQuery(access.user?.publicId ?? "", publicId),
    enabled:
      access.availability(operations.prices.key).state === "enabled" && !!planData && !planError,
    retry: false,
  });
  if (!access.user) return null;
  if (access.availability(operations.plan.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  const allowed = (key: string) => access.availability(key).state !== "hidden";
  const disabled = (key: string) =>
    command.pending ||
    command.blocked ||
    !!planError ||
    planFetching ||
    !planData ||
    planData.deletedAt !== null ||
    access.availability(key).state !== "enabled";
  async function remove() {
    if (!deleting || !planData) return;
    const target = deleting;
    const operation = target === "plan" ? operations.remove : operations.removePrice;
    await command.run(
      operation.key,
      async (check) => {
        if (target === "plan") {
          const fresh = await requestPlatformOperation(operations.plan, {
            params: { publicId },
            query: {},
          });
          verifyTarget(fresh.publicId, publicId, operations.plan);
          if (fresh.updatedAt !== planData.updatedAt || fresh.deletedAt !== null)
            throw new StaleCatalogue();
          check();
          return requestPlatformOperation(operations.remove, { params: { publicId } });
        }
        await recheckPrice(publicId, target, check);
        return requestPlatformOperation(operations.removePrice, {
          params: { publicId: target.publicId },
        });
      },
      () => {
        setDeleting(null);
        if (target === "plan") void navigate({ to: "/platform/plans", search: {} });
      },
    );
    setDeleting(null);
  }
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 [overflow-wrap:anywhere]">
      <Link to="/platform/plans" search={{}} className="underline">
        {t("back")}
      </Link>
      <PageHeader title={t("details")} description={t("intro")} />
      <CommandFeedback command={command} />
      <QueryPanel
        title={t("definition")}
        pending={planPending}
        error={planError}
        retry={() => void refetchPlan()}
      >
        {planData && (
          <>
            <h2 className="text-xl font-semibold">
              <bdi>{planData.name}</bdi>
            </h2>
            <p dir="auto">{planData.description}</p>
            <p>
              {t("duration")}: {planData.duration} · {t(planData.isPublic ? "public" : "private")} ·{" "}
              {t(planData.isActive ? "active" : "inactive")}
            </p>
            <ul>
              {planData.features.map((feature) => (
                <li key={feature}>
                  {t(
                    ["ATTENDANCE", "ANALYTICS", "OVERVIEW", "TEAM_MANAGEMENT"].includes(feature)
                      ? `feature.${feature}`
                      : "unknownFeature",
                  )}
                </li>
              ))}
            </ul>
            <dl>
              {Object.entries(planData.limits ?? {}).map(([name, value]) => (
                <div key={name} className="flex flex-wrap gap-2">
                  <dt>{t(name)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {planData.name === "Default Full Access" && <p>{t("systemHelp")}</p>}
            <div className="flex flex-wrap gap-3">
              {allowed(operations.update.key) && (
                <Button
                  intent="action"
                  disabled={disabled(operations.update.key)}
                  onClick={() => setEditor({ kind: "plan", plan: planData })}
                >
                  {t("editPlan")}
                </Button>
              )}
              {allowed(operations.remove.key) && (
                <Button
                  intent="destructive-trigger"
                  disabled={
                    disabled(operations.remove.key) || planData.name === "Default Full Access"
                  }
                  onClick={() => setDeleting("plan")}
                >
                  {t("deletePlan")}
                </Button>
              )}
            </div>
          </>
        )}
      </QueryPanel>
      {!planError && planData && (
        <>
          {allowed(operations.prices.key) && (
            <QueryPanel
              title={t("prices")}
              pending={pricesPending}
              error={pricesError}
              retry={() => void refetchPrices()}
            >
              {allowed(operations.createPrice.key) && (
                <Button
                  intent="action"
                  disabled={disabled(operations.createPrice.key) || !!pricesError || pricesPending}
                  onClick={() => {
                    if (planData) setEditor({ kind: "price", plan: planData });
                  }}
                >
                  {t("createPrice")}
                </Button>
              )}
              {pricesData?.data.length === 0 && <p>{t("noPrices")}</p>}
              <ul className="divide-y divide-[var(--color-border)]">
                {pricesData?.data.map((price) => (
                  <li key={price.publicId} className="space-y-3 py-4">
                    <p>
                      <bdi>{price.money.formattedAmount}</bdi> · {t(price.billingInterval)} ×{" "}
                      {price.intervalCount} · <bdi>{price.countryCode ?? t("allCountries")}</bdi> ·{" "}
                      <bdi>{price.regionCode ?? t("allRegions")}</bdi> ·{" "}
                      {t(price.isActive ? "active" : "inactive")}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {allowed(operations.updatePrice.key) && allowed(operations.price.key) && (
                        <Button
                          intent="action"
                          disabled={
                            disabled(operations.updatePrice.key) || !!pricesError || pricesFetching
                          }
                          onClick={() => {
                            if (planData) setEditor({ kind: "price", plan: planData, price });
                          }}
                        >
                          {t("editPrice")}
                        </Button>
                      )}
                      {allowed(operations.removePrice.key) && allowed(operations.price.key) && (
                        <Button
                          intent="destructive-trigger"
                          disabled={
                            disabled(operations.removePrice.key) || !!pricesError || pricesFetching
                          }
                          onClick={() => setDeleting(price)}
                        >
                          {t("deletePrice")}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </QueryPanel>
          )}
          <MarketInspection publicId={publicId} search={search} />
        </>
      )}
      {editor && <CatalogueEditor target={editor} close={() => setEditor(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        title={t(deleting === "plan" ? "deletePlan" : "deletePrice")}
        description={t("deleteHelp", { name: planData?.name ?? "" })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        isLoading={command.pending}
        onConfirm={() => void remove()}
        onClose={() => {
          if (!command.pending) setDeleting(null);
        }}
      />
    </div>
  );
}
