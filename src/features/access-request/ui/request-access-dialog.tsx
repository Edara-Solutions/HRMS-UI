import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  type AccessLength,
  type AccessReason,
  type AccessScope,
  accessLengths,
  accessReasons,
  accessScopes,
  noteIsLongEnough,
  REQUEST_NOTE_MIN,
} from "../model/access-request";
import { useAccessCommand } from "../model/use-access-command";
import { ChoiceField, NoteField, ScopeLengthFields } from "./access-fields";
import { CommandFailure } from "./command-failure";

interface RequestAccessDialogProps {
  open: boolean;
  companyPublicId: string;
  companyName: string;
  onClose: () => void;
}

export function RequestAccessDialog({
  open,
  companyPublicId,
  companyName,
  onClose,
}: RequestAccessDialogProps) {
  const { t } = useTranslation("platform-access-session");
  const command = useAccessCommand();
  const [reason, setReason] = useState<AccessReason>();
  const [scope, setScope] = useState<AccessScope>("READ");
  const [minutes, setMinutes] = useState<AccessLength>();
  const [note, setNote] = useState("");
  const ready =
    reason !== undefined && minutes !== undefined && noteIsLongEnough(note, REQUEST_NOTE_MIN);

  function close() {
    command.reset();
    setReason(undefined);
    setScope("READ");
    setMinutes(undefined);
    setNote("");
    onClose();
  }

  return (
    <ConfirmDialog
      open={open}
      tone="consequential"
      title={t("access.request.title", { name: companyName })}
      description={t("access.request.description")}
      confirmLabel={t("access.request.confirm")}
      cancelLabel={t("cancel")}
      isLoading={command.pending}
      confirmDisabled={!ready}
      onClose={close}
      onConfirm={() => {
        if (!ready) return;
        command.run(
          { kind: "submit", companyPublicId, reason, scope, requestedMinutes: minutes, note },
          { onSuccess: close },
        );
      }}
    >
      <div className="mt-4 space-y-3">
        <ChoiceField
          label={t("access.field.reason")}
          value={reason}
          placeholder={t("access.field.reasonPlaceholder")}
          options={accessReasons.map((value) => ({ value, label: t(`reason.${value}`) }))}
          onChange={setReason}
        />
        <ScopeLengthFields
          scope={scope}
          minutes={minutes}
          scopes={accessScopes}
          lengths={accessLengths}
          onScope={setScope}
          onMinutes={setMinutes}
        />
        <p className="text-xs text-[var(--color-text-muted)]">{t("access.request.narrowHint")}</p>
        <NoteField
          label={t("access.note.requestLabel")}
          placeholder={t("access.note.requestPlaceholder")}
          value={note}
          minLength={REQUEST_NOTE_MIN}
          onChange={setNote}
        />
        <CommandFailure failure={command.failure} />
      </div>
    </ConfirmDialog>
  );
}
