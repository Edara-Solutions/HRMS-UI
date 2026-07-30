import { ExternalLink, Users } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { Status } from "@/shared/ui/status";
import { SIZE_LABEL, SOURCE_LABEL } from "../api/lead-labels";
import type { LeadWithContacts } from "../api/leads";

interface LeadsTableProps {
  items: Array<LeadWithContacts>;
  onView: (publicId: string) => void;
}

interface LeadsTableCardContentProps extends LeadsTableProps {
  isError: boolean;
  isPending: boolean;
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatLostReason(value: string): string {
  return value.toLowerCase().replace(/_/g, " ");
}

function renderMobileLeadCard(item: LeadWithContacts, onView: (publicId: string) => void) {
  const { lead, contacts } = item;
  const primary = contacts.find((contact) => contact.isPrimary);

  return (
    <article className="p-4">
      <div className="flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-start min-[560px]:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
            {lead.companyName ?? "-"}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {lead.city ?? lead.country ?? "-"}
          </p>
        </div>
        <Status status={lead.status} />
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-xs min-[520px]:grid-cols-2">
        <div>
          <dt className="text-[var(--color-text-faint)]">Primary contact</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">{primary?.name ?? "-"}</dd>
          {primary?.jobTitle && (
            <dd className="text-[var(--color-text-muted)]">{primary.jobTitle}</dd>
          )}
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Industry / size</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">{lead.industry ?? "-"}</dd>
          <dd className="text-[var(--color-text-muted)]">
            {SIZE_LABEL[lead.companySizeRange] ?? lead.companySizeRange}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Source</dt>
          <dd className="mt-0.5 text-[var(--color-text-muted)]">
            {SOURCE_LABEL[lead.source] ?? lead.source}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Attempts</dt>
          <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
            {lead.numberOfAttempts}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Updated</dt>
          <dd className="mt-0.5 tabular-nums text-[var(--color-text-muted)]">
            {formatShortDate(lead.updatedAt)}
          </dd>
        </div>
        {lead.lostReason && (
          <div>
            <dt className="text-[var(--color-text-faint)]">Reason</dt>
            <dd className="mt-0.5 text-[var(--color-text-muted)]">
              {formatLostReason(lead.lostReason)}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-col gap-2 min-[520px]:flex-row">
        <Button
          intent="utility"
          leadingIcon={<ExternalLink size={13} />}
          className="w-full"
          onClick={() => onView(lead.publicId)}
        >
          View
        </Button>
      </div>
    </article>
  );
}

function createLeadColumns(
  onView: (publicId: string) => void,
): Array<DataTableColumn<LeadWithContacts>> {
  return [
    {
      id: "company",
      header: "Company",
      cell: ({ lead }) => (
        <>
          <p className="text-[13.5px] font-medium text-[var(--color-text)]">
            {lead.companyName ?? <span className="text-[var(--color-text-faint)]">-</span>}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {lead.city ?? lead.country ?? "-"}
          </p>
        </>
      ),
    },
    {
      id: "primary-contact",
      header: "Primary contact",
      cell: ({ contacts }) => {
        const primary = contacts.find((contact) => contact.isPrimary);
        if (!primary) return <span className="text-[var(--color-text-faint)]">-</span>;
        return (
          <>
            <p className="text-[13px] text-[var(--color-text)]">{primary.name ?? "-"}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{primary.jobTitle ?? ""}</p>
          </>
        );
      },
    },
    {
      id: "industry-size",
      header: "Industry / size",
      cell: ({ lead }) => (
        <>
          <p className="text-[13px] text-[var(--color-text)]">{lead.industry ?? "-"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {SIZE_LABEL[lead.companySizeRange] ?? lead.companySizeRange}
          </p>
        </>
      ),
    },
    {
      id: "source",
      header: "Source",
      cell: ({ lead }) => SOURCE_LABEL[lead.source] ?? lead.source,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ lead }) => (
        <>
          <Status status={lead.status} />
          {lead.lostReason && (
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {formatLostReason(lead.lostReason)}
            </p>
          )}
        </>
      ),
    },
    {
      id: "attempts",
      header: "Attempts",
      align: "end",
      className: "tabular-nums",
      cell: ({ lead }) => lead.numberOfAttempts,
    },
    {
      id: "updated",
      header: "Updated",
      className: "text-[12.5px] tabular-nums",
      cell: ({ lead }) => formatShortDate(lead.updatedAt),
    },
    {
      id: "actions",
      header: "Actions",
      align: "end",
      cell: ({ lead }) => (
        <div className="flex justify-end gap-2">
          <Button
            intent="utility"
            leadingIcon={<ExternalLink size={13} />}
            onClick={() => onView(lead.publicId)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];
}

export function LeadsTable({ items, onView }: LeadsTableProps) {
  return (
    <DataTable
      items={items}
      columns={createLeadColumns(onView)}
      getRowKey={(item) => item.lead.publicId}
      minWidth="800px"
      mobileBreakpoint="lg"
      renderMobileItem={(item) => renderMobileLeadCard(item, onView)}
    />
  );
}

export function LeadsTableCardContent({
  isError,
  isPending,
  items,
  onView,
}: LeadsTableCardContentProps) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Users size={32} className="text-[var(--color-text-faint)]" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Couldn't load leads</p>
        <p className="text-xs text-[var(--color-text-faint)]">Please try again shortly.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Loading leads...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Users size={32} className="text-[var(--color-text-faint)]" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No leads found</p>
        <p className="text-xs text-[var(--color-text-faint)]">
          Try adjusting filters or search query
        </p>
      </div>
    );
  }

  return <LeadsTable items={items} onView={onView} />;
}
