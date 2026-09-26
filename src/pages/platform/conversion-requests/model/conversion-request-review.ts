import { SETUP_STEP_TYPES, type SetupStepType } from "../api/conversion-requests";

export const SETUP_STEP_LABEL: Record<SetupStepType, string> = {
  SET_COMPANY_PROFILE: "Company profile",
  SET_ROLES: "Roles",
  SET_JOBS: "Jobs",
  SET_BRANCHES: "Branches",
  SET_SHIFTS: "Shifts",
  SET_DEPARTMENTS: "Departments",
};

const SETUP_STEP_TYPE_SET: ReadonlySet<string> = new Set(SETUP_STEP_TYPES);

export interface CustomStepDraft {
  stepType: SetupStepType;
  isRequired: boolean;
  sequence: string;
  dependencies: string;
}

function isSetupStepType(value: string): value is SetupStepType {
  return SETUP_STEP_TYPE_SET.has(value);
}

export function parseSetupStepDependencies(value: string): SetupStepType[] | null {
  const dependencies: SetupStepType[] = [];
  for (const item of value.split(",")) {
    const dependency = item.trim();
    if (!dependency) continue;
    if (!isSetupStepType(dependency)) return null;
    dependencies.push(dependency);
  }
  return dependencies;
}
