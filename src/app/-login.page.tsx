import { dummyLoginCredentials } from "@/auth/fixtures";
import { useAuthStore } from "@/auth/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
  companyCode: z
    .string()
    .min(1, "Company code is required")
    .max(20, "Company code must be 20 characters or less"),
  employeeCode: z
    .string()
    .min(1, "Employee code is required")
    .max(20, "Employee code must be 20 characters or less"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const signInWithDummySession = useAuthStore((state) => state.signInWithDummySession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      companyCode: dummyLoginCredentials.companyCode,
      employeeCode: dummyLoginCredentials.employeeCode,
      password: dummyLoginCredentials.password,
    },
  });

  async function onSubmit(_data: LoginFormData) {
    setIsSubmitting(true);
    setApiError(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Use dummy session for now
      signInWithDummySession();
      void navigate({ to: "/company/dashboard" });
    } catch {
      setApiError("Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-[var(--color-bg)]">
      {/* Left panel - Branding */}
      <div className="hidden w-80 flex-col justify-between bg-[var(--color-surface)] p-8 lg:flex">
        <div>
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-[var(--color-on-primary)]">
            <span className="text-lg font-bold">E</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">Edara</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">People Operations Platform</p>
        </div>
        <p className="text-xs text-[var(--color-text-faint)]">
          Manage your workforce with clarity and confidence.
        </p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-[var(--color-on-primary)]">
              <span className="text-lg font-bold">E</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Sign in to Company Portal
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Enter your credentials to access your workspace.
          </p>

          {apiError && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="companyCode">Company code</Label>
              <Input
                id="companyCode"
                placeholder="e.g. EDARA"
                autoComplete="organization"
                aria-invalid={!!errors.companyCode}
                {...register("companyCode")}
              />
              {errors.companyCode && (
                <p className="text-xs text-[var(--color-danger)]">{errors.companyCode.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employeeCode">Employee code</Label>
              <Input
                id="employeeCode"
                placeholder="e.g. EDA-001"
                autoComplete="username"
                aria-invalid={!!errors.employeeCode}
                {...register("employeeCode")}
              />
              {errors.employeeCode && (
                <p className="text-xs text-[var(--color-danger)]">{errors.employeeCode.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button variant="link" type="button" className="text-xs font-medium">
                  Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-[var(--color-danger)]">{errors.password.message}</p>
              )}
            </div>

            <Button
              intent="cta"
              type="submit"
              size="block"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {!isSubmitting && (
                <>
                  <KeyRound size={16} />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
            Admin access?{" "}
            <Link
              to="/admin/login"
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              Sign in to Admin Portal
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-[var(--color-text-faint)]">
            Dummy credentials are pre-filled for development.
          </p>
        </div>
      </div>
    </div>
  );
}
