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
export function PolicyPanel({ queries, blocked, commands }: Props) {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const date = useCompanyDate();
  const enabled = access.availability(operations.policy.key).state === "enabled";
  const { data, error, isPending, isFetching, refetch } = useQuery({ ...queries.policy, enabled });
  if (!enabled) return null;
  const change = access.availability(operations.updatePolicy.key);
  return (
    <ReadPanel
      title={t("policy.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data && (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label={t("policy.configuredMode")} value={t(`mode.${data.configuredMode}`)} />
            <Field label={t("policy.effectiveMode")} value={t(`mode.${data.effectiveMode}`)} />
            <Field label={t("policy.effectiveFrom")} value={date(data.effectiveFrom)} />
            <Field label={t("policy.effectiveUntil")} value={date(data.effectiveUntil)} />
          </dl>
          {change.state !== "hidden" && (
            <TransitionForm
              kind="updatePolicy"
              disabled={blocked || isFetching || !!error || change.state !== "enabled"}
              request={commands.request}
            />
          )}
        </>
      )}
    </ReadPanel>
  );
}
