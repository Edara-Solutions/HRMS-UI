import { useAuthStore } from "@/auth/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const adminLoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const signInWithDummySession = useAuthStore((state) => state.signInWithDummySession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "admin@edara.com",
      password: "AdminP@ss1",
    },
  });

  async function onSubmit(_data: AdminLoginFormData) {
    setIsSubmitting(true);
    setApiError(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Use dummy session for now (admin role)
      signInWithDummySession();
      void navigate({ to: "/admin/dashboard" });
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
            <Shield size={20} />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">Edara Admin</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Platform Management Console</p>
        </div>
        <p className="text-xs text-[var(--color-text-faint)]">
          Manage companies, subscriptions, and platform operations.
        </p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-[var(--color-on-primary)]">
              <Shield size={20} />
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Sign in with your administrator credentials.
          </p>

          {apiError && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  Forgot password?
                </button>
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Sign in to Admin
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
            Company employee?{" "}
            <Link to="/login" className="font-medium text-[var(--color-primary)] hover:underline">
              Sign in to Company Portal
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
