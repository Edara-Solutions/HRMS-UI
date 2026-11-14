import { Outlet, useLocation } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ForcedPasswordChangeModal } from "@/features/auth";
import { RefusalPage } from "@/pages/refusal";
import { isPlatformPortalEnabled, routeDeclarations } from "@/shared/auth";
import { LocaleRuntime } from "@/shared/i18n";

const DevPersonaSwitcher = import.meta.env.DEV
  ? lazy(() =>
      import("@/features/dev-persona-switcher").then((module) => ({
        default: module.DevPersonaSwitcher,
      })),
    )
  : null;

export function RootLayout() {
  const pathname = useLocation({ select: (location) => location.pathname }).replace(/\/$/, "");
  const route = routeDeclarations.find((candidate) => candidate.path === pathname);
  const passwordGate =
    route &&
    route.category !== "public" &&
    route.category !== "credential" &&
    (route.audience !== "platform" || isPlatformPortalEnabled());
  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
      <LocaleRuntime />
      <Outlet />
      {passwordGate && <ForcedPasswordChangeModal audience={route.audience} />}
      {DevPersonaSwitcher && (
        <Suspense fallback={null}>
          <DevPersonaSwitcher />
        </Suspense>
      )}
    </div>
  );
}
export function NotFoundPage() {
  return <RefusalPage kind="not-found" />;
}
