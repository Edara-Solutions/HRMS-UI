import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ResetPasswordPage } from "@/pages/reset-password";

const searchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/reset-password/")({
  validateSearch: searchSchema.parse,
  component: ResetPasswordPage,
});
