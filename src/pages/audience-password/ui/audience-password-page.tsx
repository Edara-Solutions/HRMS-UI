import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChangePasswordForm } from "@/features/auth";
import type { AudienceName } from "@/shared/auth";
import { Button } from "@/shared/ui/button";

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
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <p className="text-sm text-[var(--color-text-muted)]">{t(`journey.${audience}`)}</p>
      <h1 className="mt-2 text-2xl font-semibold">
        {t("journey.changePasswordTitle", { defaultValue: "Update your password to continue" })}
      </h1>
      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
        {t("journey.changePasswordDescription", {
          defaultValue: "Set a new password before continuing in this portal.",
        })}
      </p>
      <div className="mt-7">
        <ChangePasswordForm audience={audience} />
      </div>
      <Button
        intent="action"
        className="mt-4"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        {t("journey.signOutAudience", { audience: t(`journey.${audience}`) })}
      </Button>
    </section>
  );
}
