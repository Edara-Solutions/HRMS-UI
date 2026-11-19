import { z } from "zod";

// A company lens narrows the catalog to the events a tenant can see and scopes every
// live-occurrence link to that tenant, so it is search state like any other filter.
export const pageSearchSchema = z.object({
  companyPublicId: z.string().uuid().optional().catch(undefined),
});
