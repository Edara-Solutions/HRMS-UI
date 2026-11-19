import { useMutation } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { type AudienceName, useAudienceSession } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { type RefusalKind, RefusalSurface } from "@/shared/ui/refusal-surface";

interface RefusalPageProps {
  kind: RefusalKind;
  audience?: AudienceName;
}
export function RefusalPage({ kind, audience: explicitAudience }: RefusalPageProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const audience =
    explicitAudience ??
    (pathname.startsWith("/company/") || pathname === "/company"
      ? "company"
      : pathname.startsWith("/platform/") || pathname === "/platform"
        ? "platform"
        : null);
  return audience ? (
    <AudienceRefusal kind={kind} audience={audience} />
  ) : (
    <AnonymousRefusal kind={kind} />
  );
}
function AnonymousRefusal({ kind }: { kind: RefusalKind }) {
  const locale = usePreferencesStore((state) => state.locale);
  return (
    <RefusalSurface
      kind={kind}
      locale={locale}
      destination="/"
      recoveryLabel={locale === "ar" ? "العودة إلى الرئيسية" : "Back to home"}
    />
  );
}
function AudienceRefusal({ kind, audience }: { kind: RefusalKind; audience: AudienceName }) {
  const locale = usePreferencesStore((state) => state.locale);
  const state = useAudienceSession(audience);
  const signOut = useMutation({
    retry: false,
    mutationFn: async () =>
      audience === "company"
        ? (await import("@/shared/company-auth")).signOutCompany()
        : (await import("@/shared/platform-auth")).signOutPlatform(),
    onSuccess: (result) =>
      window.location.assign(`/${audience}/login?localSignOutOnly=${!result.remoteConfirmed}`),
  });
  const established = state.status === "authenticated" && !!state.session;
  const destination = established
    ? `/${audience}/${kind === "no-work-access" || kind === "company-blocked" ? "me/profile" : "dashboard"}`
    : "/";
  return (
    <RefusalSurface
      kind={kind}
      locale={locale}
      destination={destination}
      recoveryLabel={
        locale === "ar"
          ? established
            ? "العودة إلى حسابي"
            : "العودة إلى الرئيسية"
          : established
            ? "Back to my workspace"
            : "Back to home"
      }
    >
      {established && (kind === "no-work-access" || kind === "company-blocked") && (
        <nav
          className="mt-6 flex flex-wrap justify-center gap-4 text-sm"
          aria-label={locale === "ar" ? "حسابي" : "My account"}
        >
          <a href={`/${audience}/me/security`}>{locale === "ar" ? "الأمان" : "Security"}</a>
          <a href={`/${audience}/me/sessions`}>{locale === "ar" ? "جلساتي" : "My sessions"}</a>
          <button
            type="button"
            disabled={signOut.isPending}
            onClick={() => {
              if (!signOut.isPending) signOut.mutate();
            }}
          >
            {locale === "ar" ? "تسجيل الخروج" : "Sign out"}
          </button>
        </nav>
      )}
    </RefusalSurface>
  );
}
