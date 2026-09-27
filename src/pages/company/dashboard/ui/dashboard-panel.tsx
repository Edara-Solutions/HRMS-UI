import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation, isCompanyBlocked, OperationRefusal } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

interface DashboardPanelProps<Data> {
  id: string;
  title: string;
  query: UseQueryResult<Data>;
  children: (data: Data) => ReactNode;
}

/**
 * One independently loading dashboard read. A blocked workspace escalates to the route boundary;
 * every other failure stays inside the panel with safe copy and, where a read may, a manual retry.
 */
export function DashboardPanel<Data>({ id, title, query, children }: DashboardPanelProps<Data>) {
  const { t } = useTranslation("organization");
  if (isCompanyBlocked(query.error)) throw query.error;
  return (
    <Card as="section" aria-labelledby={id} aria-busy={query.isFetching} className="min-w-0">
      <CardHeader>
        <CardTitle id={id}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-[18px] text-sm">
        {query.isPending ? (
          <output className="block space-y-2" aria-label={t("state.loading")}>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </output>
        ) : query.isError ? (
          <PanelFailure error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          children(query.data)
        )}
      </CardContent>
    </Card>
  );
}

function PanelFailure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation("organization");
  if (error instanceof ContractViolation)
    return <p className="text-[var(--color-text-muted)]">{t("state.contractUnavailable")}</p>;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status))
    return <p className="text-[var(--color-text-muted)]">{t("state.noLongerAvailable")}</p>;
  return (
    <div className="space-y-3">
      <p className="text-[var(--color-text-muted)]">{t("state.loadFailed")}</p>
      <Button intent="action" size="sm" onClick={onRetry}>
        {t("state.retry")}
      </Button>
    </div>
  );
}
