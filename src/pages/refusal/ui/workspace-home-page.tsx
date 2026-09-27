import type { ReactNode } from "react";
import { projectRouteAccess, useCurrentAudience, useCurrentSession } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { RefusalPage } from "./refusal-page";

interface WorkspaceHomePageProps {
  /** The audience's operational home, rendered once the session has work access. */
  children?: ReactNode;
}

export function WorkspaceHomePage({ children }: WorkspaceHomePageProps) {
  const audience = useCurrentAudience();
  const session = useCurrentSession();
  const locale = usePreferencesStore((state) => state.locale);
  const decision = projectRouteAccess(`/${audience}/dashboard`, {
    audience: audience ?? undefined,
    authenticated: !!session,
    permissions: session?.user.permissions,
  });
  if (decision === "no-work-access") return <RefusalPage kind="no-work-access" />;
  if (children) return children;
  return (
    <section className="mx-auto max-w-3xl py-10">
      <h1 className="text-2xl font-semibold">
        {locale === "ar" ? "مساحة عملك" : "Your workspace"}
      </h1>
      <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
        {locale === "ar"
          ? "يمكنك إدارة حسابك الشخصي من القائمة."
          : "Manage your personal account from the navigation."}
      </p>
    </section>
  );
}
