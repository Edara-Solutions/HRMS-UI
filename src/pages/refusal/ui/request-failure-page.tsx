import type { ErrorComponentProps } from "@tanstack/react-router";
import { OperationRefusal } from "@/shared/api";
import { projectDenialResponse } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { Button } from "@/shared/ui/button";
import { RefusalPage } from "./refusal-page";

/** A bounded application error boundary: no stack, raw problem, route or target identifier. */
export function RequestFailurePage({ error, reset }: ErrorComponentProps) {
  const locale = usePreferencesStore((state) => state.locale);
  if (error instanceof OperationRefusal && [401, 403, 404].includes(error.status)) {
    const decision = projectDenialResponse(error.status, error.code, error.mode);
    if (
      decision === "not-found" ||
      decision === "forbidden" ||
      decision === "company-blocked" ||
      decision === "access-session-inactive"
    )
      return (
        <RefusalPage
          kind={decision}
          audience={
            error.audience === "company"
              ? "company"
              : error.audience === "platform" || error.audience === "delegated"
                ? "platform"
                : undefined
          }
        />
      );
  }
  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold">
        {locale === "ar" ? "تعذّر عرض هذه الصفحة" : "This page could not be loaded"}
      </h1>
      <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
        {locale === "ar"
          ? "حاول مرة أخرى عندما تكون جاهزًا."
          : "Please try again when you’re ready."}
      </p>
      <Button className="mt-8" onClick={reset}>
        {locale === "ar" ? "حاول مرة أخرى" : "Try again"}
      </Button>
    </section>
  );
}
