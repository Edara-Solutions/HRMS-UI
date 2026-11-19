import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Mail, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { platformCommunicationsOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { usePageNavigate, usePageSearch } from "@/shared/lib/page-navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { deliveriesQuery } from "../api/email-deliveries";
import { readFailure } from "../model/delivery-presentation";
import { platformDeliveriesSearchSchema } from "../model/page-search";
import { DeliveryDetail } from "./delivery-detail";
import { DeliveryFiltersCard } from "./delivery-filters";
import { DeliveryTable } from "./delivery-table";

export function PlatformEmailDeliveriesPage() {
  const { t } = useTranslation(["platform-email-deliveries", "common"]);
  const access = usePlatformAccess();
  const search = usePageSearch(platformDeliveriesSearchSchema);
  const navigate = usePageNavigate(platformDeliveriesSearchSchema);
  const { deliveryId, deliveryContext, ...query } = search;
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...deliveriesQuery(access.user?.publicId ?? "", query),
    enabled: access.availability(operations.deliveries.key).state === "enabled",
    retry: false,
  });
  if (!access.user) return null;
  if (access.availability(operations.deliveries.key).state === "hidden")
    throw new RouteAccessRefusal("platform");

  const { page: _page, pageSize, ...filters } = query;
  const reset = () => void navigate({ search: pageSize ? { pageSize } : {} });
  const goTo = (page: number) => void navigate({ search: { ...query, page } });
  const failure = error ? readFailure(error) : undefined;
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);
  const currentPage = Math.min(data?.meta.page ?? query.page ?? 1, totalPages);
  const totalItems = data?.meta.totalItems ?? 0;
  const firstShown = totalItems === 0 ? 0 : (currentPage - 1) * (data?.meta.pageSize ?? 0) + 1;
  const lastShown = Math.min(firstShown + (data?.items.length ?? 0) - 1, totalItems);

  return (
    <div className="mx-auto min-w-0 max-w-[1480px] space-y-4">
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("intro")}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          isLoading={isFetching && !isPending}
          leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
          onClick={() => void refetch()}
        >
          {t("refresh")}
        </Button>
      </div>

      <DeliveryFiltersCard
        key={JSON.stringify(filters)}
        filters={filters}
        onReset={reset}
        onSearch={(next) => void navigate({ search: { ...next, pageSize, page: 1 } })}
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isPending && (
            <output className="block space-y-3 p-4" aria-label={t("loading")}>
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </output>
          )}
          {failure &&
            (failure === "restricted" ? (
              <EmptyState
                icon={ShieldAlert}
                title={t("error.restricted.title")}
                description={t("error.restricted.description")}
              />
            ) : (
              <EmptyState
                icon={Mail}
                title={t("error.unavailable.title")}
                description={
                  failure === "contract"
                    ? t("common:query.contract")
                    : t("error.unavailable.description")
                }
                action={
                  failure === "unavailable" && (
                    <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                      {t("error.unavailable.action")}
                    </Button>
                  )
                }
              />
            ))}
          {data && data.items.length === 0 && (
            <EmptyState
              icon={Search}
              title={t("empty.title")}
              description={t("empty.description")}
              action={
                <Button variant="secondary" size="sm" onClick={reset}>
                  {t("empty.action")}
                </Button>
              }
            />
          )}
          {data && data.items.length > 0 && (
            <DeliveryTable
              deliveries={data.items}
              canOpen={access.availability(operations.delivery.key).state === "enabled"}
              onOpen={(delivery) =>
                void navigate({
                  search: {
                    ...search,
                    deliveryId: delivery.publicId,
                    deliveryContext: delivery.context,
                  },
                })
              }
            />
          )}
        </CardContent>
        {data && (
          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-baseline gap-1.5 text-xs tabular-nums text-[var(--color-text-muted)]">
              <span className="text-[13px] font-semibold text-[var(--color-text)]">
                {t("pagination.items", { count: totalItems })}
              </span>
              {totalItems > 0 && (
                <span className="text-[var(--color-text-faint)]">
                  · {t("pagination.showing", { start: firstShown, end: lastShown })}
                </span>
              )}
            </p>
            <nav aria-label={t("pagination.pageOf", { current: currentPage, total: totalPages })}>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="nav"
                  size="iconXs"
                  className="btn-nav-prev"
                  disabled={currentPage <= 1}
                  onClick={() => goTo(currentPage - 1)}
                  aria-label={t("pagination.previous")}
                  title={t("pagination.previous")}
                >
                  <ChevronLeft size={14} className="rtl:-scale-x-100" />
                </Button>
                <span className="select-none px-2 text-[12px] tabular-nums text-[var(--color-text-muted)]">
                  {t("pagination.pageOf", { current: currentPage, total: totalPages })}
                </span>
                <Button
                  variant="nav"
                  size="iconXs"
                  className="btn-nav-next"
                  disabled={currentPage >= totalPages}
                  onClick={() => goTo(currentPage + 1)}
                  aria-label={t("pagination.next")}
                  title={t("pagination.next")}
                >
                  <ChevronRight size={14} className="rtl:-scale-x-100" />
                </Button>
              </div>
            </nav>
          </div>
        )}
      </Card>

      {deliveryId && deliveryContext && (
        <DeliveryDetail
          key={`${deliveryContext}:${deliveryId}`}
          context={deliveryContext}
          publicId={deliveryId}
          onClose={() => void navigate({ search: query })}
        />
      )}
    </div>
  );
}
