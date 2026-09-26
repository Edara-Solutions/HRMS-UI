import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/pages/account";

export const Route = createFileRoute("/company/account/sessions/")({
  component: () => <AccountPage audience="company" section="sessions" />,
});
