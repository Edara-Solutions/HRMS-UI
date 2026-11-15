import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChangePasswordForm } from "@/features/auth";
import type { AudienceName } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { CredentialFrame } from "@/widgets/credential-frame";

interface AudiencePasswordPageProps {
  audience: AudienceName;
}

export function AudiencePasswordPage({ audience }: AudiencePasswordPageProps) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const signOut = useMutation({
    retry: false,
    mutationFn: async () => {
      if (audience === "company") {
        const { signOutCompany } = await import("@/shared/company-auth");
        return signOutCompany();
      }
      const { signOutPlatform } = await import("@/shared/platform-auth");
      return signOutPlatform();
    },
    onSuccess: (result) =>
      void navigate({
        to: audience === "company" ? "/company/login" : "/platform/login",
        search: { localSignOutOnly: !result.remoteConfirmed },
      }),
  });
  return (
    <CredentialFrame
      audience={audience}
      title={t("journey.changePasswordTitle")}
      description={t("journey.changePasswordDescription")}
    >
      <ChangePasswordForm audience={audience} />
      <Button
        intent="action"
        size="block"
        className="mt-4"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        {t("journey.signOutAudience", { audience: t(`journey.${audience}`) })}
      </Button>
    </CredentialFrame>
  );
}
