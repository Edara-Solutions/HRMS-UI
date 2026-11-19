import { platformPlanOperations as operations } from "@/shared/api";
export const catalogueSearchSchema = operations.plans.requestSchema.shape.query.partial().catch({});
export const marketSearchSchema = operations.effective.requestSchema.shape.query
  .partial()
  .catch({});
