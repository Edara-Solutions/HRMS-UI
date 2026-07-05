import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { HTTPError } from "ky";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { mapHttpStatusToAppError } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useChangePassword } from "../api/change-password";

function changePasswordErrorMessage(error: unknown): string {
  if (error instanceof HTTPError) {
    const appError = mapHttpStatusToAppError(error.response.status);

    if (appError.kind === "validation") {
      return "Your current password is incorrect, or the new password doesn't meet the requirements (at least 8 characters, with uppercase, lowercase, a digit, and a special character).";
    }

    if (appError.kind === "rate_limited") {
      return "Too many attempts. Please wait a moment and try again.";
    }
  }

  return "Something went wrong. Please try again.";
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
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

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ChangePasswordFormData) {
    setApiError(null);

    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      void navigate({ to: "/login" });
    } catch (error) {
      setApiError(changePasswordErrorMessage(error));
    }
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      {apiError && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {apiError}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...register("currentPassword")}
        />
        {errors.currentPassword && (
          <p className="text-xs text-[var(--color-danger)]">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-xs text-[var(--color-danger)]">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
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
        disabled={changePassword.isPending}
        isLoading={changePassword.isPending}
      >
        Change password
      </Button>
    </Form>
  );
}

