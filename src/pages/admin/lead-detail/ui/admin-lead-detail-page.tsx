import { useNavigate, useParams } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ArrowLeft, MapPin, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { type PageTabItem, PageTabs } from "@/shared/ui/page-tabs";
import { Skeleton } from "@/shared/ui/skeleton";
import type { LeadContact } from "../api/lead-detail";
import {
  useDeleteLead,
  useDeleteLeadContact,
  useLead,
  useLeadActivities,
  useLeadConversionEligibility,
  useSetLeadArchived,
  useUpdateLeadContact,
} from "../api/lead-detail";
import { STATUS_BADGE } from "../api/lead-labels";
import { ConversionSubmissionCard } from "./conversion-submission-card";
import { EditLeadModal } from "./edit-lead-modal";
import { LeadActivityTimelineCard } from "./lead-activity-timeline-card";
import { LeadContactFormModal } from "./lead-contact-form-modal";
import { LeadContactsCard } from "./lead-contacts-card";
import { LeadEligibilityCard } from "./lead-eligibility-card";
import { LeadProfileCard } from "./lead-profile-card";
import { SendingDomainCard } from "./sending-domain-card";

type LeadDetailTab = "profile" | "conversion" | "domain" | "activity";

const LEAD_DETAIL_TABS: Array<PageTabItem<LeadDetailTab>> = [
  { value: "profile", label: "Profile" },
  { value: "conversion", label: "Conversion" },
  { value: "domain", label: "Domain" },
  { value: "activity", label: "Activity" },
];

// --- Page ---------------------------------------------------------------------

/** Mutually exclusive: at most one edit/confirm surface is open at a time. */
type LeadDetailPanel =
  | { kind: "none" }
  | { kind: "edit-lead" }
  | { kind: "primary-contact-warning" }
  | { kind: "delete-lead" }
  | { kind: "contact-form"; contact: LeadContact | null }
  | { kind: "delete-contact"; contact: LeadContact };

export function AdminLeadDetailPage() {
  const { publicId } = useParams({ from: "/admin/leads/$publicId" });
  const navigate = useNavigate();
  const [activityPage, setActivityPage] = useState(1);
  const [activeTab, setActiveTab] = useState<LeadDetailTab>("profile");
  const [panel, setPanel] = useState<LeadDetailPanel>({ kind: "none" });
  const closePanel = () => setPanel({ kind: "none" });

  const { data, isPending, isError } = useLead(publicId);
  const activities = useLeadActivities(publicId, activityPage);
  const eligibility = useLeadConversionEligibility(publicId);
  const deleteLead = useDeleteLead();
  const deleteContact = useDeleteLeadContact();
  const updateContact = useUpdateLeadContact();
  const setArchived = useSetLeadArchived();

  function backToLeads() {
    void navigate({ to: "/admin/leads", search: { isArchived: false, page: 1, pageSize: 10 } });
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
          <div className="flex items-start gap-2">
            <Button
              intent="utility"
              leadingIcon={lead.isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
              disabled={setArchived.isPending || lead.isConverted}
              isLoading={setArchived.isPending}
              onClick={() => setArchived.mutate({ publicId, isArchived: !lead.isArchived })}
            >
              {lead.isArchived ? "Unarchive" : "Archive"}
            </Button>
            <Button
              intent="utility"
              leadingIcon={<Pencil size={13} />}
              disabled={
                lead.isConverted ||
                lead.status === "WON_CONVERTED" ||
                STATUS_BADGE[lead.status] === undefined
              }
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

      <PageTabs
        items={LEAD_DETAIL_TABS}
        value={activeTab}
        onValueChange={setActiveTab}
        ariaLabel="Lead detail sections"
      />

      {activeTab === "profile" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <LeadProfileCard lead={lead} />
          <LeadContactsCard
            contacts={contacts}
            onAdd={() => setPanel({ kind: "contact-form", contact: null })}
            onEdit={(contact) => setPanel({ kind: "contact-form", contact })}
            onDelete={(contact) =>
              setPanel(
                contact.isPrimary
                  ? { kind: "primary-contact-warning" }
                  : { kind: "delete-contact", contact },
              )
            }
            onMakePrimary={makeContactPrimary}
            isMakingPrimary={updateContact.isPending}
          />
        </div>
      ) : null}

      {activeTab === "conversion" ? (
        <div className="space-y-6">
          <LeadEligibilityCard
            data={eligibility.data}
            isPending={eligibility.isPending}
            isError={eligibility.isError}
            isRefreshing={eligibility.isFetching}
            onRefresh={() => void eligibility.refetch()}
          />
          <ConversionSubmissionCard
            leadPublicId={publicId}
            refreshEligibility={async () => (await eligibility.refetch()).data}
          />
        </div>
      ) : null}

      {activeTab === "domain" ? (
        <SendingDomainCard leadPublicId={publicId} leadWebsite={lead.website} />
      ) : null}

      {activeTab === "activity" ? (
        <LeadActivityTimelineCard
          leadPublicId={publicId}
          page={activityPage}
          onPageChange={setActivityPage}
          data={activities.data}
          isPending={activities.isPending}
          isError={activities.isError}
        />
      ) : null}

      <EditLeadModal lead={panel.kind === "edit-lead" ? lead : null} onClose={closePanel} />
      {panel.kind === "primary-contact-warning" && (
        <div
          role="alert"
          className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] px-4 py-3 text-sm text-[var(--color-text)]"
        >
          <p className="font-semibold">Promote another contact first</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Make another contact primary, wait for the refreshed lead state, then remove this
            contact.
          </p>
          <Button className="mt-3" intent="dismissive" onClick={closePanel}>
            Close
          </Button>
        </div>
      )}

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
