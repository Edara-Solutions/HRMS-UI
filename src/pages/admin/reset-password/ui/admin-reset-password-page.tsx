import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { ResetPasswordForm } from "@/features/auth";

export function AdminResetPasswordPage() {
  const { token } = useSearch({ from: "/admin_/reset-password/" });
  const navigate = useNavigate();

  const onSuccess = useCallback(() => {
    void navigate({ to: "/admin/login" });
  }, [navigate]);

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-[var(--color-primary)]">Admin account recovery</p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-text)]">Set a new password</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        Choose a password you haven't used before. Every other session on your operator account has
        already ended.
      </p>

      <ResetPasswordForm token={token} onSuccess={onSuccess} />

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Need a new link?{" "}
        <Link
          to="/admin/forgot-password"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Start over
        </Link>
      </p>
    </section>
  );
}
