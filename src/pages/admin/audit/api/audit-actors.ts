import { z } from "zod";
import type { AuditActorMatch } from "@/features/audit-filters";
import { apiClient } from "@/shared/api";

const actorMatchesSchema = z.array(
  z.object({ publicId: z.string().min(1), name: z.string().min(1) }).strict(),
);

/**
 * Names a Platform actor — a user or a platform admin — so the trail can be filtered by the
 * indexed `actorPublicId` without anyone typing an identifier.
 */
export async function searchPlatformAuditActors(query: string): Promise<AuditActorMatch[]> {
  const response: unknown = await apiClient
    .get("platform/audit-trail/actors", { searchParams: { query } })
    .json();

  return actorMatchesSchema.parse(response);
}
