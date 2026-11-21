import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  DECISION_NOTE_MIN,
  type LiveAccessSession,
  noteIsLongEnough,
} from "../model/access-request";
import { useAccessCommand } from "../model/use-access-command";
import { NoteField } from "./access-fields";
import { CommandFailure } from "./command-failure";

interface EndSessionDialogProps {
  session: LiveAccessSession;
  onClose: () => void;
}

export function EndSessionDialog({ session, onClose }: EndSessionDialogProps) {
  const { t } = useTranslation("platform-access-session");
  const command = useAccessCommand();
  const [note, setNote] = useState("");
  const ready = noteIsLongEnough(note, DECISION_NOTE_MIN);

  function close() {
    command.reset();
    onClose();
  }

  return (
    <ConfirmDialog
      open
      tone="destructive"
      title={t("access.end.title", { name: session.operator.name, company: session.company.name })}
      description={t("access.end.description", { name: session.operator.name })}
      confirmLabel={t("access.end.confirm")}
      cancelLabel={t("cancel")}
      isLoading={command.pending}
      confirmDisabled={!ready}
      onClose={close}
      onConfirm={() => {
        if (ready)
          command.run(
            { kind: "end", sessionPublicId: session.publicId, note },
            { onSuccess: close },
          );
      }}
    >
      <div className="mt-4 space-y-3">
        <NoteField
          label={t("access.note.endLabel")}
          placeholder={t("access.note.endPlaceholder")}
          value={note}
          minLength={DECISION_NOTE_MIN}
          onChange={setNote}
        />
        <CommandFailure failure={command.failure} />
      </div>
    </ConfirmDialog>
  );
}
