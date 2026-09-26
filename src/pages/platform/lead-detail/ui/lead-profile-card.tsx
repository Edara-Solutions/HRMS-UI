import { Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Status } from "@/shared/ui/status";
import type { Lead } from "../api/lead-detail";
import { SIZE_LABEL, SOURCE_LABEL } from "../api/lead-labels";
import { formatLeadDate } from "../lib/lead-detail-date";

interface LeadProfileCardProps {
  lead: Lead;
}

export function LeadProfileCard({ lead }: LeadProfileCardProps) {
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
              <Status status={lead.status} />
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Source</dt>
            <dd className="mt-1 text-[var(--color-text)]">
              {SOURCE_LABEL[lead.source] ?? lead.source.toLowerCase().replace(/_/g, " ")}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Company size</dt>
            <dd className="mt-1 text-[var(--color-text)]">
              {SIZE_LABEL[lead.companySizeRange] ?? lead.companySizeRange}
            </dd>
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
              {formatLeadDate(lead.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Updated</dt>
            <dd className="mt-1 tabular-nums text-[var(--color-text-muted)]">
              {formatLeadDate(lead.updatedAt)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
