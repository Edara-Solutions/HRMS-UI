import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  OperationRefusal,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { DateEdgeField } from "@/shared/ui/date-edge-field";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { requestListQuery } from "../api/review";
import type { RequestSearch } from "../model/page-search";
export function PlatformConversionRequestsPage({ search }: { search: RequestSearch }) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...requestListQuery(access.user?.publicId ?? "", search),
    enabled: access.availability(operations.requests.key).state === "enabled",
  });
  if (!access.user) return null;
  if (access.availability(operations.requests.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  const update = (patch: Partial<RequestSearch>) =>
    void navigate({
      to: "/platform/conversion-requests",
      search: { ...search, page: 1, ...patch },
    });
  return (
    <div className="mx-auto min-w-0 [overflow-wrap:anywhere] max-w-6xl space-y-6">
      <PageHeader title={t("requests.title")} description={t("requests.description")} />
      <form className="flex flex-wrap gap-3" onSubmit={(event) => event.preventDefault()}>
        <label>
          {t("field.status")}
          <select
            className="ms-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            value={search.status ?? ""}
            onChange={(event) => {
              const parsed = operations.requests.requestSchema.shape.query.shape.status.safeParse(
                event.target.value || undefined,
              );
              if (parsed.success) update({ status: parsed.data });
            }}
          >
            <option value="">{t("all")}</option>
            {["PENDING", "APPROVED", "REJECTED"].map((status) => (
              <option key={status} value={status}>
                {t(`enum.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <DateEdgeField
          label={t("field.createdFrom")}
          value={search.createdFrom}
          onChange={(createdFrom) => update({ createdFrom })}
        />
        <DateEdgeField
          label={t("field.createdTo")}
          value={search.createdTo}
          onChange={(createdTo) => update({ createdTo })}
        />
        <label>
          {t("field.pageSize")}
          <select
            value={search.pageSize}
            onChange={(event) => update({ pageSize: Number(event.target.value) })}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </label>
      </form>
      <QueryPanel
        title={t("requests.title")}
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      >
        {data && (
          <>
            <ul className="divide-y divide-[var(--color-border)]">
              {data.items.map((item) => (
                <li
                  key={item.publicId}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <Link
                    to="/platform/conversion-requests/$publicId"
                    params={{ publicId: item.publicId }}
                    className="underline"
                  >
                    {item.name ?? t("unnamed")}
                  </Link>
                  <span>
                    {item.plan} · {t(`enum.${item.status}`)}
                  </span>
                </li>
              ))}
            </ul>
            {!data.items.length && <p>{t("empty")}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                intent="action"
                disabled={isFetching || search.page <= 1}
                onClick={() => update({ page: search.page - 1 })}
              >
                {t("previous")}
              </Button>
              <span>{t("page", { page: data.meta.page, total: data.meta.totalPages })}</span>
              <Button
                intent="action"
                disabled={isFetching || search.page >= data.meta.totalPages}
                onClick={() => update({ page: search.page + 1 })}
              >
                {t("next")}
              </Button>
            </div>
          </>
        )}
      </QueryPanel>
    </div>
  );
}
