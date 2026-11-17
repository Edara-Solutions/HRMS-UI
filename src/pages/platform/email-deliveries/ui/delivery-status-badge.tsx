import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import type { DeliveryStatus } from "../api/email-deliveries";

const tone: Record<DeliveryStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  QUEUED: "default",
  PROCESSING: "info",
  RETRY_SCHEDULED: "warning",
  SENT: "success",
  FAILED: "danger",
  CANCELLED: "default",
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const { t } = useTranslation("platform-email-deliveries");
  return <Badge variant={tone[status]}>{t(`status.${status}`)}</Badge>;
}
