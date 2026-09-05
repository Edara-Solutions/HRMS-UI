import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useResetPassword } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { Label } from "@/shared/ui/label";
import { PasswordInput } from "@/shared/ui/password-input";

/**
 * One message covers an unknown, already-used and expired link alike — the same three cases the
 * server refuses to tell apart, for the same reason.
 */
export const INVALID_RESET_LINK_MESSAGE =
  "This password reset link is invalid or has expired. Request a new one to continue.";
const RATE_LIMITED_MESSAGE = "Too many attempts. Please wait a moment and try again.";
const SYSTEM_MESSAGE = "Something went wrong. Please try again in a moment.";

/** Mirrors the server's password policy so a rejected password never costs the caller their link. */
const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be 128 characters or less")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/\d/, "Password must include a number")
      .regex(/[!@#$%^&*()_+\-=]/, "Password must include a symbol (! @ # $ % ^ & * ( ) _ + - =)"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function messageForResetFailure(error: unknown): string {
  if (!(error instanceof HTTPError)) return SYSTEM_MESSAGE;
  if (error.response.status === 429) return RATE_LIMITED_MESSAGE;
  if (error.response.status >= 500) return SYSTEM_MESSAGE;
  return INVALID_RESET_LINK_MESSAGE;
}

export type ResetPasswordFormProps = {
  /** The one-time token from the emailed link; `undefined` when the page was opened without one. */
  readonly token: string | undefined;
  /** Where to go once the password is set. Each portal returns to its own sign-in surface. */
  readonly onSuccess: () => void;
};

/**
 * Redeeming a reset link into a new password. Both portals render this — the interaction is
 * identical because the token, not the surface it was opened from, names the account.
 */
export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const resetPassword = useResetPassword();
  const [apiError, setApiError] = useState<string | null>(
    token ? null : INVALID_RESET_LINK_MESSAGE,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(data: ResetPasswordFormData) {
    if (!token) {
      setApiError(INVALID_RESET_LINK_MESSAGE);
      return;
    }

    setApiError(null);

    try {
      await resetPassword.mutateAsync({ token, newPassword: data.newPassword });
      onSuccess();
    } catch (error) {
      setApiError(messageForResetFailure(error));
    }
  }

  return (
    <>
      {apiError && (
        <div
          role="alert"
          className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          {apiError}
        </div>
      )}

      {/* `noValidate` hands validation to the schema: one message style for every field, in the
          page's own voice, instead of a native browser bubble on one of them. */}
      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            disabled={!token}
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="text-xs text-[var(--color-danger)]">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            disabled={!token}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-[var(--color-danger)]">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          intent="cta"
          type="submit"
          size="block"
          disabled={!token || resetPassword.isPending}
          isLoading={resetPassword.isPending}
        >
          <KeyRound size={16} />
          Set new password
        </Button>
      </Form>
    </>
  );
}
