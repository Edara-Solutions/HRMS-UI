import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  OperationRefusal,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { getDateEdgeDate, getDateEdgeType } from "@/shared/lib/date-edge";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { DatePicker, type DatePickerText } from "@/shared/ui/date-picker";
import { EmptyState } from "@/shared/ui/empty-state";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { requestListQuery } from "../api/review";
import type { RequestSearch } from "../model/page-search";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const PAGE_SIZES = [10, 25, 50, 100] as const;
const ALL = "ALL";

type Status = (typeof STATUSES)[number];

const statusTone: Record<Status, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const linkClassName =
  "font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

export function PlatformConversionRequestsPage({ search }: { search: RequestSearch }) {
  const { t } = useTranslation(["platform-leads", "common"]);
  const access = usePlatformAccess();
  const locale = usePreferencesStore((state) => state.locale);
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
  const reset = () =>
    void navigate({
      to: "/platform/conversion-requests",
      search: { page: 1, pageSize: search.pageSize },
    });
  const pickerText: DatePickerText = {
    description: t("common:datePicker.description"),
    placeholder: t("common:datePicker.placeholder"),
    edge: t("common:datePicker.edge"),
    inclusive: t("common:datePicker.inclusive"),
    exclusive: t("common:datePicker.exclusive"),
    previousMonth: t("common:datePicker.previousMonth"),
    nextMonth: t("common:datePicker.nextMonth"),
    clear: t("common:datePicker.clear"),
    cancel: t("common:datePicker.cancel"),
    apply: t("common:datePicker.apply"),
  };
  const date = (value: string) => formatInstant(value, locale);
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);
  const page = Math.min(search.page, totalPages);
  const statusBadge = (status: Status) => (
    <Badge variant={statusTone[status]} className="shrink-0 whitespace-nowrap">
      {t(`enum.${status}`)}
    </Badge>
  );
  const companyLink = (item: { publicId: string; name: string | null }, label?: string) => (
    <Link
      to="/platform/conversion-requests/$publicId"
      params={{ publicId: item.publicId }}
      className={linkClassName}
    >
      <bdi>{label ?? item.name ?? t("unnamed")}</bdi>
    </Link>
  );

  return (
    <div className="mx-auto min-w-0 max-w-[1480px] space-y-4">
      <div className="mb-2">
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
          {t("requests.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("requests.description")}</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:flex lg:flex-wrap">
        <div className="min-w-0 lg:w-44">
          <Label htmlFor="conversion-status">{t("field.status")}</Label>
          <Select
            value={search.status ?? ALL}
            onValueChange={(value) =>
              update({ status: STATUSES.find((status) => status === value) })
            }
          >
            <SelectTrigger id="conversion-status" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("requests.allStatuses")}</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`enum.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(["createdFrom", "createdTo"] as const).map((field) => (
          <div
            key={field}
            className="min-w-0 lg:w-48 [&>div]:min-h-0 [&>div>span:last-of-type]:hidden [&_button]:h-[34px]"
          >
            <DatePicker
              id={`conversion-${field}`}
              label={t(`field.${field}`)}
              value={getDateEdgeDate(search[field])}
              edgeDateType={getDateEdgeType(search[field])}
              locale={locale}
              text={pickerText}
              onChange={(value) => update({ [field]: value ? search[field] : undefined })}
              onEdgeValueChange={(value) => update({ [field]: value })}
            />
          </div>
        ))}
        <div className="min-w-0 lg:w-36">
          <Label htmlFor="conversion-page-size">{t("field.pageSize")}</Label>
          <Select
            value={String(search.pageSize)}
            onValueChange={(value) => update({ pageSize: Number(value) })}
          >
            <SelectTrigger id="conversion-page-size" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {String(size)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 justify-self-start"
          leadingIcon={<RotateCcw size={13} aria-hidden="true" />}
          onClick={reset}
        >
          {t("requests.reset")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isPending && (
            <output aria-label={t("requests.loading")} className="block space-y-3 p-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </output>
          )}
          {error && (
            <EmptyState
              role="alert"
              icon={ClipboardCheck}
              title={t("requests.error.title")}
              description={
                error instanceof ContractViolation
                  ? t("requests.contract")
                  : t("requests.error.description")
              }
              action={
                !(error instanceof ContractViolation) && (
                  <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                    {t("requests.error.action")}
                  </Button>
                )
              }
            />
          )}
          {data && data.items.length === 0 && (
            <EmptyState
              icon={ClipboardCheck}
              title={t("requests.empty.title")}
              description={t("requests.empty.description")}
              action={
                <Button variant="secondary" size="sm" onClick={reset}>
                  {t("requests.reset")}
                </Button>
              }
            />
          )}
          {data && data.items.length > 0 && (
            <DataTable
              items={data.items}
              getRowKey={(item) => item.publicId}
              minWidth="1040px"
              mobileBreakpoint="lg"
              columns={[
                {
                  id: "company",
                  header: t("field.companyName"),
                  cell: (item) => companyLink(item),
                },
                {
                  id: "industry",
                  header: t("requests.industrySize"),
                  cell: (item) => (
                    <>
                      <p className="text-[var(--color-text)]">
                        <bdi>{item.industry ?? t("requests.noIndustry")}</bdi>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
                        {t(`enum.${item.size}`)}
                      </p>
                    </>
                  ),
                },
                { id: "plan", header: t("plan.title"), cell: (item) => <bdi>{item.plan}</bdi> },
                {
                  id: "requester",
                  header: t("requests.requester"),
                  cell: (item) => <bdi>{item.requester ?? "—"}</bdi>,
                },
                {
                  id: "status",
                  header: t("field.status"),
                  cell: (item) => statusBadge(item.status),
                },
                {
                  id: "decision",
                  header: t("requests.decision"),
                  className: "tabular-nums text-xs text-[var(--color-text-muted)]",
                  cell: (item) =>
                    item.decision ? (
                      <>
                        <p className="text-[13px] text-[var(--color-text)]">
                          <bdi>{item.decision.by ?? "—"}</bdi>
                        </p>
                        <p className="mt-0.5">{date(item.decision.at)}</p>
                      </>
                    ) : (
                      "—"
                    ),
                },
                {
                  id: "created",
                  header: t("requests.created"),
                  className: "tabular-nums text-xs text-[var(--color-text-muted)]",
                  cell: (item) => date(item.createdAt),
                },
                {
                  id: "action",
                  header: <span className="sr-only">{t("requests.action")}</span>,
                  align: "end",
                  cell: (item) => companyLink(item, t("requests.view")),
                },
              ]}
              renderMobileItem={(item) => (
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">{companyLink(item)}</div>
                    {statusBadge(item.status)}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    <bdi>{item.plan}</bdi> · {date(item.createdAt)}
                  </p>
                  {item.requester && (
                    <p className="text-xs text-[var(--color-text-faint)]">
                      {t("requests.requester")}: <bdi>{item.requester}</bdi>
                    </p>
                  )}
                </div>
              )}
            />
          )}
        </CardContent>
        {data && (
          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
              {t("requests.count", { count: data.meta.totalItems })}
            </span>
            <nav
              aria-label={t("requests.pageOf", { current: page, total: totalPages })}
              className="flex items-center gap-1.5"
            >
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-prev"
                aria-label={t("previous")}
                title={t("previous")}
                disabled={isFetching || page <= 1}
                onClick={() => update({ page: page - 1 })}
              >
                <ChevronLeft size={14} className="rtl:-scale-x-100" />
              </Button>
              <span className="select-none px-2 text-[12px] tabular-nums text-[var(--color-text-muted)]">
                {t("requests.pageOf", { current: page, total: totalPages })}
              </span>
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-next"
                aria-label={t("next")}
                title={t("next")}
                disabled={isFetching || page >= totalPages}
                onClick={() => update({ page: page + 1 })}
              >
                <ChevronRight size={14} className="rtl:-scale-x-100" />
              </Button>
            </nav>
          </div>
        )}
      </Card>
    </div>
  );
}
