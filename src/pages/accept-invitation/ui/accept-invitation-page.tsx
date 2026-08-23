import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { HTTPError } from "ky";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { mapHttpStatusToAppError, readBackendErrorMessage } from "@/shared/api";
import { useAcceptInvitation } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { Label } from "@/shared/ui/label";
import { PasswordInput } from "@/shared/ui/password-input";

const INVALID_INVITATION_MESSAGE =
  "This invitation link is invalid, expired, already used, or revoked. Ask your HR administrator or Edara support for a new invitation.";
const SYSTEM_MESSAGE =
  "Something went wrong. Try again, then use normal sign-in if your password changed.";

const acceptInvitationSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must be 128 characters or less"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

async function getAcceptInvitationErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof HTTPError)) return SYSTEM_MESSAGE;

  const backendMessage = await readBackendErrorMessage(error.response);
  const appError = mapHttpStatusToAppError(error.response.status, backendMessage ?? undefined);

  if (
    appError.kind === "validation" ||
    appError.kind === "forbidden" ||
    appError.kind === "not_found" ||
    appError.kind === "conflict" ||
    appError.kind === "unknown"
  ) {
    return INVALID_INVITATION_MESSAGE;
  }

  if (appError.kind === "rate_limited") {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return appError.kind === "server" ? SYSTEM_MESSAGE : appError.message;
}

export function AcceptInvitationPage() {
  const { token } = useSearch({ from: "/accept-invitation/" });
  const navigate = useNavigate();
  const acceptInvitation = useAcceptInvitation();
  const [apiError, setApiError] = useState<string | null>(
    token ? null : INVALID_INVITATION_MESSAGE,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: AcceptInvitationFormData) {
    if (!token) {
      setApiError(INVALID_INVITATION_MESSAGE);
      return;
    }

    setApiError(null);

    try {
      const session = await acceptInvitation.mutateAsync({
        token,
        newPassword: data.newPassword,
        clientType: "web",
      });

      if (session.user.mustChangePassword) {
        void navigate({ to: "/change-password" });
      } else if (session.user.isPlatformAdmin) {
        void navigate({ to: "/admin/dashboard" });
      } else {
        void navigate({ to: "/company/dashboard" });
      }
    } catch (error) {
      setApiError(await getAcceptInvitationErrorMessage(error));
    }
  }

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-[var(--color-primary)]">Invitation</p>
      <h1 className="mt-3 text-3xl font-semibold">Accept invitation</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        Set your password to activate the owner account and enter the company workspace.
      </p>

      {apiError && (
        <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {apiError}
        </div>
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
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
          disabled={!token || acceptInvitation.isPending}
          isLoading={acceptInvitation.isPending}
        >
          <KeyRound size={16} />
          Accept invitation
        </Button>
      </Form>
    </section>
  );
}
