import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Package } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  platformPlanOperations as operations,
  requestPlatformOperation,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  type Market,
  type Price,
  planQuery,
  recheckPrice,
  StaleCatalogue,
  verifyTarget,
} from "../api/catalogue";
import { useCatalogueCommand } from "../model/use-catalogue-command";
import { CatalogueEditor, type EditorTarget } from "./catalogue-editor";
import { CommandFeedback } from "./command-feedback";
import { MarketInspection } from "./market-inspection";
import { PlanDefinition, SYSTEM_PLAN } from "./plan-definition";
import { PlanPrices } from "./plan-prices";

interface Props {
  publicId: string;
  search: Partial<Market>;
}

const nowrapBadge = "shrink-0 whitespace-nowrap";
("text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]");

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

  const backLink = (
    <Link
      to="/platform/plans"
      search={{}}
      className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      <ArrowLeft size={14} aria-hidden="true" className="rtl:-scale-x-100" />
      {t("back")}
    </Link>
  );

  if (planPending)
    return (
      <div className="mx-auto min-w-0 max-w-[1280px] space-y-4">
        {backLink}
        <output aria-label={t("loadingPlan")} className="block space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </output>
      </div>
    );

  if (planError || !planData)
    return (
      <div className="mx-auto min-w-0 max-w-[1280px] space-y-4">
        {backLink}
        <Card>
          <EmptyState
            role="alert"
            icon={Package}
            title={t("planUnavailable")}
            description={
              planError instanceof ContractViolation ? t("contract") : t("planUnavailableHelp")
            }
            action={
              !(planError instanceof ContractViolation) && (
                <Button variant="secondary" size="sm" onClick={() => void refetchPlan()}>
                  {t("retry")}
                </Button>
              )
            }
          />
        </Card>
      </div>
    );

  return (
    <div className="mx-auto min-w-0 max-w-[1280px] space-y-5">
      {backLink}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="min-w-0 break-words text-[26px] font-bold tracking-tight text-[var(--color-text)]">
              <bdi>{planData.name}</bdi>
            </h1>
            <Badge variant={planData.isPublic ? "primary" : "default"} className={nowrapBadge}>
              {t(planData.isPublic ? "public" : "private")}
            </Badge>
            <Badge variant={planData.isActive ? "success" : "default"} className={nowrapBadge}>
              {t(planData.isActive ? "active" : "inactive")}
            </Badge>
          </div>
          {planData.description && (
            <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-muted)]" dir="auto">
              {planData.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {allowed(operations.update.key) && (
            <Button
              variant="secondary"
              disabled={disabled(operations.update.key)}
              onClick={() => setEditor({ kind: "plan", plan: planData })}
            >
              {t("editPlan")}
            </Button>
          )}
          {allowed(operations.remove.key) && (
            <Button
              intent="destructive-trigger"
              disabled={disabled(operations.remove.key) || planData.name === SYSTEM_PLAN}
              onClick={() => setDeleting("plan")}
            >
              {t("deletePlan")}
            </Button>
          )}
        </div>
      </header>

      <CommandFeedback command={command} />

      <PlanDefinition plan={planData} />

      <PlanPrices
        plan={planData}
        blocked={disabled}
        onEdit={(price) => setEditor({ kind: "price", plan: planData, price })}
        onDelete={setDeleting}
      />

      <MarketInspection publicId={publicId} search={search} />

      {editor && <CatalogueEditor target={editor} close={() => setEditor(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        title={t(deleting === "plan" ? "deletePlan" : "deletePrice")}
        description={t("deleteHelp", { name: planData.name })}
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
