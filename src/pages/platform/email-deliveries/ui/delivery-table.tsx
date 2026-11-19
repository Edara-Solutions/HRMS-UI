import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { DeliveryListResponse } from "../api/email-deliveries";
import { DeliveryStatusBadge } from "./delivery-status-badge";

type DeliveryRow = DeliveryListResponse["items"][number];

interface DeliveryTableProps {
  deliveries: readonly DeliveryRow[];
  canOpen: boolean;
  onOpen: (delivery: DeliveryRow) => void;
}

const columns = ["recipient", "emailType", "context", "status", "attempts", "created"] as const;

export function DeliveryTable({ deliveries, canOpen, onOpen }: DeliveryTableProps) {
  const { t } = useTranslation("platform-email-deliveries");
  const locale = usePreferencesStore((state) => state.locale);

  return (
    <>
      <ul className="divide-y divide-[var(--color-border)] lg:hidden">
        {deliveries.map((delivery) => (
          <li key={`${delivery.context}:${delivery.publicId}`} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-[var(--color-text)]">
                  {delivery.emailTypeKey}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  <bdi dir="ltr">{delivery.maskedRecipient}</bdi> ·{" "}
                  {formatInstant(delivery.createdAt, locale)}
                </p>
              </div>
              <DeliveryStatusBadge status={delivery.status} />
            </div>
            {canOpen && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => onOpen(delivery)}
              >
                {t("table.details")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="scrollbar-calm hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1024px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={cn(
                    "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]",
                    column === "attempts" ? "text-center" : "text-start",
                  )}
                >
                  {t(`table.${column}`)}
                </th>
              ))}
              <th scope="col" className="px-4 py-2.5">
                <span className="sr-only">{t("table.details")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr
                key={`${delivery.context}:${delivery.publicId}`}
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
                    {t(`context.${delivery.context}`)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <DeliveryStatusBadge status={delivery.status} />
                </td>
                <td className="px-4 py-3 text-center text-[13.5px] tabular-nums text-[var(--color-text-muted)]">
                  {delivery.attempts}
                </td>
                <td className="px-4 py-3 text-[12px] tabular-nums text-[var(--color-text-muted)]">
                  {formatInstant(delivery.createdAt, locale)}
                </td>
                <td className="px-4 py-3 text-end">
                  {canOpen && (
                    <Button variant="secondary" size="xs" onClick={() => onOpen(delivery)}>
                      {t("table.details")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
