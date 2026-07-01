import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { mapLoginError } from "@/api/error-mapper";
import { useLogin } from "@/auth/api";
import { isAdminConsoleEnabled } from "@/auth/guards";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

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
  const login = useLogin();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      companyCode: "",
      employeeCode: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setApiError(null);

    try {
      const session = await login.mutateAsync({ ...data, clientType: "web" });

      if (session.user.mustChangePassword) {
        void navigate({ to: "/change-password" });
      } else if (session.user.isPlatformAdmin) {
        void navigate({ to: "/admin/dashboard" });
      } else {
        void navigate({ to: "/company/dashboard" });
      }
    } catch (error) {
      const mapped = await mapLoginError(error);
      setApiError(mapped.message);
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
              disabled={login.isPending}
              isLoading={login.isPending}
            >
              <KeyRound size={16} />
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
            Need help signing in? Contact your HR administrator.
          </p>

          {isAdminConsoleEnabled() && (
            <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
              Admin access?{" "}
              <Link
                to="/admin/login"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                Sign in to Admin Portal
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
