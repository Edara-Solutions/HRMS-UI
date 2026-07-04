import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { ChangePasswordForm } from "./change-password-form";
import { useAuthStore } from "@/shared/auth";

export function ForcedPasswordChangeModal() {
  const mustChangePassword = useAuthStore(
    (state) => state.session?.user.mustChangePassword ?? false,
  );
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={mustChangePassword}
      dismissible={false}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <DialogTitle id={titleId}>Update your password to continue</DialogTitle>
      <DialogDescription id={descriptionId}>
        Your account was created with a temporary password. Set a new password before continuing:
        you won't be able to use the rest of the app until this is done.
      </DialogDescription>
      <div className="mt-6">
        <ChangePasswordForm />
      </div>
    </Dialog>
  );
}
