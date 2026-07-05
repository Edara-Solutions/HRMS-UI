import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitationPage } from "@/app/-accept-invitation.page";

export const Route = createFileRoute("/accept-invitation/")({
  component: AcceptInvitationPage,
});
