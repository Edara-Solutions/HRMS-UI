import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ConversionRequest } from "../api/conversion-requests";

interface ConversionRequestDetailsCardProps {
  request: ConversionRequest;
}

function formatActor(actor: ConversionRequest["requester"] | null) {
  return actor ? `${actor.firstName} ${actor.lastName} (${actor.email})` : "Not recorded";
}

export function ConversionRequestDetailsCard({ request }: ConversionRequestDetailsCardProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Lead and primary contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 text-sm">
          <div>
            <p className="text-[var(--color-text-faint)]">Company</p>
            <p>{request.lead.companyName ?? "Untitled lead"}</p>
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Location</p>
            <p>
              {[request.lead.city, request.lead.country].filter(Boolean).join(", ") ||
                "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Lead status</p>
            <p>{request.lead.status.toLowerCase().replace(/_/g, " ")}</p>
          </div>
          {request.primaryContact ? (
            <div>
              <p className="text-[var(--color-text-faint)]">Primary contact</p>
              <p>{request.primaryContact.name}</p>
              <p className="text-[var(--color-text-muted)]">
                {request.primaryContact.email}
                {request.primaryContact.phone ? ` - ${request.primaryContact.phone}` : ""}
              </p>
              <code className="text-[11px] text-[var(--color-text-faint)]">
                {request.primaryContact.publicId}
              </code>
            </div>
          ) : (
            <p className="text-[var(--color-danger)]">No active primary contact.</p>
          )}
          <code className="text-[11px] text-[var(--color-text-faint)]">
            Lead: {request.lead.publicId}
          </code>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Plan and actors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 text-sm">
          <div>
            <p className="text-[var(--color-text-faint)]">Selected plan</p>
            <p>
              {request.plan.name} - {request.plan.duration} days
            </p>
            <code className="text-[11px] text-[var(--color-text-faint)]">
              {request.plan.publicId}
            </code>
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Requester</p>
            <p>{formatActor(request.requester)}</p>
            <code className="text-[11px] text-[var(--color-text-faint)]">
              {request.requester.publicId}
            </code>
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Approved by</p>
            <p>{formatActor(request.approvedBy)}</p>
            {request.approvedBy && (
              <code className="text-[11px] text-[var(--color-text-faint)]">
                {request.approvedBy.publicId}
              </code>
            )}
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Rejected by</p>
            <p>{formatActor(request.rejectedBy)}</p>
            {request.rejectedBy && (
              <code className="text-[11px] text-[var(--color-text-faint)]">
                {request.rejectedBy.publicId}
              </code>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
