import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/pages/account";

export const Route = createFileRoute("/platform/me/sessions/")({
  component: () => <AccountPage audience="platform" section="sessions" />,
});
