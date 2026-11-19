import type { z } from "zod";
import type { delegatedCompanyOperations } from "@/shared/api";

type Operations = typeof delegatedCompanyOperations;
export type DelegatedSetup = z.output<Operations["setup"]["responses"]["200"]>;
export type DelegatedSetupStep = DelegatedSetup["steps"][number];
export type SetupCommand = "start" | "complete" | "skip";

const knownStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const;
type KnownStatus = (typeof knownStatuses)[number];

const commandsByStatus: Record<KnownStatus, readonly SetupCommand[]> = {
  PENDING: ["start", "skip"],
  IN_PROGRESS: ["complete", "skip"],
  COMPLETED: [],
  SKIPPED: [],
};

export function isKnownStatus(status: string): status is KnownStatus {
  return knownStatuses.some((known) => known === status);
}

export function availableCommands(step: DelegatedSetupStep): readonly SetupCommand[] {
  return isKnownStatus(step.status) ? commandsByStatus[step.status] : [];
}

export function orderSteps(setup: DelegatedSetup): DelegatedSetupStep[] {
  return [...setup.steps].sort((left, right) => left.sequence - right.sequence);
}
