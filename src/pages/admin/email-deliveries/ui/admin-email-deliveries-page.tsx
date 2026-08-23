import { useNavigate, useSearch } from "@tanstack/react-router";
import { HTTPError } from "ky";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock3,
  Filter,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardTitle } from "@/shared/ui/card";
import { DateTimePicker } from "@/shared/ui/date-time-picker";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import {
  useDeliveryCompanyOptions,
  useDeliveryEmailTypeOptions,
} from "../api/delivery-filter-options";
import {
  type DeliveryRecord,
  type DeliveryStatus,
  type EmailContext,
  useCancelEmailDelivery,
  useEmailDeliveries,
  useEmailDelivery,
  useRetryEmailDelivery,
} from "../api/email-deliveries";
import { SearchableFilterSelect } from "./searchable-filter-select";

type DeliveryAction = "retry" | "cancel";
interface DeliveryFilterDraft {
  companyPublicId: string;
  context: EmailContext | undefined;
  emailTypeKey: string;
  recipientEmail: string;
  status: DeliveryStatus | undefined;
  createdFrom: string | undefined;
  createdTo: string | undefined;
}

const DELIVERY_STATUSES: DeliveryStatus[] = [
  "QUEUED",
  "PROCESSING",
  "RETRY_SCHEDULED",
  "SENT",
  "FAILED",
  "CANCELLED",
];
const EMAIL_CONTEXTS: EmailContext[] = ["EDARA", "COMPANY"];
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DELIVERY_PICKER_TEXT = {
  description: "Select the date and time used by this delivery-history filter.",
};

const STATUS_BADGE_VARIANTS: Readonly<
  Record<DeliveryStatus, "default" | "info" | "success" | "warning" | "danger">
> = {
  QUEUED: "default",
  PROCESSING: "info",
  RETRY_SCHEDULED: "warning",
  SENT: "success",
  FAILED: "danger",
  CANCELLED: "default",
};

