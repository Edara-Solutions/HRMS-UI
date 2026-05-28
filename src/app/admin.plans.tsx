import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminPlansPage } from "./admin-plans.page";

const adminPlansSearchSchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.string().max(120).optional(),
    )
    .catch(undefined),
  visibility: z.enum(["all", "public", "private"]).catch("all"),
  active: z.enum(["all", "active", "inactive"]).catch("all"),
});

export const Route = createFileRoute("/admin/plans")({
  validateSearch: adminPlansSearchSchema.parse,
  component: AdminPlansPage,
});
