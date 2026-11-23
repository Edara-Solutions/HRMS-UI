import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  platformPlanOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionCard } from "@/shared/ui/section-card";
import { Skeleton } from "@/shared/ui/skeleton";
import { type Plan, type Price, pricesQuery } from "../api/catalogue";

const nowrapBadge = "shrink-0 whitespace-nowrap";

interface Props {
  plan: Plan;
  blocked: (key: string) => boolean;
  onEdit: (price?: Price) => void;
  onDelete: (price: Price) => void;
}

export function PlanPrices({ plan, blocked, onEdit, onDelete }: Props) {
  const { t } = useTranslation("platform-plans");
  const access = usePlatformAccess();
  const allowed = (key: string) => access.availability(key).state !== "hidden";
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...pricesQuery(access.user?.publicId ?? "", plan.publicId),
    enabled: access.availability(operations.prices.key).state === "enabled",
    retry: false,
  });
  if (!allowed(operations.prices.key)) return null;
  const priceActions = allowed(operations.price.key);
  return (
    <SectionCard
      title={t("prices")}
      description={t("pricesHelp")}
      action={
        allowed(operations.createPrice.key) && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={blocked(operations.createPrice.key) || !!error || isPending}
            onClick={() => onEdit()}
          >
            {t("createPrice")}
          </Button>
        )
      }
    >
      {isPending && (
        <output aria-label={t("loadingPlan")} className="block space-y-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </output>
      )}
      {error && (
        <EmptyState
          role="alert"
          icon={Tag}
          title={t("planUnavailable")}
          description={
            error instanceof ContractViolation ? t("contract") : t("planUnavailableHelp")
          }
          action={
            !(error instanceof ContractViolation) && (
              <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                {t("retry")}
              </Button>
            )
          }
        />
      )}
      {data && data.data.length === 0 && (
        <EmptyState className="py-8" icon={Tag} title={t("noPrices")} />
      )}
      {data && data.data.length > 0 && (
        <DataTable
          items={data.data}
          getRowKey={(price) => price.publicId}
          minWidth="760px"
          columns={[
            {
              id: "price",
              header: <span className="whitespace-nowrap">{t("priceColumn")}</span>,
              cell: (price) => (
                <span className="whitespace-nowrap font-semibold tabular-nums text-[var(--color-text)]">
                  <bdi>{price.money.formattedAmount}</bdi>
                </span>
              ),
            },
            {
              id: "billing",
              header: <span className="whitespace-nowrap">{t("billingColumn")}</span>,
              className: "whitespace-nowrap",
              cell: (price) =>
                t("billingEvery", {
                  interval: t(price.billingInterval),
                  count: price.intervalCount,
                }),
            },
            {
              id: "country",
              header: <span className="whitespace-nowrap">{t("countryColumn")}</span>,
              cell: (price) => <bdi>{price.countryCode ?? t("allCountries")}</bdi>,
            },
            {
              id: "region",
              header: <span className="whitespace-nowrap">{t("regionColumn")}</span>,
              cell: (price) => <bdi>{price.regionCode ?? t("allRegions")}</bdi>,
            },
            {
              id: "status",
              header: <span className="whitespace-nowrap">{t("status")}</span>,
              cell: (price) => (
                <Badge variant={price.isActive ? "success" : "default"} className={nowrapBadge}>
                  {t(price.isActive ? "active" : "inactive")}
                </Badge>
              ),
            },
            {
              id: "actions",
              header: <span className="sr-only">{t("action")}</span>,
              align: "end",
              cell: (price) => (
                <div className="flex items-center justify-end gap-2">
                  {allowed(operations.updatePrice.key) && priceActions && (
                    <Button
                      variant="secondary"
                      size="xs"
                      className="whitespace-nowrap"
                      disabled={blocked(operations.updatePrice.key) || !!error || isFetching}
                      onClick={() => onEdit(price)}
                    >
                      {t("editPrice")}
                    </Button>
                  )}
                  {allowed(operations.removePrice.key) && priceActions && (
                    <Button
                      intent="destructive-trigger"
                      size="xs"
                      className="whitespace-nowrap"
                      disabled={blocked(operations.removePrice.key) || !!error || isFetching}
                      onClick={() => onDelete(price)}
                    >
                      {t("deletePrice")}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
    </SectionCard>
  );
}
