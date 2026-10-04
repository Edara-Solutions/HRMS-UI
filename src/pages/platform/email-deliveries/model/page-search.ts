import { z } from "zod";
import { platformCommunicationsOperations as operations } from "@/shared/api";
export const platformDeliveriesSearchSchema = operations.deliveries.requestSchema.shape.query
  .partial()
  .extend({
    deliveryId: z.string().uuid().optional(),
    deliveryContext: z.enum(["EDARA", "COMPANY"]).optional(),
  })
  .catch({});
export type PlatformDeliveriesSearch = z.infer<typeof platformDeliveriesSearchSchema>;
