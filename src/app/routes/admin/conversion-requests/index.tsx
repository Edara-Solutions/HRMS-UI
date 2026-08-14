import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { ConversionRequestStatus } from "@/pages/admin/conversion-requests";
import { AdminConversionRequestsPage } from "@/pages/admin/conversion-requests";
import { parseDateEdgeSearchValue } from "@/shared/lib/date-edge";

const requestStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const satisfies readonly ConversionRequestStatus[];

const dateEdgeSearchSchema = z.preprocess(
  parseDateEdgeSearchValue,
  z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      edgeDateType: z.enum(["inclusive", "exclusive"]),
    })
    .optional(),
);

const conversionRequestSearchSchema = z.object({
  status: z.enum(requestStatuses).optional().catch("PENDING"),
  createdFrom: dateEdgeSearchSchema.catch(undefined),
  createdTo: dateEdgeSearchSchema.catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});

export const Route = createFileRoute("/admin/conversion-requests/")({
  validateSearch: conversionRequestSearchSchema.parse,
  component: AdminConversionRequestsPage,
});
