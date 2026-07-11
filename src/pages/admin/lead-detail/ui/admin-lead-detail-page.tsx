import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import type {
  ConvertLeadResult,
  Lead,
  LeadActivityListResponse,
  LeadContact,
  LeadStatus,
} from "../api/lead-detail";
import {
  useDeleteLead,
  useDeleteLeadContact,
  useLead,
  useLeadActivities,
  useUpdateLeadContact,
} from "../api/lead-detail";
import { ACTIVITY_TYPE_LABEL, SIZE_LABEL, SOURCE_LABEL, STATUS_BADGE } from "../api/lead-labels";
import { ConvertLeadModal } from "./convert-lead-modal";
import { EditLeadModal } from "./edit-lead-modal";
import { LeadContactFormModal } from "./lead-contact-form-modal";
import { LogActivityForm } from "./log-activity-form";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CONVERTIBLE_LEAD_STATUSES = new Set<LeadStatus>([
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "WAITING_QUOTATION",
  "QUOTATION_SENT",
  "TRIAL_STARTED",
  "NEGOTIATION",
]);

function isLeadConversionFromAnyStateAllowed(): boolean {
  return import.meta.env.ALLOW_CONVERT_LEAD_TO_COMPANY_FROM_ANY_STATE === "true";
}

function canConvertLead(lead: Lead, allowConvertFromAnyState: boolean): boolean {
  if (lead.isConverted || lead.status === "WON_CONVERTED") return false;
  if (allowConvertFromAnyState) return true;
  return CONVERTIBLE_LEAD_STATUSES.has(lead.status);
}

// --- Profile ----------------------------------------------------------------

