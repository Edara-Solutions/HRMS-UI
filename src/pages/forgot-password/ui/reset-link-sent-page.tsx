import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { ResetLinkSentNotice } from "@/features/auth";

export function ResetLinkSentPage() {
  const { email } = useSearch({ from: "/forgot-password/sent" });
  const navigate = useNavigate();

  const onCountdownEnd = useCallback(() => {
    void navigate({ to: "/login" });
  }, [navigate]);

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <ResetLinkSentNotice email={email} onCountdownEnd={onCountdownEnd} />

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
