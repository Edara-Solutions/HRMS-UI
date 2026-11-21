import { z } from "zod";

export const accessTabs = ["review", "live", "mine", "history"] as const;
export type AccessTab = (typeof accessTabs)[number];

export const accessRequestsSearchSchema = z.object({
  tab: z.enum(accessTabs).optional().catch(undefined),
});
export type AccessRequestsSearch = z.infer<typeof accessRequestsSearchSchema>;
