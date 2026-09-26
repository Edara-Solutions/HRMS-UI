import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/pages/account";

export const Route = createFileRoute("/platform/account/security/")({
  component: () => <AccountPage audience="platform" section="security" />,
});
