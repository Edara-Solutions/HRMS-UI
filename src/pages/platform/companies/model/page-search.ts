import { z } from "zod";
export const pageSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  q: z.string().max(100).optional(),
});
export type CompaniesSearch = z.infer<typeof pageSearchSchema>;
