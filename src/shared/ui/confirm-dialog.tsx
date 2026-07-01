import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** A destructive confirmation step, per the Button intent contract: the trigger opens this, the fill lives here. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!isLoading}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-sm"
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogDescription id={descriptionId}>{description}</DialogDescription>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button intent="dismissive" onClick={onClose}>
          Cancel
        </Button>
        <Button intent="destructive" onClick={onConfirm} disabled={isLoading} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
