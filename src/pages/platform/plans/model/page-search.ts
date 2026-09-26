import { z } from "zod";
import { BILLING_INTERVAL_VALUES } from "@/shared/api";

const optionalTrimmedString = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
    z.string().max(120).optional(),
  )
  .catch(undefined);

export const pageSearchSchema = z.object({
  q: optionalTrimmedString,
  visibility: z.enum(["all", "public", "private"]).catch("all"),
  active: z.enum(["all", "active", "inactive"]).catch("all"),
  countryCode: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() ? value.trim().toUpperCase() : undefined,
      z.string().max(2).optional(),
    )
    .catch(undefined),
  regionCode: optionalTrimmedString,
  currencyCode: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() ? value.trim().toUpperCase() : undefined,
      z.string().max(3).optional(),
    )
    .catch(undefined),
  billingInterval: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.enum(BILLING_INTERVAL_VALUES).optional(),
    )
    .catch(undefined),
  intervalCount: z.coerce.number().int().positive().optional().catch(undefined),
});
