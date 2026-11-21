import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  type AccessLength,
  type AccessRequest,
  type AccessScope,
  accessLengths,
  DECISION_NOTE_MIN,
  lengthsUpTo,
  noteIsLongEnough,
  scopesWithin,
} from "../model/access-request";
import { useAccessCommand } from "../model/use-access-command";
import { NoteField, ScopeLengthFields, useLengthLabel } from "./access-fields";
import { CommandFailure } from "./command-failure";

export type Decision = "approve" | "reject";

interface DecideRequestDialogProps {
  request: AccessRequest;
  decision: Decision;
  onClose: () => void;
}

function requestedLength(request: AccessRequest): AccessLength | undefined {
  return accessLengths.find((length) => length === request.requestedMinutes);
}

export function DecideRequestDialog({ request, decision, onClose }: DecideRequestDialogProps) {
  const { t } = useTranslation("platform-access-session");
  const lengthLabel = useLengthLabel();
  const command = useAccessCommand();
  const [scope, setScope] = useState<AccessScope>(request.scope);
  const [minutes, setMinutes] = useState<AccessLength | undefined>(() => requestedLength(request));
  const [note, setNote] = useState("");
  const approving = decision === "approve";
  const requester = request.requester.name;
  const ready = approving ? minutes !== undefined : noteIsLongEnough(note, DECISION_NOTE_MIN);

  function close() {
    command.reset();
    onClose();
  }

  function confirm() {
    if (approving && minutes !== undefined) {
      command.run(
        { kind: "approve", requestPublicId: request.publicId, scope, minutes, note },
        { onSuccess: close },
      );
    } else if (!approving && ready) {
      command.run(
        { kind: "reject", requestPublicId: request.publicId, note },
        { onSuccess: close },
      );
    }
  }

  return (
    <ConfirmDialog
      open
      tone={approving ? "consequential" : "destructive"}
      title={t(approving ? "access.approve.title" : "access.reject.title", {
        name: requester,
        company: request.company.name,
      })}
      description={
        approving
          ? t("access.approve.description", { name: requester })
          : t("access.reject.description")
      }
      confirmLabel={t(approving ? "access.approve.confirm" : "access.reject.confirm")}
      cancelLabel={t("cancel")}
      isLoading={command.pending}
      confirmDisabled={!ready}
      onClose={close}
      onConfirm={confirm}
    >
      <div className="mt-4 space-y-3">
        {approving && (
          <>
            <ScopeLengthFields
              scope={scope}
              minutes={minutes}
              scopes={scopesWithin(request.scope)}
              lengths={lengthsUpTo(request.requestedMinutes)}
              requested={{ scope: request.scope, minutes: request.requestedMinutes }}
              onScope={setScope}
              onMinutes={setMinutes}
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("access.approve.narrowHint", {
                name: requester,
                scope: t(`access.scope.${request.scope}`),
                length: lengthLabel(request.requestedMinutes),
              })}
            </p>
          </>
        )}
        <NoteField
          label={t(approving ? "access.note.approveLabel" : "access.note.rejectLabel")}
          placeholder={t(
            approving ? "access.note.approvePlaceholder" : "access.note.rejectPlaceholder",
          )}
          value={note}
          minLength={approving ? 0 : DECISION_NOTE_MIN}
          onChange={setNote}
        />
        <CommandFailure failure={command.failure} />
      </div>
    </ConfirmDialog>
  );
}
