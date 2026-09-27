import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations, usePlatformAccess } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { QueryPanel } from "@/shared/ui/query-panel";
import { type ConversionRequest, canRetry, deliveryQuery } from "../api/review";
import type { useReviewCommands } from "../model/use-review-commands";

interface Props {
  request: ConversionRequest;
  disabled: boolean;
  commands: ReturnType<typeof useReviewCommands>;
}
export function DeliveryPanel({ request, disabled, commands }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const read = access.availability(operations.delivery.key);
  const retry = access.availability(operations.retryDelivery.key);
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...deliveryQuery(
      access.user?.publicId ?? "",
      request.publicId,
      request.ownerOnboardingDelivery?.publicId,
    ),
    enabled: read.state === "enabled",
  });
  if (read.state === "hidden") return null;
  const delivery = data;
  return (
    <QueryPanel
      title={t("delivery.title")}
      pending={isPending && read.state === "enabled"}
      error={error}
      retry={() => void refetch()}
    >
      {delivery ? (
        <>
          <p>{t(`enum.${delivery.status}`)}</p>
          <p>
            {t("delivery.attempts", { count: delivery.attemptCount, max: delivery.maxAttempts })}
          </p>
          <p>{t("delivery.original")}</p>
          {delivery.status === "EXHAUSTED" && <p>{t("delivery.exhausted")}</p>}
          {retry.state !== "hidden" && (
            <Button
              intent="action"
              disabled={
                disabled ||
                isFetching ||
                !!error ||
                retry.state !== "enabled" ||
                !canRetry(request, delivery)
              }
              onClick={() =>
                commands.request({ kind: "retryDelivery", deliveryPublicId: delivery.publicId })
              }
            >
              {t("action.retryDelivery")}
            </Button>
          )}
        </>
      ) : (
        <p>{t("delivery.unavailable")}</p>
      )}
    </QueryPanel>
  );
}