function humanize(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "–";
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function fromSearch(search: {
  companyPublicId?: string;
  context?: EmailContext;
  emailTypeKey?: string;
  recipientEmail?: string;
  status?: DeliveryStatus;
  createdFrom?: string;
  createdTo?: string;
}): DeliveryFilterDraft {
  return {
    companyPublicId: search.companyPublicId ?? "",
    context: search.context,
    emailTypeKey: search.emailTypeKey ?? "",
    recipientEmail: search.recipientEmail ?? "",
    status: search.status,
    createdFrom: search.createdFrom,
    createdTo: search.createdTo,
  };
}

function emptyDraft(): DeliveryFilterDraft {
  return fromSearch({});
}

function optionalContext(value: string): EmailContext | undefined {
  return EMAIL_CONTEXTS.find((context) => context === value);
}

function optionalStatus(value: string): DeliveryStatus | undefined {
  return DELIVERY_STATUSES.find((status) => status === value);
}

function canRetry(status: DeliveryStatus): boolean {
  return status === "FAILED";
}

function canCancel(status: DeliveryStatus): boolean {
  return status === "QUEUED" || status === "RETRY_SCHEDULED";
}

function isPermissionError(error: unknown): boolean {
  return error instanceof HTTPError && error.response.status === 403;
}

interface StatusBadgeProps {
  status: DeliveryStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={STATUS_BADGE_VARIANTS[status]}>{humanize(status)}</Badge>;
}

function TimelineStageIcon({ stage }: { stage: string }) {
  if (stage === "SENT") {
    return <CircleCheck size={16} className="text-[var(--color-success)]" aria-hidden="true" />;
  }
  if (stage === "FAILED") {
    return <ShieldAlert size={14} className="text-[var(--color-danger)]" aria-hidden="true" />;
  }
  if (stage === "RETRY_SCHEDULED" || stage === "RETRY_REQUESTED") {
    return <RotateCcw size={14} className="text-[var(--color-warning)]" aria-hidden="true" />;
  }
  if (stage === "CANCELLED") {
    return <CircleX size={16} className="text-[var(--color-text-muted)]" aria-hidden="true" />;
  }
  return <Clock3 size={14} className="text-[var(--color-primary)]" aria-hidden="true" />;
}

interface DeliveryDetailProps {
  publicId: string | undefined;
  onClose: () => void;
}

function DeliveryDetail({ publicId, onClose }: DeliveryDetailProps) {
  const { titleId, descriptionId } = useDialogIds();
  const delivery = useEmailDelivery(publicId);
  const retry = useRetryEmailDelivery();
  const cancel = useCancelEmailDelivery();
  const [action, setAction] = useState<DeliveryAction | undefined>();
  const [reason, setReason] = useState("");

  const selectedDelivery = delivery.data;
  const mutation = action === "retry" ? retry : cancel;
  const actionLabel = action === "retry" ? "Retry delivery" : "Cancel delivery";

  function beginAction(nextAction: DeliveryAction) {
    setReason("");
    setAction(nextAction);
  }

  function confirmAction() {
    if (!publicId || !action || !reason.trim()) return;
    mutation.mutate(
      { publicId, reason: reason.trim() },
      {
        onSuccess: () => {
          setAction(undefined);
          setReason("");
        },
      },
    );
  }

  return (
    <Dialog
      open={publicId !== undefined}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-h-[calc(100vh-2rem)] max-w-5xl overflow-y-auto p-0"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <DialogTitle id={titleId}>Delivery detail</DialogTitle>
          <DialogDescription id={descriptionId} className="mt-1 max-w-3xl">
            Safe operational metadata only. “Sent” means the SMTP provider accepted the message; it
            does not confirm inbox delivery. Message content, subjects, and recipient addresses
            remain redacted.
          </DialogDescription>
        </div>
        <Button
          variant="ghost"
          size="iconXs"
          aria-label="Close delivery detail"
          title="Close delivery detail"
          onClick={onClose}
        >
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {delivery.isPending ? (
        <div className="m-5 space-y-3 sm:m-6" role="status" aria-label="Loading delivery detail">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}
      {delivery.isError ? (
        <div
          className="m-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:m-6"
          role="alert"
        >
          <p className="text-sm font-semibold text-[var(--color-text)]">
            Delivery detail unavailable
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Retry shortly or return to the delivery list.
          </p>
        </div>
      ) : null}
      {selectedDelivery ? (
        <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Delivery status
              </p>
              <div className="mt-2">
                <StatusBadge status={selectedDelivery.status} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Recipient
              </p>
              <p className="mt-2 text-[var(--color-text)]">
                <bdi dir="ltr">{selectedDelivery.maskedRecipient}</bdi>
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Company
              </p>
              <div className="mt-2 text-[var(--color-text)]">
                {selectedDelivery.company ? (
                  <>
                    <p>{selectedDelivery.company.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-[var(--color-text-muted)]">
                      {selectedDelivery.company.code}
                    </p>
                  </>
                ) : selectedDelivery.context === "COMPANY" ? (
                  "Company record unavailable"
                ) : (
                  "Edara"
                )}
              </div>
            </div>
          </div>

          <dl className="grid gap-x-8 gap-y-5 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Email type
              </dt>
              <dd className="mt-1 font-mono text-xs text-[var(--color-text)]">
                {selectedDelivery.emailTypeKey}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Template revision
              </dt>
              <dd className="mt-1 font-mono text-xs text-[var(--color-text)]">
                {selectedDelivery.templateRevisionKey}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Context
              </dt>
              <dd className="mt-1 text-[var(--color-text)]">
                {humanize(selectedDelivery.context)} email ·{" "}
                {selectedDelivery.isTest ? "Test" : "Production"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Sender identity
              </dt>
              <dd className="mt-1 text-[var(--color-text)]">
                {selectedDelivery.senderAddress ? (
                  <bdi dir="ltr">
                    {selectedDelivery.senderName ? `${selectedDelivery.senderName} ` : ""}
                    &lt;{selectedDelivery.senderAddress}&gt;
                  </bdi>
                ) : (
                  "Not resolved"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Locale
              </dt>
              <dd className="mt-1 text-[var(--color-text)]">
                {selectedDelivery.locale.toUpperCase()} · {humanize(selectedDelivery.localeSource)}
                {selectedDelivery.localeFallbackApplied ? " fallback" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Time zone
              </dt>
              <dd className="mt-1 text-[var(--color-text)]">
                <bdi dir="ltr">{selectedDelivery.timeZone}</bdi> ·{" "}
                {humanize(selectedDelivery.timeZoneSource)}
                {selectedDelivery.timeZoneFallbackApplied ? " fallback" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Business reference
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-[var(--color-text)]">
                {selectedDelivery.businessReference}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Delivery ID
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-[var(--color-text)]">
                {selectedDelivery.publicId}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Created
              </dt>
              <dd className="mt-1 tabular-nums text-[var(--color-text)]">
                {formatDate(selectedDelivery.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                SMTP accepted at
              </dt>
              <dd className="mt-1 tabular-nums text-[var(--color-text)]">
                {formatDate(selectedDelivery.sentAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Provider acceptance ID
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-[var(--color-text)]">
                {selectedDelivery.providerMessageId ?? "–"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                Latest failure classification
              </dt>
              <dd className="mt-1 text-[var(--color-text)]">
                {selectedDelivery.lastFailureKind
                  ? humanize(selectedDelivery.lastFailureKind)
                  : "No failure recorded"}
              </dd>
            </div>
          </dl>

          {action ? (
            <section
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
              aria-labelledby="delivery-action-title"
            >
              <h2
                id="delivery-action-title"
                className="text-sm font-semibold text-[var(--color-text)]"
              >
                Confirm: {actionLabel}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                An operator reason is recorded in the audit trail. This action does not claim inbox
                delivery.
              </p>
              <Label htmlFor="delivery-action-reason" className="mt-4 block">
                Operator reason
              </Label>
              <Textarea
                id="delivery-action-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                className="mt-2 min-h-24"
                placeholder="Explain the intervention…"
              />
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setAction(undefined)}
                  disabled={mutation.isPending}
                >
                  Back
                </Button>
                <Button
                  intent={action === "cancel" ? "destructive" : "action"}
                  onClick={confirmAction}
                  disabled={!reason.trim() || mutation.isPending}
                  isLoading={mutation.isPending}
                >
                  {actionLabel}
                </Button>
              </div>
              {mutation.isError ? (
                <p className="mt-3 text-xs text-[var(--color-danger)]" role="alert">
                  The action could not be completed. The delivery state was not changed here.
                </p>
              ) : null}
            </section>
          ) : null}

          <section
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
            aria-labelledby="delivery-timeline-title"
          >
            <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] p-4">
              <div>
                <h2
                  id="delivery-timeline-title"
                  className="text-sm font-semibold text-[var(--color-text)]"
                >
                  Attempt timeline
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Recorded worker outcomes and operator actions.
                </p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
                {(selectedDelivery.timeline ?? []).length} events
              </span>
            </div>
            <ol className="relative px-4 py-1">
              <span
                className="absolute bottom-5 start-7 top-5 w-px bg-[var(--color-border)]"
                aria-hidden="true"
              />
              {(selectedDelivery.timeline ?? []).map((entry, index) => (
                <li
                  key={`${entry.stage}-${entry.occurredAt}-${index}`}
                  className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0"
                >
                  <span
                    className="relative z-10 flex size-6 items-center justify-center bg-[var(--color-surface)]"
                    aria-hidden="true"
                  >
                    <TimelineStageIcon stage={entry.stage} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {humanize(entry.stage)}
                      </p>
                      <p className="text-xs tabular-nums text-[var(--color-text-muted)]">
                        {formatDate(entry.occurredAt)}
                      </p>
                    </div>
                    {entry.attemptNumber || entry.failureKind ? (
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {entry.attemptNumber ? `Attempt ${entry.attemptNumber}` : ""}
                        {entry.attemptNumber && entry.failureKind ? " · " : ""}
                        {entry.failureKind ? humanize(entry.failureKind) : ""}
                      </p>
                    ) : null}
                    {entry.reason ? (
                      <p className="mt-2 border-s border-[var(--color-border)] ps-3 text-xs leading-5 text-[var(--color-text-muted)]">
                        {entry.reason}
                      </p>
                    ) : null}
                    {entry.providerMessageId ? (
                      <p className="mt-1 break-all font-mono text-xs text-[var(--color-text-muted)]">
                        Provider ID: <bdi dir="ltr">{entry.providerMessageId}</bdi>
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {action ? null : (
            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-4">
              {canRetry(selectedDelivery.status) ? (
                <Button intent="action" onClick={() => beginAction("retry")}>
                  Retry delivery
                </Button>
              ) : null}
              {canCancel(selectedDelivery.status) ? (
                <Button
                  variant="secondary"
                  className="text-[var(--color-danger)]"
                  onClick={() => beginAction("cancel")}
                >
                  Cancel delivery
                </Button>
              ) : null}
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}

interface DeliveryTableProps {
  deliveries: DeliveryRecord[];
  onSelect: (publicId: string) => void;
}

function DeliveryTable({ deliveries, onSelect }: DeliveryTableProps) {
  return (
    <>
      <div className="divide-y divide-[var(--color-border)] lg:hidden">
        {deliveries.map((delivery) => (
          <article key={delivery.publicId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-[var(--color-text)]">
                  {delivery.emailTypeKey}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  <bdi dir="ltr">{delivery.maskedRecipient}</bdi> · {formatDate(delivery.createdAt)}
                </p>
              </div>
              <StatusBadge status={delivery.status} />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => onSelect(delivery.publicId)}
            >
              View detail
            </Button>
          </article>
        ))}
      </div>
      <div className="scrollbar-calm hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1024px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {["Recipient", "Email type", "Context", "Status", "Attempts", "Created", ""].map(
                (label) => (
                  <th
                    key={label}
                    className={cn(
                      "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]",
                      label === ""
                        ? "text-end"
                        : label === "Attempts"
                          ? "text-center"
                          : "text-start",
                    )}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr
                key={delivery.publicId}
                className="border-b border-[var(--color-border)] last:border-b-0 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[var(--color-surface-2)]"
              >
                <td className="px-4 py-3 text-[13.5px] text-[var(--color-text)]">
                  <bdi dir="ltr">{delivery.maskedRecipient}</bdi>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-text)]">
                  {delivery.emailTypeKey}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={delivery.context === "EDARA" ? "primary" : "default"}>
                    {humanize(delivery.context)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={delivery.status} />
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-[13.5px] text-[var(--color-text-muted)]">
                  {delivery.attempts}
                </td>
                <td className="px-4 py-3 text-[12px] tabular-nums text-[var(--color-text-muted)]">
                  {formatDate(delivery.createdAt)}
                </td>
                <td className="px-4 py-3 text-end">
                  <Button variant="secondary" size="xs" onClick={() => onSelect(delivery.publicId)}>
                    Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Platform Admin operational history with safe, server-filtered delivery controls. */
export function AdminEmailDeliveriesPage() {
  const search = useSearch({ from: "/admin/email/deliveries" });
  const navigate = useNavigate({ from: "/admin/email/deliveries" });
  const deliveries = useEmailDeliveries(search);
  const companies = useDeliveryCompanyOptions();
  const emailTypes = useDeliveryEmailTypeOptions();
  const [draft, setDraft] = useState<DeliveryFilterDraft>(() => fromSearch(search));
  const [isSearchPending, setIsSearchPending] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setDraft(fromSearch(search));
  }, [
    search.companyPublicId,
    search.context,
    search.createdFrom,
    search.createdTo,
    search.emailTypeKey,
    search.recipientEmail,
    search.status,
  ]);

  function updateSearch(changes: Partial<typeof search>, resetPage = true) {
    void navigate({
      search: (previous) => ({ ...previous, ...changes, ...(resetPage ? { page: 1 } : {}) }),
    });
  }

  function clearFilters() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setIsSearchPending(false);
    setDraft(emptyDraft());
    void navigate({ search: { page: 1, pageSize: search.pageSize } });
  }

  function updateDraft(change: Partial<DeliveryFilterDraft>) {
    setDraft((previous) => ({ ...previous, ...change }));
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setIsSearchPending(true);
    searchTimerRef.current = setTimeout(() => {
      void navigate({
        search: (previous) => ({
          ...previous,
          companyPublicId: draft.companyPublicId || undefined,
          context: draft.context,
          emailTypeKey: draft.emailTypeKey || undefined,
          recipientEmail: draft.recipientEmail || undefined,
          status: draft.status,
          createdFrom: draft.createdFrom,
          createdTo: draft.createdTo,
          deliveryId: undefined,
          page: 1,
        }),
      });
      setIsSearchPending(false);
    }, 250);
  }

  function selectDelivery(deliveryId: string) {
    updateSearch({ deliveryId }, false);
  }

  function closeDelivery() {
    updateSearch({ deliveryId: undefined }, false);
  }

  const totalPages = Math.max(1, deliveries.data?.meta.totalPages ?? 1);
  const currentPage = Math.min(deliveries.data?.meta.page ?? search.page, totalPages);
  const totalItems = deliveries.data?.meta.totalItems ?? 0;
  const pageSize = deliveries.data?.meta.pageSize ?? search.pageSize;
  const visibleRangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleRangeEnd = Math.min(
    visibleRangeStart + (deliveries.data?.items.length ?? 0) - 1,
    totalItems,
  );

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
            Email deliveries
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Operational history for accepted, queued, retried, failed, and cancelled email attempts.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<RefreshCw size={14} aria-hidden="true" />}
          onClick={() => void deliveries.refetch()}
        >
          Refresh
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={submitFilters}>
            <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Filter size={15} aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Refine delivery history</CardTitle>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    Changes stay local until you run the search.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  leadingIcon={<RotateCcw size={13} aria-hidden="true" />}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSearchPending}
                  leadingIcon={<Search size={14} aria-hidden="true" />}
                >
                  Search deliveries
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-h-[74px]">
                <Label htmlFor="delivery-context">Context</Label>
                <Select
                  value={draft.context}
                  onValueChange={(context) => updateDraft({ context: optionalContext(context) })}
                >
                  <SelectTrigger id="delivery-context" className="mt-1.5">
                    <SelectValue placeholder="All contexts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All contexts</SelectItem>
                    <SelectItem value="EDARA">Edara</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-h-[74px]">
                <Label htmlFor="delivery-status">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(status) => updateDraft({ status: optionalStatus(status) })}
                >
                  <SelectTrigger id="delivery-status" className="mt-1.5">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {DELIVERY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {humanize(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SearchableFilterSelect
                id="delivery-template"
                label="Email type"
                value={draft.emailTypeKey}
                placeholder="Search email types"
                options={emailTypes.data}
                loading={emailTypes.isPending}
                error={emailTypes.isError}
                onValueChange={(emailTypeKey) => updateDraft({ emailTypeKey })}
              />
              <div className="min-h-[74px]">
                <Label htmlFor="delivery-recipient">Recipient</Label>
                <Input
                  id="delivery-recipient"
                  type="search"
                  className="mt-1.5"
                  value={draft.recipientEmail}
                  onChange={(event) => updateDraft({ recipientEmail: event.target.value })}
                  placeholder="name@example.com"
                />
              </div>
              <SearchableFilterSelect
                id="delivery-company"
                label="Company"
                value={draft.companyPublicId}
                placeholder="Search code or company name"
                options={companies.data}
                loading={companies.isPending}
                error={companies.isError}
                onValueChange={(companyPublicId) => updateDraft({ companyPublicId })}
              />
              <DateTimePicker
                id="delivery-from"
                label="Created from"
                value={draft.createdFrom}
                boundary="from"
                text={DELIVERY_PICKER_TEXT}
                onChange={(createdFrom) => updateDraft({ createdFrom })}
              />
              <DateTimePicker
                id="delivery-to"
                label="Created to"
                value={draft.createdTo}
                boundary="to"
                text={DELIVERY_PICKER_TEXT}
                onChange={(createdTo) => updateDraft({ createdTo })}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {deliveries.isPending ? (
            <div className="space-y-3 p-4" role="status" aria-label="Loading email deliveries">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : null}
          {deliveries.isError && isPermissionError(deliveries.error) ? (
            <EmptyState
              icon={ShieldAlert}
              title="Delivery history is restricted"
              description="You do not have permission to inspect email delivery operations."
            />
          ) : null}
          {deliveries.isError && !isPermissionError(deliveries.error) ? (
            <EmptyState
              icon={Mail}
              title="Delivery history unavailable"
              description="The delivery service is temporarily unavailable. No message content is shown."
              action={
                <Button variant="secondary" size="sm" onClick={() => void deliveries.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : null}
          {deliveries.data && deliveries.data.items.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No deliveries match these filters"
              description="Adjust the filters or expand the time range to inspect another set of delivery attempts."
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : null}
          {deliveries.data && deliveries.data.items.length > 0 ? (
            <DeliveryTable deliveries={deliveries.data.items} onSelect={selectDelivery} />
          ) : null}
        </CardContent>
        {deliveries.data ? (
          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="text-[13px] font-semibold text-[var(--color-text)]">
                {totalItems}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">deliveries</span>
              {totalItems > 0 ? (
                <span className="text-xs text-[var(--color-text-faint)]">
                  {" \u00b7 Showing "}
                  {visibleRangeStart}
                  {"\u2013"}
                  {visibleRangeEnd}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-prev"
                disabled={currentPage <= 1}
                onClick={() => updateSearch({ page: currentPage - 1 }, false)}
                aria-label="Previous page"
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="select-none px-2 text-[12px] tabular-nums text-[var(--color-text-muted)]">
                Page <span className="font-semibold text-[var(--color-text)]">{currentPage}</span>{" "}
                of {totalPages}
              </span>
              <Button
                variant="nav"
                size="iconXs"
                className="btn-nav-next"
                disabled={currentPage >= totalPages}
                onClick={() => updateSearch({ page: currentPage + 1 }, false)}
                aria-label="Next page"
                title="Next page"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
      <DeliveryDetail publicId={search.deliveryId} onClose={closeDelivery} />
    </div>
  );
}
