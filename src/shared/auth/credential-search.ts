import { z } from "zod";

/** Bound external credential-link input; unknown search fields never enter the page model. */
export const credentialSearchSchema = z.object({
  token: z.string().min(1).max(4096).optional().catch(undefined),
  companyPublicId: z.string().uuid().optional().catch(undefined),
  returnTo: z.string().max(2048).optional().catch(undefined),
  localSignOutOnly: z
    .union([z.literal(true), z.literal("true")])
    .transform(() => true)
    .optional()
    .catch(undefined),
});

export type CredentialSearch = z.infer<typeof credentialSearchSchema>;
