import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import type { useCompanyCommands } from "../model/use-company-commands";

interface Props {
  name: string;
  commands: ReturnType<typeof useCompanyCommands>;
}
export function CompanyCommandDialog({ name, commands }: Props) {
  const { t } = useTranslation("platform-companies");
  const item = commands.pending;
  if (!item) return null;
  const mode =
    item.command === "updatePolicy" &&
    item.body &&
    typeof item.body === "object" &&
    "mode" in item.body &&
    typeof item.body.mode === "string"
      ? t(`mode.${item.body.mode}`)
      : "";
  return (
    <ConfirmDialog
      open
      title={t("confirm.title", { action: t(`action.${item.command}`), name })}
      description={t(`confirm.${item.command}`, { name, mode })}
      confirmLabel={t(`action.${item.command}`)}
      cancelLabel={t("cancel")}
      tone={
        ["remove", "suspend", "updatePolicy"].includes(item.command)
          ? "destructive"
          : "consequential"
      }
      typedConfirmation={
        item.command === "remove"
          ? { label: t("confirm.typed", { name }), target: name }
          : undefined
      }
      isLoading={commands.busy}
      onClose={commands.cancel}
      onConfirm={commands.confirm}
    />
  );
}
