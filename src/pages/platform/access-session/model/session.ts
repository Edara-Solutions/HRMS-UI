import { z } from "zod";
import type { accessSessionOperations, delegatedCompanyOperations } from "@/shared/api";

type Operations = typeof accessSessionOperations;
type Delegated = typeof delegatedCompanyOperations;
export type AccessSession = z.output<Operations["session"]["responses"]["200"]>;
export type SessionLiveness = "live" | "inactive";

export function sessionLiveness(session: AccessSession, now: number): SessionLiveness {
  return session.status === "OPEN" && Date.parse(session.expiresAt) > now ? "live" : "inactive";
}

export function canClose(session: AccessSession) {
  return session.closedAt === null;
}

export const workspaceAreas = ["diagnostics", "audit"] as const;
export type WorkspaceArea = (typeof workspaceAreas)[number];

export const areaReads: Record<WorkspaceArea, readonly (keyof Delegated)[]> = {
  diagnostics: ["diagnosticTypes", "diagnosticResult"],
  audit: ["auditTrail"],
};

export const workspaceSearchSchema = z.object({
  area: z.enum(workspaceAreas).optional().catch(undefined),
});
export type WorkspaceSearch = z.infer<typeof workspaceSearchSchema>;
