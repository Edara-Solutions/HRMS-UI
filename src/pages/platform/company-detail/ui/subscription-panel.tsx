import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { platformCompanyOperations as operations, usePlatformAccess } from "@/shared/api";
import type { companyQueries } from "../api/company-detail";
import type { useCompanyCommands } from "../model/use-company-commands";
import { Field } from "./field";
import { ReadPanel } from "./read-panel";
import { TransitionForm } from "./transition-form";
import { useCompanyDate } from "./use-company-date";

interface Props {
  queries: ReturnType<typeof companyQueries>;
  blocked: boolean;
  commands: ReturnType<typeof useCompanyCommands>;
}
export function SubscriptionPanel({ queries, blocked, commands }: Props) {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const date = useCompanyDate();
  const enabled = access.availability(operations.subscription.key).state === "enabled";
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...queries.subscription,
    enabled,
  });
  if (!enabled) return null;
  const extend = access.availability(operations.extendTrial.key);
  return (
    <ReadPanel
      title={t("subscription.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data && (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label={t("subscription.plan")} value={data.plan} />
            <Field label={t("subscription.status")} value={t(`state.${data.status}`)} />
            <Field label={t("subscription.startDate")} value={date(data.startDate)} />
            <Field label={t("subscription.endDate")} value={date(data.endDate)} />
            <Field
              label={t("subscription.initialTrialEndDate")}
              value={date(data.initialTrialEndDate)}
            />
            <Field label={t("subscription.trialEndDate")} value={date(data.trialEndDate)} />
          </dl>
          <h3 className="font-semibold">{t("subscription.history")}</h3>
          {data.history.length === 0 ? (
            <p>{t("subscription.noHistory")}</p>
          ) : (
            <ul className="space-y-3">
              {data.history.map((entry) => (
                <li key={entry.publicId} className="border-b border-[var(--color-border)] pb-2">
                  {t(`history.${entry.type}`)} · {date(entry.occurredAt)}
                  <p>
                    {t(`state.${entry.oldStatus ?? "TRIAL"}`)} → {t(`state.${entry.newStatus}`)}
                  </p>
                  <p>
                    {date(entry.oldTrialEndDate)} → {date(entry.newTrialEndDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {extend.state !== "hidden" && (
            <TransitionForm
              kind="extendTrial"
              minimumDate={data.trialEndDate}
              disabled={
                blocked ||
                isFetching ||
                !!error ||
                data.status !== "TRIAL" ||
                extend.state !== "enabled"
              }
              request={commands.request}
            />
          )}
        </>
      )}
    </ReadPanel>
  );
}
