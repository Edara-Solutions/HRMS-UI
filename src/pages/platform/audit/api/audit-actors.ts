import type { AuditActorMatch } from "@/features/audit-filters";
import {
  platformCommunicationsOperations as operations,
  requestPlatformOperation,
} from "@/shared/api";

/**
 * Names a Platform actor — a user or a platform admin — so the trail can be filtered by the
 * indexed `actorPublicId` without anyone typing an identifier.
 */
export async function searchPlatformAuditActors(query: string): Promise<AuditActorMatch[]> {
  const actors = await requestPlatformOperation(operations.auditActors, { query: { query } });
  return actors.map(({ publicId, name }) => ({ publicId, name }));
}
