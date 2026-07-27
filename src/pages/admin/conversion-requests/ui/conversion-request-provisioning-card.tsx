import { RefreshCw } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ConversionRequest, OnboardingDelivery } from "../api/conversion-requests";

interface ConversionRequestProvisioningCardProps {
  request: ConversionRequest;
  delivery: OnboardingDelivery | null;
  isDeliveryLoading: boolean;
  isRetryingDelivery: boolean;
  hasDeliveryLoadError: boolean;
  onReloadDelivery: () => void;
  onRetryDelivery: () => void;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getDeliveryVariant(status: OnboardingDelivery["status"]) {
  if (status === "SUCCEEDED") return "success";
  if (status === "EXHAUSTED") return "danger";
  return "warning";
}

function getDeliveryStateMessage(status: OnboardingDelivery["status"]): string {
  if (status === "FAILED_RETRYABLE") {
    return "Delivery failed before max attempts. Retry sends the invitation again without reprovisioning.";
  }

  if (status === "SUCCEEDED") {
    return "Invitation delivery succeeded. This does not mean the owner accepted the invitation.";
  }

  if (status === "EXHAUSTED") {
    return "Delivery attempts are exhausted. Retry is disabled; escalate support recovery.";
  }

  return "Delivery is pending or in progress. Inspect attempts before taking action.";
}

export function ConversionRequestProvisioningCard({
  request,
  delivery,
  isDeliveryLoading,
  isRetryingDelivery,
  hasDeliveryLoadError,
  onReloadDelivery,
  onRetryDelivery,
}: ConversionRequestProvisioningCardProps) {
  if (request.status !== "APPROVED" && !request.company && !delivery) return null;

  const canRetryDelivery = delivery?.status === "FAILED_RETRYABLE";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provisioning and onboarding delivery</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section>
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
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Not provisioned in the current request projection.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                Owner invitation delivery
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Delivery is tracked independently from company provisioning and owner onboarding.
              </p>
            </div>
            <Button
              intent="utility"
              type="button"
              onClick={onReloadDelivery}
              disabled={isDeliveryLoading}
              isLoading={isDeliveryLoading}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
          </div>

          {delivery ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getDeliveryVariant(delivery.status)}>
                  {delivery.status.toLowerCase().replace(/_/g, " ")}
                </Badge>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Attempts {delivery.attemptCount} / {delivery.maxAttempts}
                </span>
              </div>

              <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                {getDeliveryStateMessage(delivery.status)}
              </p>

              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-[var(--color-text-faint)]">Last attempted</dt>
                  <dd>{formatDateTime(delivery.lastAttemptedAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-faint)]">Delivered</dt>
                  <dd>{formatDateTime(delivery.deliveredAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-faint)]">Exhausted</dt>
                  <dd>{formatDateTime(delivery.exhaustedAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-faint)]">Updated</dt>
                  <dd>{formatDateTime(delivery.updatedAt)}</dd>
                </div>
              </dl>

              {delivery.lastError && (
                <p className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-xs text-[var(--color-danger)]">
                  {delivery.lastError}
                </p>
              )}

              <Button
                intent="action"
                type="button"
                onClick={onRetryDelivery}
                disabled={!canRetryDelivery || isRetryingDelivery}
                isLoading={isRetryingDelivery}
              >
                Retry delivery
              </Button>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              {hasDeliveryLoadError
                ? "Delivery state could not be loaded. Refresh before retrying or escalating."
                : "No delivery record is available yet."}
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
