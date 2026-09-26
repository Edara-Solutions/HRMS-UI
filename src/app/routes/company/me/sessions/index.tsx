import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/pages/account";

export const Route = createFileRoute("/company/me/sessions/")({
  component: () => <AccountPage audience="company" section="sessions" />,
});
