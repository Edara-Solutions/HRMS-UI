import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  CONVERSION_REQUEST_STATUSES,
  type ConversionRequestStatus,
  useConversionRequests,
} from "../api/conversion-requests";

const STATUS_LABEL: Record<ConversionRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_VARIANT: Record<ConversionRequestStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

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
            <div className="divide-y divide-[var(--color-border)]">
              {result.items.map((request) => (
                <article
                  key={request.publicId}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-[var(--color-text)]">
                        {request.lead.companyName ?? "Untitled lead"}
                      </h2>
                      <Badge variant={STATUS_VARIANT[request.status]}>
                        {STATUS_LABEL[request.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {request.plan.name} - requested by {request.requester.firstName}{" "}
                      {request.requester.lastName}
                    </p>
                    <code className="mt-1 block text-[11px] text-[var(--color-text-faint)]">
                      {request.publicId}
                    </code>
                  </div>
                  <Button
                    intent="action"
                    onClick={() =>
                      void navigate({
                        to: "/admin/conversion-requests/$publicId",
                        params: { publicId: request.publicId },
                      })
                    }
                  >
                    Review request
                  </Button>
                </article>
              ))}
            </div>
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
