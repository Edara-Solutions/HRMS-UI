import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ConversionRequest } from "../api/conversion-requests";

interface ConversionRequestProvisioningCardProps {
  request: ConversionRequest;
}

export function ConversionRequestProvisioningCard({
  request,
}: ConversionRequestProvisioningCardProps) {
  if (!request.company && !request.ownerOnboardingDelivery) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provisioning and onboarding delivery</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
            Provisioned company
          </p>
          {request.company ? (
            <>
              <p className="mt-1 text-sm">
                {request.company.name} ({request.company.companyCode})
              </p>
              <code className="text-[11px] text-[var(--color-text-faint)]">
                {request.company.publicId}
              </code>
            </>
          ) : (
            <p className="mt-1 text-sm">Not provisioned</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
            Invitation delivery
          </p>
          {request.ownerOnboardingDelivery ? (
            <>
              <Badge
                variant={
                  request.ownerOnboardingDelivery.status === "SUCCEEDED"
                    ? "success"
                    : request.ownerOnboardingDelivery.status === "EXHAUSTED"
                      ? "danger"
                      : "warning"
                }
              >
                {request.ownerOnboardingDelivery.status.toLowerCase().replace(/_/g, " ")}
              </Badge>
              <code className="block text-[11px] text-[var(--color-text-faint)]">
                {request.ownerOnboardingDelivery.publicId}
              </code>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Attempts: {request.ownerOnboardingDelivery.attemptCount} /{" "}
                {request.ownerOnboardingDelivery.maxAttempts}
              </p>
              {request.ownerOnboardingDelivery.lastError && (
                <p className="mt-1 text-xs text-[var(--color-danger)]">
                  {request.ownerOnboardingDelivery.lastError}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm">No delivery record</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
