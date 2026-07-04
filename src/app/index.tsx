import { createFileRoute } from "@tanstack/react-router";
import { LocaleSwitcher } from "@/shared/ui/locale-switcher";

export const Route = createFileRoute("/")({
  component: FoundationPage,
});

function FoundationPage() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
      <p className="text-sm font-medium text-[var(--color-primary)]">HRMS Frontend</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal text-[var(--color-text)] sm:text-4xl">
        Foundation scaffold is ready for the tech stack setup.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
        React 19, Vite 5, TypeScript 5, TanStack Router, TanStack Query, Zustand, Tailwind v4,
        Biome, Vitest, and Playwright are wired before domain modules are added.
      </p>
      <div className="mt-6">
        <LocaleSwitcher />
      </div>
    </section>
  );
}
