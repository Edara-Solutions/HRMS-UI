import { z } from "zod";
import type { AuditActorMatch } from "@/features/audit-filters";
import { apiClient } from "@/shared/api";

const actorMatchesSchema = z.array(
  z.object({ publicId: z.string().min(1), name: z.string().min(1) }).strict(),
);

/**
 * Names an actor inside the caller's own Company. The endpoint is scoped by the caller's
 * tenant before any matching, so a Platform Admin can never appear among the results.
 *
 * A departed employee is unreachable by name — soft-delete drops their Company — but their
 * rows still carry their name, so clicking the actor in a row still filters to them.
 */
export async function searchCompanyAuditActors(query: string): Promise<AuditActorMatch[]> {
  const response: unknown = await apiClient
    .get("company/audit-trail/actors", { searchParams: { query } })
    .json();

  return actorMatchesSchema.parse(response);
}
