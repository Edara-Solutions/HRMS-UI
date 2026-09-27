import {
  companyReadQuery,
  type OperationKey,
  companyOrganizationOperations as operations,
  requestCompanyOperation,
} from "@/shared/api";

export function companySetupQueries(userPublicId: string) {
  return {
    setup: companyReadQuery(userPublicId, operations.setup),
    activation: companyReadQuery(userPublicId, operations.activation),
    profile: companyReadQuery(userPublicId, operations.profile),
    registry: companyReadQuery(userPublicId, operations.registry),
  };
}

const commandOperations = {
  start: operations.startSetupStep,
  complete: operations.completeSetupStep,
  skip: operations.skipSetupStep,
};

export type SetupCommand = keyof typeof commandOperations;

export const setupCommandOperationKeys = {
  start: "POST /api/v1/company/setup/{stepPublicId}/start",
  complete: "POST /api/v1/company/setup/{stepPublicId}/complete",
  skip: "POST /api/v1/company/setup/{stepPublicId}/skip",
} as const satisfies Record<SetupCommand, OperationKey>;

/** One step transition. Never retried: a failure reconciles the checklist before another try. */
export function runSetupCommand(command: SetupCommand, stepPublicId: string) {
  return requestCompanyOperation(commandOperations[command], { params: { stepPublicId } });
}
