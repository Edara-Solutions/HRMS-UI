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

export const workspaceAreas = ["employees", "roles", "profile", "email", "audit"] as const;
export type WorkspaceArea = (typeof workspaceAreas)[number];

export const areaReadOperation: Record<WorkspaceArea, keyof Delegated> = {
  employees: "users",
  roles: "roles",
  profile: "profile",
  email: "emailSettings",
  audit: "auditTrail",
};

export const areaAlternativeReads: Partial<Record<WorkspaceArea, readonly (keyof Delegated)[]>> = {
  profile: ["setup"],
  email: [
    "emailReadiness",
    "templateAssignments",
    "sendingDomain",
    "diagnosticTypes",
    "diagnosticResult",
  ],
};

export const workspaceSearchSchema = z.object({
  area: z.enum(workspaceAreas).optional().catch(undefined),
});
export type WorkspaceSearch = z.infer<typeof workspaceSearchSchema>;
