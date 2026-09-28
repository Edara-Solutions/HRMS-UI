import type { z } from "zod";
import type { companyOrganizationOperations } from "@/shared/api";
import type { SetupCommand } from "../api/company-setup";

type Operations = typeof companyOrganizationOperations;
export type CompanySetup = z.output<Operations["setup"]["responses"]["200"]>;
export type SetupStep = CompanySetup["steps"][number];
type ProfileStatus = z.output<Operations["profile"]["responses"]["200"]>["status"];

/** The transitions the backend accepts from each state; terminal steps offer none. */
const commandsByStatus: Record<SetupStep["status"], readonly SetupCommand[]> = {
  PENDING: ["start", "skip"],
  IN_PROGRESS: ["complete", "skip"],
  COMPLETED: [],
  SKIPPED: [],
};

export function availableCommands(step: SetupStep): readonly SetupCommand[] {
  return commandsByStatus[step.status];
}

/** Completing the profile step needs an authoritative `COMPLETE` organization profile. */
export function missingPrerequisite(
  step: SetupStep,
  command: SetupCommand,
  profileStatus: ProfileStatus | undefined,
): boolean {
  return (
    command === "complete" &&
    step.stepType === "SET_COMPANY_PROFILE" &&
    profileStatus === "INCOMPLETE"
  );
}

export function orderSteps(setup: CompanySetup): SetupStep[] {
  return [...setup.steps].sort((left, right) => left.sequence - right.sequence);
}

/** Applies a confirmed transition; a step the snapshot no longer contains forces a re-read. */
export function applyStepResult(setup: CompanySetup, updated: SetupStep): CompanySetup | null {
  if (!setup.steps.some((step) => step.publicId === updated.publicId)) return null;
  return {
    ...setup,
    steps: setup.steps.map((step) => (step.publicId === updated.publicId ? updated : step)),
  };
}
