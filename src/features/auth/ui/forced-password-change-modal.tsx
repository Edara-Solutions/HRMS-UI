import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type AudienceName, useAudienceSession } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { ChangePasswordForm } from "./change-password-form";

interface ForcedPasswordChangeModalProps {
  audience: AudienceName;
}

export function ForcedPasswordChangeModal({ audience }: ForcedPasswordChangeModalProps) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const signOut = useMutation({
    retry: false,
    mutationFn: async () => {
      if (audience === "company") return (await import("@/shared/company-auth")).signOutCompany();
      return (await import("@/shared/platform-auth")).signOutPlatform();
    },
    onSuccess: (result) =>
      void navigate({
        to: audience === "company" ? "/company/login" : "/platform/login",
        search: { localSignOutOnly: !result.remoteConfirmed },
      }),
  });
  const mustChangePassword = useAudienceSession(audience).status === "must_change_password";
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={mustChangePassword}
      dismissible={false}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <DialogTitle id={titleId}>{t("journey.changePasswordTitle")}</DialogTitle>
      <DialogDescription id={descriptionId}>
        {t("journey.changePasswordDescription")}
      </DialogDescription>
      <div className="mt-6">
        <ChangePasswordForm audience={audience} />
        <Button
          intent="action"
          className="mt-4"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          {t("journey.signOutAudience", { audience: t(`journey.${audience}`) })}
        </Button>
      </div>
    </Dialog>
  );
}
