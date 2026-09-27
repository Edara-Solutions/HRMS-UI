import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { platformCompanyOperations as operations, usePlatformAccess } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import type { companyQueries } from "../api/company-detail";
import { type CompanyRecord, lifecycleAllowed } from "../model/company";
import type { useCompanyCommands } from "../model/use-company-commands";
import { ReadPanel } from "./read-panel";

interface Props {
  queries: ReturnType<typeof companyQueries>;
  company?: CompanyRecord;
  blocked: boolean;
  commands: ReturnType<typeof useCompanyCommands>;
}
export function ActivationPanel({ queries, blocked, commands, company }: Props) {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const enabled = access.availability(operations.activation.key).state === "enabled";
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...queries.activation,
    enabled,
  });
  if (!enabled) return null;
  const evaluate = access.availability(operations.evaluate.key);
  return (
    <ReadPanel
      title={t("activation.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data && (
        <>
          <p>{t(data.canActivate ? "activation.ready" : "activation.notReady")}</p>
          <ul className="list-inside list-disc">
            {data.requirements.map((code) => (
              <li key={code}>{t(`requirement.${code}`)}</li>
            ))}
          </ul>
          {evaluate.state !== "hidden" && (
            <Button
              intent="action"
              disabled={
                blocked ||
                isFetching ||
                !!error ||
                !company ||
                !lifecycleAllowed("evaluate", company) ||
                evaluate.state !== "enabled"
              }
              onClick={() => commands.request({ command: "evaluate" })}
            >
              {t("action.evaluate")}
            </Button>
          )}
        </>
      )}
    </ReadPanel>
  );
}
