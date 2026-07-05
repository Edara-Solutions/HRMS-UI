import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminCompaniesPage } from "@/app/admin-companies.page";

const adminCompaniesSearchSchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.string().max(120).optional(),
    )
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});

export const Route = createFileRoute("/admin/companies/")({
  validateSearch: adminCompaniesSearchSchema.parse,
  component: AdminCompaniesPage,
});
