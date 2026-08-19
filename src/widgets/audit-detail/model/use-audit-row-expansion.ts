import { useState } from "react";

interface AuditRecordIdentity {
  eventType: string;
  occurredAt?: string;
  traceId?: string | null;
  raw?: unknown;
}

function readRawIdentity(raw: unknown): string {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return JSON.stringify(raw) ?? String(raw);
  }
  const eventType =
    "eventType" in raw && typeof raw.eventType === "string" ? raw.eventType : "unrecognized";
  const occurredAt =
    "occurredAt" in raw && typeof raw.occurredAt === "string" ? raw.occurredAt : "unknown-time";
  const traceId = "traceId" in raw && typeof raw.traceId === "string" ? raw.traceId : "no-trace";
  return `${eventType}:${occurredAt}:${traceId}`;
}

export function getAuditRecordKey(event: AuditRecordIdentity): string {
  if (event.eventType === "__unrecognized__") return readRawIdentity(event.raw);
  return `${event.eventType}:${event.occurredAt ?? "unknown-time"}:${event.traceId ?? "no-trace"}`;
}

export function keyAuditRecords<Event extends AuditRecordIdentity>(events: Event[]) {
  const occurrences = new Map<string, number>();
  return events.map((event) => {
    const identity = getAuditRecordKey(event);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    return { event, rowKey: `${identity}:${occurrence}` };
  });
}

export function useAuditRowExpansion() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());

  return {
    isExpanded: (rowKey: string) => expandedRows.has(rowKey),
    toggle: (rowKey: string) => {
      setExpandedRows((current) => {
        const next = new Set(current);
        if (next.has(rowKey)) next.delete(rowKey);
        else next.add(rowKey);
        return next;
      });
    },
  };
}
