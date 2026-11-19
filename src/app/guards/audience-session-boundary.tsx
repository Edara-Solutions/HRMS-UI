import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { loadCompanyIdentity, loadPlatformIdentity } from "@/shared/api";
import {
  type AudienceName,
  AudienceSessionProvider,
  useAudienceSession,
  useCompanySession,
  usePlatformSession,
} from "@/shared/auth";
import { Button } from "@/shared/ui/button";

interface AudienceSessionBoundaryProps {
  audience: AudienceName;
  children: ReactNode;
  view?: "protected" | "password-completion";
}

export function AudienceSessionBoundary({
  audience,
  children,
  view = "protected",
}: AudienceSessionBoundaryProps) {
  const { t } = useTranslation("auth");
  const state = useAudienceSession(audience);
  const loadIdentity = audience === "company" ? loadCompanyIdentity : loadPlatformIdentity;
  async function revalidate() {
    if (audience === "company") await useCompanySession.getState().revalidate(loadCompanyIdentity);
    else await usePlatformSession.getState().revalidate(loadPlatformIdentity);
  }
  useEffect(() => {
    if (state.status === "hydrating") {
      if (audience === "company")
        void useCompanySession
          .getState()
          .revalidate(loadCompanyIdentity)
          .catch(() => {});
      else
        void usePlatformSession
          .getState()
          .revalidate(loadPlatformIdentity)
          .catch(() => {});
    }
  }, [audience, state.status, state.generation, loadIdentity]);

  if (
    (state.status === "authenticated" ||
      (view === "password-completion" && state.status === "must_change_password")) &&
    state.session
  )
    return (
      <AudienceSessionProvider
        key={`${audience}:${state.session.user.publicId}:${state.generation}`}
        audience={audience}
      >
        {children}
      </AudienceSessionProvider>
    );
  return (
    <section
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6"
      aria-live="polite"
    >
      <p className="text-xs text-[var(--color-text-muted)]">{t(`journey.${audience}`)}</p>
      {state.status === "must_change_password" ? (
        <Link
          to={audience === "company" ? "/company/change-password" : "/platform/change-password"}
        >
          {t("journey.changePasswordTitle")}
        </Link>
      ) : state.session ? (
        <>
          <h1 className="mt-2 text-xl font-semibold">
            {t(state.status === "hydrating" ? "account.confirmingSession" : "journey.unavailable")}
          </h1>
          {state.status === "unavailable" ? (
            <Button className="mt-4 self-start" onClick={() => void revalidate().catch(() => {})}>
              {t("journey.retry")}
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <h1 className="mt-2 text-xl font-semibold">{t("account.sessionEnded")}</h1>
          <Link
            to={audience === "company" ? "/company/login" : "/platform/login"}
            className="mt-4 text-[var(--color-primary)] hover:underline"
          >
            {t("journey.loginTitle")}
          </Link>
        </>
      )}
    </section>
  );
}
