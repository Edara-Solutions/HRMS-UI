import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRequestAdminPasswordReset } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const SYSTEM_MESSAGE = "Something went wrong. Please try again in a moment.";

const adminForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be 255 characters or less"),
});

type AdminForgotPasswordFormData = z.infer<typeof adminForgotPasswordSchema>;

export function AdminForgotPasswordPage() {
  const navigate = useNavigate();
  const requestReset = useRequestAdminPasswordReset();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminForgotPasswordFormData>({
    resolver: zodResolver(adminForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: AdminForgotPasswordFormData) {
    setApiError(null);

    try {
      await requestReset.mutateAsync(data);
      // Reached whether or not the address belongs to an operator: the server answers both cases
      // the same way, and so must this screen.
      void navigate({ to: "/admin/forgot-password/sent", search: { email: data.email } });
    } catch {
      setApiError(SYSTEM_MESSAGE);
    }
  }

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-[var(--color-primary)]">Admin account recovery</p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-text)]">
        Forgot your password?
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        Enter the email address on your operator account. We'll send you a link to choose a new
        password.
      </p>

      {apiError && (
        <div
          role="alert"
          className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          {apiError}
        </div>
      )}

      {/* `noValidate` hands validation to the schema: one message style in the page's own voice,
          instead of a native browser bubble. */}
      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@edara.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-[var(--color-danger)]">{errors.email.message}</p>
          )}
        </div>

        <Button
          intent="cta"
          type="submit"
          size="block"
          disabled={requestReset.isPending}
          isLoading={requestReset.isPending}
        >
          <MailCheck size={16} />
          Send reset link
        </Button>
      </Form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Remembered it?{" "}
        <Link to="/admin/login" className="font-medium text-[var(--color-primary)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
