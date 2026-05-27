import { useAuthStore } from "@/auth/store";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const signInWithDummySession = useAuthStore((state) => state.signInWithDummySession);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signInWithDummySession();
    void navigate({ to: "/company/dashboard" });
  }

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-sm font-medium text-[var(--color-primary)]">Password gate</p>
      <h1 className="mt-3 text-3xl font-semibold">Change password</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        Stub route for the `mustChangePassword` flow. Protected routes redirect here when the dummy
        session is marked as password-change required.
      </p>
      <Form className="mt-8" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" />
        </div>
        <Button className="w-full" type="submit">
          Save dummy password
        </Button>
      </Form>
    </section>
  );
}
