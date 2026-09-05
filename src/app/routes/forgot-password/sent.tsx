import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ResetLinkSentPage } from "@/pages/forgot-password";

// Carried over from the request screen so the confirmation can name the address. Optional: the
// screen reads sensibly without it, and a hand-typed URL must not break.
const searchSchema = z.object({
  email: z.string().email().optional().catch(undefined),
});

export const Route = createFileRoute("/forgot-password/sent")({
  validateSearch: searchSchema.parse,
  component: ResetLinkSentPage,
});
