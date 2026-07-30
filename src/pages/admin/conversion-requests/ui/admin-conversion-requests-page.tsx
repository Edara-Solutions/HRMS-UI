import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ClipboardCheck, ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Status } from "@/shared/ui/status";
import {
  CONVERSION_REQUEST_STATUSES,
  type ConversionRequest,
  type ConversionRequestStatus,
  useConversionRequests,
} from "../api/conversion-requests";

const STATUS_LABEL: Record<ConversionRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActor(actor: ConversionRequest["approvedBy"]): string {
  if (!actor) return "-";
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim();
  return name ? `${name} (${actor.email})` : actor.email;
}

function formatSizeRange(value: string | null | undefined): string {
  if (!value) return "-";
  return value.toLowerCase().replace(/_/g, " ");
}

function getActionActor(request: ConversionRequest): string {
  return formatActor(request.approvedBy ?? request.rejectedBy);
}

function getActionDate(request: ConversionRequest): string {
  return formatDateTime(request.approvedAt ?? request.rejectedAt);
}

function createConversionRequestColumns(
  onView: (publicId: string) => void,
): Array<DataTableColumn<ConversionRequest>> {
  return [
    {
      id: "name",
      header: "Name",
      cell: (request) => (
        <p className="font-medium text-[var(--color-text)]">
          {request.lead.companyName ?? "Untitled lead"}
        </p>
      ),
    },
    {
      id: "industry-size",
      header: "Industry / size",
      cell: (request) => (
        <>
          <p>{request.lead.industry ?? "-"}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
            {formatSizeRange(request.lead.companySizeRange)}
          </p>
        </>
      ),
    },
    {
      id: "action-actor",
      header: "Action actor",
      cell: getActionActor,
    },
    {
      id: "action-date",
      header: "Action date",
      className: "tabular-nums",
      cell: getActionDate,
    },
    {
      id: "created-at",
      header: "Created",
      className: "tabular-nums",
      cell: (request) => formatDateTime(request.createdAt),
    },
    {
      id: "requester",
      header: "Requester",
      cell: (request) => request.requester.firstName + " " + request.requester.lastName,
    },
    {
      id: "status",
      header: "Status",
      cell: (request) => <Status status={request.status} />,
    },
    {
      id: "action",
      header: "Action",
      align: "end",
      cell: (request) => (
        <Button
          intent="utility"
          leadingIcon={<ExternalLink size={13} />}
          onClick={() => onView(request.publicId)}
        >
          View
        </Button>
      ),
    },
  ];
}

function renderMobileConversionRequestCard(
  request: ConversionRequest,
  onView: (publicId: string) => void,
) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-start min-[560px]:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[var(--color-text)]">
            {request.lead.companyName ?? "Untitled lead"}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {request.lead.industry ?? "-"} / {formatSizeRange(request.lead.companySizeRange)}
          </p>
        </div>
        <Status status={request.status} />
        <Button intent="action" onClick={() => onView(request.publicId)}>
          View
        </Button>
      </div>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs min-[560px]:grid-cols-2">
        <div>
          <dt className="text-[var(--color-text-faint)]">Action actor</dt>
          <dd className="mt-0.5 text-[var(--color-text-muted)]">{getActionActor(request)}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Requester</dt>
          <dd className="mt-0.5 text-[var(--color-text-muted)]">
            {request.requester.firstName + " " + request.requester.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Action date</dt>
          <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
            {getActionDate(request)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Created</dt>
          <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
            {formatDateTime(request.createdAt)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function AdminConversionRequestsPage() {
  const { status, page, pageSize } = useSearch({ from: "/admin/conversion-requests/" });
  const navigate = useNavigate({ from: "/admin/conversion-requests/" });
  const requestsQuery = useConversionRequests({ status, page, pageSize });
  const result = requestsQuery.data;
  const totalPages = Math.max(1, result?.meta.totalPages ?? 1);

  function setStatus(nextStatus: string) {
    void navigate({
      search: (previous) => ({
        ...previous,
        status: CONVERSION_REQUEST_STATUSES.find((statusValue) => statusValue === nextStatus),
        page: 1,
      }),
    });
  }

  function setPage(nextPage: number) {
    void navigate({ search: (previous) => ({ ...previous, page: nextPage }) });
  }

  function viewRequest(publicId: string) {
    void navigate({
      to: "/admin/conversion-requests/$publicId",
      params: { publicId },
    });
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
          Conversion requests
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Review lead conversion requests and reconcile terminal decisions.
        </p>
      </div>

      <div className="mb-4 max-w-xs">
        <label htmlFor="conversion-status" className="text-sm font-medium text-[var(--color-text)]">
          Request status
        </label>
        <Select value={status ?? "ALL"} onValueChange={setStatus}>
          <SelectTrigger id="conversion-status" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {CONVERSION_REQUEST_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {requestsQuery.isPending ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="Loading conversion requests"
            description="Fetching the reviewer queue."
          />
        </Card>
      ) : requestsQuery.isError || !result ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="Couldn't load conversion requests"
            description="Check your reviewer access and try again."
          />
        </Card>
      ) : result.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No conversion requests"
            description="No requests match this status filter."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <DataTable
              items={result.items}
              columns={createConversionRequestColumns(viewRequest)}
              getRowKey={(request) => request.publicId}
              minWidth="1040px"
              mobileBreakpoint="lg"
              renderMobileItem={(request) =>
                renderMobileConversionRequestCard(request, viewRequest)
              }
            />
          </CardContent>
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
            <span className="text-xs text-[var(--color-text-muted)]">
              {result.meta.totalItems} requests
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="nav"
                size="iconXs"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="px-2 text-xs tabular-nums text-[var(--color-text-muted)]">
                {page} / {totalPages}
              </span>
              <Button
                variant="nav"
                size="iconXs"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
