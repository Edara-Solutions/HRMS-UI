export const setupStepTypes = [
  "SET_COMPANY_PROFILE",
  "SET_ROLES",
  "SET_JOBS",
  "SET_BRANCHES",
  "SET_SHIFTS",
  "SET_DEPARTMENTS",
] as const;
export interface SetupStep {
  stepType: (typeof setupStepTypes)[number];
  isRequired: boolean;
  sequence: number;
  dependencies: string[];
}
export function validTrialEndDate(instant: string | undefined, now = Date.now()) {
  if (instant === undefined) return true;
  const value = Date.parse(instant);
  return Number.isFinite(value) && value > now;
}
/** UI-owned custom setup prerequisites; the generated contract deliberately accepts unknown steps. */
export function validSetup(steps: readonly SetupStep[]) {
  if (!steps.length) return false;
  const types = new Set(steps.map((step) => step.stepType));
  const sequences = new Set(steps.map((step) => step.sequence));
  if (types.size !== steps.length || sequences.size !== steps.length) return false;
  return steps.every(
    (step) =>
      Number.isInteger(step.sequence) &&
      step.sequence > 0 &&
      step.dependencies.every((dependency) => {
        const prerequisite = steps.find((item) => item.stepType === dependency);
        return prerequisite && prerequisite.sequence < step.sequence;
      }),
  );
}