function LeadProfileCard({ lead }: { lead: Lead }) {
  const status = STATUS_BADGE[lead.status];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="text-[var(--color-text-faint)]">Status</dt>
            <dd className="mt-1">
              <Badge variant={status.variant}>{status.label}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Source</dt>
            <dd className="mt-1 text-[var(--color-text)]">{SOURCE_LABEL[lead.source]}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Company size</dt>
            <dd className="mt-1 text-[var(--color-text)]">{SIZE_LABEL[lead.companySizeRange]}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Attempts</dt>
            <dd className="mt-1 tabular-nums text-[var(--color-text)]">{lead.numberOfAttempts}</dd>
          </div>
          {lead.website && (
            <div className="col-span-2">
              <dt className="text-[var(--color-text-faint)]">Website</dt>
              <dd className="mt-1 flex items-center gap-1 text-[var(--color-text)]">
                <Globe size={11} className="shrink-0 text-[var(--color-text-muted)]" />
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-[var(--color-primary)]"
                >
                  {lead.website.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          )}
          {lead.lostReason && (
            <div className="col-span-2">
              <dt className="text-[var(--color-text-faint)]">Lost reason</dt>
              <dd className="mt-1 text-[var(--color-text)]">
                {lead.lostReason.toLowerCase().replace(/_/g, " ")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--color-text-faint)]">Created</dt>
            <dd className="mt-1 tabular-nums text-[var(--color-text-muted)]">
              {formatDate(lead.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Updated</dt>
            <dd className="mt-1 tabular-nums text-[var(--color-text-muted)]">
              {formatDate(lead.updatedAt)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

// --- Contacts ----------------------------------------------------------------

function LeadContactsCard({
  contacts,
  onAdd,
  onEdit,
  onDelete,
  onMakePrimary,
  isMakingPrimary,
}: {
  contacts: LeadContact[];
  onAdd: () => void;
  onEdit: (contact: LeadContact) => void;
  onDelete: (contact: LeadContact) => void;
  onMakePrimary: (contact: LeadContact) => void;
  isMakingPrimary: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button intent="utility" leadingIcon={<Plus size={13} />} onClick={onAdd}>
          Add
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {contacts.length === 0 ? (
          <p className="text-xs text-[var(--color-text-faint)]">No contacts recorded.</p>
        ) : (
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li key={contact.publicId} className="flex items-start gap-3">
                <Avatar size="sm" alt={contact.name ?? "?"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                      {contact.name ?? "-"}
                    </p>
                    {contact.isPrimary && <Badge variant="primary">Primary</Badge>}
                  </div>
                  {contact.jobTitle && (
                    <p className="text-xs text-[var(--color-text-muted)]">{contact.jobTitle}</p>
                  )}
                  {contact.email && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Phone size={11} className="shrink-0" />
                      {contact.phone}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {!contact.isPrimary && (
                      <Button
                        intent="utility"
                        leadingIcon={<Star size={12} />}
                        disabled={isMakingPrimary}
                        isLoading={isMakingPrimary}
                        onClick={() => onMakePrimary(contact)}
                      >
                        Make primary
                      </Button>
                    )}
                    <Button
                      intent="utility"
                      leadingIcon={<Pencil size={12} />}
                      onClick={() => onEdit(contact)}
                    >
                      Edit
                    </Button>
                    <Button
                      intent="utility"
                      className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                      leadingIcon={<Trash2 size={12} />}
                      onClick={() => onDelete(contact)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// --- Activity timeline --------------------------------------------------------

function LeadActivityTimelineCard({
  leadPublicId,
  page,
  onPageChange,
  data,
  isPending,
  isError,
}: {
  leadPublicId: string;
  page: number;
  onPageChange: (page: number) => void;
  data: LeadActivityListResponse | undefined;
  isPending: boolean;
  isError: boolean;
}) {
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
                    {ACTIVITY_TYPE_LABEL[activity.type]}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-faint)]">
                    {formatDateTime(activity.createdAt)}
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

// --- Page ---------------------------------------------------------------------

/** Mutually exclusive: at most one edit/confirm surface is open at a time. */
type LeadDetailPanel =
  | { kind: "none" }
  | { kind: "edit-lead" }
  | { kind: "convert-lead" }
  | { kind: "delete-lead" }
  | { kind: "contact-form"; contact: LeadContact | null }
  | { kind: "delete-contact"; contact: LeadContact };

export function AdminLeadDetailPage() {
  const { publicId } = useParams({ from: "/admin/leads/$publicId" });
  const navigate = useNavigate();
  const [activityPage, setActivityPage] = useState(1);
  const [panel, setPanel] = useState<LeadDetailPanel>({ kind: "none" });
  const closePanel = () => setPanel({ kind: "none" });

  const { data, isPending, isError } = useLead(publicId);
  const activities = useLeadActivities(publicId, activityPage);
  const deleteLead = useDeleteLead();
  const deleteContact = useDeleteLeadContact();
  const updateContact = useUpdateLeadContact();
  const allowConvertFromAnyState = isLeadConversionFromAnyStateAllowed();

  function backToLeads() {
    void navigate({ to: "/admin/leads", search: { page: 1, pageSize: 10 } });
  }

  async function confirmDeleteLead() {
    await deleteLead.mutateAsync(publicId);
    backToLeads();
  }

  async function confirmDeleteContact() {
    if (panel.kind !== "delete-contact") return;
    await deleteContact.mutateAsync({ publicId, contactPublicId: panel.contact.publicId });
    closePanel();
  }

  function goToConvertedCompany(company: ConvertLeadResult) {
    closePanel();
    void navigate({ to: "/admin/companies/$publicId", params: { publicId: company.publicId } });
  }

  function makeContactPrimary(contact: LeadContact) {
    updateContact.mutate({
      publicId,
      contactPublicId: contact.publicId,
      input: { isPrimary: true },
    });
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[1200px]">
        <EmptyState
          icon={Users}
          title="Couldn't load this lead"
          description="It may have been removed, or something went wrong. Please try again."
          action={
            <Button intent="navigation" leadingIcon={<ArrowLeft size={14} />} onClick={backToLeads}>
              Back to leads
            </Button>
          }
        />
      </div>
    );
  }

  const { lead, contacts } = data;
  const canConvert = canConvertLead(lead, allowConvertFromAnyState);

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <Button
          intent="navigation"
          leadingIcon={<ArrowLeft size={14} />}
          onClick={backToLeads}
          className="mb-3"
        >
          Back to leads
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
              {lead.companyName ?? "Untitled lead"}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-muted)]">
              {lead.industry && <span>{lead.industry}</span>}
              {(lead.city ?? lead.country) && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {[lead.city, lead.country].filter(Boolean).join(", ")}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canConvert && (
              <Button
                intent="utility"
                leadingIcon={<ArrowRightLeft size={13} />}
                onClick={() => setPanel({ kind: "convert-lead" })}
              >
                Convert
              </Button>
            )}
            <Button
              intent="utility"
              leadingIcon={<Pencil size={13} />}
              onClick={() => setPanel({ kind: "edit-lead" })}
            >
              Edit
            </Button>
            <Button
              intent="utility"
              className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
              leadingIcon={<Trash2 size={13} />}
              onClick={() => setPanel({ kind: "delete-lead" })}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadActivityTimelineCard
            leadPublicId={publicId}
            page={activityPage}
            onPageChange={setActivityPage}
            data={activities.data}
            isPending={activities.isPending}
            isError={activities.isError}
          />
        </div>

        <div className="space-y-6">
          <LeadProfileCard lead={lead} />
          <LeadContactsCard
            contacts={contacts}
            onAdd={() => setPanel({ kind: "contact-form", contact: null })}
            onEdit={(contact) => setPanel({ kind: "contact-form", contact })}
            onDelete={(contact) => setPanel({ kind: "delete-contact", contact })}
            onMakePrimary={makeContactPrimary}
            isMakingPrimary={updateContact.isPending}
          />
        </div>
      </div>

      <ConvertLeadModal
        leadWithContacts={panel.kind === "convert-lead" ? { lead, contacts } : null}
        onClose={closePanel}
        onConverted={goToConvertedCompany}
      />

      <EditLeadModal lead={panel.kind === "edit-lead" ? lead : null} onClose={closePanel} />

      <ConfirmDialog
        open={panel.kind === "delete-lead"}
        title="Delete this lead?"
        description="This removes the lead from the pipeline. This cannot be undone."
        confirmLabel="Delete lead"
        isLoading={deleteLead.isPending}
        onConfirm={confirmDeleteLead}
        onClose={closePanel}
      />

      <LeadContactFormModal
        leadPublicId={publicId}
        state={panel.kind === "contact-form" ? { contact: panel.contact } : null}
        onClose={closePanel}
      />

      <ConfirmDialog
        open={panel.kind === "delete-contact"}
        title="Remove this contact?"
        description="This removes the contact from the lead. This cannot be undone."
        confirmLabel="Remove contact"
        isLoading={deleteContact.isPending}
        onConfirm={confirmDeleteContact}
        onClose={closePanel}
      />
    </div>
  );
}
