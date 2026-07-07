import { ChangePasswordForm } from "@/features/auth";

export function ChangePasswordPage() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 sm:px-6">
      <p className="text-sm font-medium text-[var(--color-primary)]">Password gate</p>
      <h1 className="mt-3 text-3xl font-semibold">Update your password</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        Set a new password before continuing.
      </p>
      <div className="mt-6">
        <ChangePasswordForm />
      </div>
    </section>
  );
}
