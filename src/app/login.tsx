import { dummyLoginCredentials } from "@/auth/fixtures";
import { useAuthStore } from "@/auth/store";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const signInWithDummySession = useAuthStore((state) => state.signInWithDummySession);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signInWithDummySession();
    void navigate({ to: "/company/dashboard" });
  }

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-sm font-medium text-[var(--color-primary)]">Company Portal</p>
      <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        Dummy values mirror `company-portal-api.md`: company code EDARA and employee code EDA-001.
      </p>
      <Form className="mt-8" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="companyCode">Company code</Label>
          <Input
            id="companyCode"
            name="companyCode"
            defaultValue={dummyLoginCredentials.companyCode}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employeeCode">Employee code</Label>
          <Input
            id="employeeCode"
            name="employeeCode"
            defaultValue={dummyLoginCredentials.employeeCode}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            defaultValue={dummyLoginCredentials.password}
          />
        </div>
        <Button
          className="w-full"
          leadingIcon={<KeyRound aria-hidden="true" size={16} />}
          type="submit"
        >
          Sign in with dummy session
        </Button>
      </Form>
    </section>
  );
}
