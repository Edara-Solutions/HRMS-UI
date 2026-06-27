import { Outlet } from "@tanstack/react-router";
import { ForcedPasswordChangeModal } from "@/auth/forced-password-change-modal";
import { LocaleRuntime } from "@/i18n/locale-runtime";

export function RootLayout() {
  return (
    <main className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
      <LocaleRuntime />
      <Outlet />
      <ForcedPasswordChangeModal />
    </main>
  );
}

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 sm:px-6">
      <p className="text-sm font-medium text-[var(--color-text-muted)]">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 max-w-prose text-sm text-[var(--color-text-muted)]">
        This route is not part of the current frontend foundation slice.
      </p>
    </section>
  );
}
