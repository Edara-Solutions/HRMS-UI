import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { type CompanyAuditTrailItem, useCompanyAuditTrail } from "../api/audit";

type UnavailableEvent = Extract<CompanyAuditTrailItem, { eventType: "audit.event.unavailable" }>;

function isUnrecognized(
  event: CompanyAuditTrailItem,
): event is Extract<CompanyAuditTrailItem, { eventType: "__unrecognized__" }> {
  return event.eventType === "__unrecognized__";
}

function isUnavailable(event: CompanyAuditTrailItem): event is UnavailableEvent {
  return event.eventType === "audit.event.unavailable";
}

function eventLabel(event: CompanyAuditTrailItem): string {
  if (isUnrecognized(event)) return "Unrecognized event";
  return isUnavailable(event) ? "Unavailable event" : event.eventType;
}

function eventOutcome(event: CompanyAuditTrailItem): "SUCCESS" | "FAILURE" | null {
  if (isUnrecognized(event)) return null;
  return isUnavailable(event) ? null : event.outcome;
}

function eventActor(event: CompanyAuditTrailItem): string {
  if (isUnrecognized(event)) return "—";
  if (isUnavailable(event)) return "—";
  return event.actor.kind.replace("_", " ").toLowerCase();
}

function eventOccurredAt(event: CompanyAuditTrailItem): string {
  if (isUnrecognized(event)) return "—";
  return new Date(event.occurredAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditTable({ items }: { items: CompanyAuditTrailItem[] }) {
  return (
    <div className="scrollbar-calm overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            {["Event", "Actor", "Outcome", "Timestamp"].map((header) => (
              <th
                key={header}
                className="px-4 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((event, index) => {
            const outcome = eventOutcome(event);
            return (
              <tr
                key={`${event.eventType}-${eventOccurredAt(event)}-${index}`}
                className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-2)]"
              >
                <td className="px-4 py-3">
                  <code className="text-[12.5px] font-mono text-[var(--color-text)]">
                    {eventLabel(event)}
                  </code>
                </td>
                <td className="px-4 py-3 text-[12.5px] text-[var(--color-text-muted)]">
                  {eventActor(event)}
                </td>
                <td className="px-4 py-3">
                  {outcome ? (
                    <Badge variant={outcome === "SUCCESS" ? "success" : "danger"}>
                      {outcome === "SUCCESS" ? "Success" : "Failure"}
                    </Badge>
                  ) : (
                    <span className="text-[var(--color-text-faint)]">–</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
                  {eventOccurredAt(event)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Shield size={32} className="text-[var(--color-text-faint)]" />
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{message}</p>
      {action}
    </div>
  );
}

export function CompanyAuditPage() {
  const { cursor, limit } = useSearch({ from: "/company/audit/" });
  const navigate = useNavigate({ from: "/company/audit/" });
  const query = useCompanyAuditTrail({ cursor, limit });

  const page = query.data;
  const items = page?.items ?? [];
  const nextCursor = page?.nextCursor ?? null;
  const canGoOlder = (page?.hasMore ?? false) && nextCursor !== null;

  function goToOlderEvents() {
    if (!nextCursor) return;
    void navigate({ search: (previous) => ({ ...previous, cursor: nextCursor }) });
  }

  // The trail has no page numbers to count back through, so the only backward step the
  // opaque cursor supports is dropping it and returning to the newest page.
  function goToLatestEvents() {
    void navigate({
      search: ({ cursor: _cursor, ...rest }) => rest,
    });
  }

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">Audit log</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Your company's retained event history
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {query.isPending ? (
            <EmptyState message="Loading audit trail…" />
          ) : query.isError ? (
            <EmptyState
              message="Audit trail could not be loaded"
              action={
                <Button intent="utility" size="sm" onClick={() => query.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : items.length === 0 ? (
            <EmptyState message="No audit events" />
          ) : (
            <AuditTable items={items} />
          )}
        </CardContent>
        {items.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3">
            <span className="text-xs text-[var(--color-text-muted)]">
              {items.length} event{items.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-1">
              {cursor && (
                <Button
                  variant="nav"
                  size="iconXs"
                  className="btn-nav-prev"
                  onClick={goToLatestEvents}
                  aria-label="Latest events"
                  title="Latest events"
                >
                  <ChevronLeft size={14} />
                </Button>
              )}
              {canGoOlder && (
                <Button
                  variant="nav"
                  size="iconXs"
                  className="btn-nav-next"
                  onClick={goToOlderEvents}
                  aria-label="Older events"
                  title="Older events"
                >
                  <ChevronRight size={14} />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
