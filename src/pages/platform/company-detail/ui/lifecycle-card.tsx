import { useTranslation } from "react-i18next";
import { platformCompanyOperations as operations, usePlatformAccess } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { type CompanyRecord, lifecycleAllowed } from "../model/company";
import type { useCompanyCommands } from "../model/use-company-commands";

interface Props {
  company: CompanyRecord;
  commercial?: { isFrozen: boolean; isBlocked: boolean };
  blocked: boolean;
  commands: ReturnType<typeof useCompanyCommands>;
}
const actions = ["freeze", "unfreeze", "suspend", "unsuspend", "remove"] as const;
export function LifecycleCard({ company, commercial, blocked, commands }: Props) {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  return (
    <Card as="section">
      <CardHeader>
        <CardTitle>{t("lifecycle.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 p-4">
        {actions.map((key) => {
          const available = access.availability(operations[key].key, {
            target: { lifecycleAllowed: lifecycleAllowed(key, company, commercial) },
          });
          return available.state === "hidden" ? null : (
            <div key={key} className="space-y-1">
              <Button
                intent={key === "remove" || key === "suspend" ? "destructive-trigger" : "action"}
                disabled={blocked || available.state !== "enabled"}
                onClick={() => commands.request({ command: key })}
              >
                {t(`action.${key}`)}
              </Button>
              {available.state === "disabled" && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t("transitionUnavailable")}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
