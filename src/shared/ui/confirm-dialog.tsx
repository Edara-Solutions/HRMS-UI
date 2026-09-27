import { useId, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface TypedConfirmation {
  /** Visible instruction, e.g. "Type EMP-7 to confirm". */
  label: string;
  /** The exact text the person must type before the command is enabled. */
  target: string;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `consequential` confirms a bounded command; `destructive` removes or hands over authority. */
  tone?: "consequential" | "destructive";
  /** Reserved for irreversible or high-blast-radius commands (M10). */
  typedConfirmation?: TypedConfirmation;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** A confirmation step, per the Button intent contract: the trigger opens this, the fill lives here. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "destructive",
  typedConfirmation,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { titleId, descriptionId } = useDialogIds();
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const confirmed = !typedConfirmation || typed === typedConfirmation.target;

  function close() {
    setTyped("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!isLoading}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-sm"
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogDescription id={descriptionId}>{description}</DialogDescription>

      {typedConfirmation && (
        <div className="mt-4 space-y-1.5">
          <Label htmlFor={inputId}>{typedConfirmation.label}</Label>
          <Input
            id={inputId}
            dir="ltr"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <Button intent="dismissive" onClick={close}>
          {cancelLabel}
        </Button>
        <Button
          intent={tone === "destructive" ? "destructive" : "cta"}
          onClick={() => {
            setTyped("");
            onConfirm();
          }}
          disabled={isLoading || !confirmed}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
