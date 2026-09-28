import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import type { useCatalogueCommand } from "../model/use-catalogue-command";

interface Props {
  command: ReturnType<typeof useCatalogueCommand>;
}
export function CommandFeedback({ command }: Props) {
  const { t } = useTranslation("platform-plans");
  if (!command.outcome) return null;
  return (
    <div role={command.outcome.kind === "success" ? "status" : "alert"} className="space-y-3">
      <p>{t(`result.${command.outcome.kind}`)}</p>
      {command.blocked && command.outcome.kind !== "contract" && (
        <Button intent="action" disabled={command.pending} onClick={() => void command.reconcile()}>
          {t("reconcile")}
        </Button>
      )}
    </div>
  );
}
