import { z } from "zod";
import { parseDateEdgeSearchValue } from "@/shared/lib/date-edge";
import type { ConversionRequestStatus } from "../api/conversion-requests";

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

export const pageSearchSchema = z.object({
  status: z.enum(requestStatuses).optional().catch("PENDING"),
  createdFrom: dateEdgeSearchSchema.catch(undefined),
  createdTo: dateEdgeSearchSchema.catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});
