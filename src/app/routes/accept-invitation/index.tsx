import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AcceptInvitationPage } from "@/pages/accept-invitation";

const searchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/accept-invitation/")({
  validateSearch: searchSchema.parse,
  component: AcceptInvitationPage,
});
