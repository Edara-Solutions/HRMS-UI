import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import type { LeadActivityListResponse } from "../api/lead-detail";
import { ACTIVITY_TYPE_LABEL } from "../api/lead-labels";
import { formatLeadDateTime } from "../lib/lead-detail-date";
import { LogActivityForm } from "./log-activity-form";

interface LeadActivityTimelineCardProps {
  leadPublicId: string;
  page: number;
  onPageChange: (page: number) => void;
  data: LeadActivityListResponse | undefined;
  isPending: boolean;
  isError: boolean;
}

export function LeadActivityTimelineCard({
  leadPublicId,
  page,
  onPageChange,
  data,
  isPending,
  isError,
}: LeadActivityTimelineCardProps) {
  const items = data?.items ?? [];
  const totalItems = data?.meta.totalItems ?? 0;
  const currentPage = data?.meta.page ?? page;
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Activity timeline</CardTitle>
      </CardHeader>
      <LogActivityForm leadPublicId={leadPublicId} />
      <CardContent className="p-0">
        {isError ? (
          <EmptyState
            icon={MessageSquare}
            title="Couldn't load activity"
            description="Please try again shortly."
          />
        ) : isPending ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No activity yet"
            description="Calls, emails, and notes logged on this lead will show up here."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((activity) => (
              <li key={activity.publicId} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {ACTIVITY_TYPE_LABEL[activity.type] ??
                      activity.type.toLowerCase().replace(/_/g, " ")}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-faint)]">
                    {formatLeadDateTime(activity.createdAt)}
                  </span>
                </div>
                {activity.note && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text)]">
                    {activity.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
        <span className="text-xs text-[var(--color-text-muted)]">
          {items.length} of {totalItems} activities
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="nav"
            size="iconXs"
            className="btn-nav-prev"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="select-none px-2 text-[12px] tabular-nums text-[var(--color-text-muted)]">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="nav"
            size="iconXs"
            className="btn-nav-next"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
