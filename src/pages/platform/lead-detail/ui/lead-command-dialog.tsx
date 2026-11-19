import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import type { useLeadCommands } from "../model/use-lead-commands";

interface Props {
  commands: ReturnType<typeof useLeadCommands>;
}
export function LeadCommandDialog({ commands }: Props) {
  const { t } = useTranslation("platform-leads");
  const item = commands.pending;
  if (!item) return null;
  const destructive = ["remove", "removeContact", "removeActivity"].includes(item.kind);
  return (
    <ConfirmDialog
      open
      title={t("confirm.title", { action: t(`action.${item.kind}`), name: item.name })}
      description={t(`confirm.${item.kind}`, { name: item.name })}
      confirmLabel={t(`action.${item.kind}`)}
      cancelLabel={t("cancel")}
      tone={destructive ? "destructive" : "consequential"}
      typedConfirmation={
        destructive
          ? { label: t("confirm.typed", { name: item.name }), target: item.name }
          : undefined
      }
      isLoading={commands.busy}
      onClose={commands.cancel}
      onConfirm={commands.confirm}
    />
  );
}
