import { queryOptions } from "@tanstack/react-query";
import {
  ContractViolation,
  platformCompanyOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  sendPlatformCommand,
} from "@/shared/api";
import {
  type Command,
  projectActivation,
  projectCommercial,
  projectPolicy,
  projectSubscription,
} from "../model/company";

function scoped<T>(value: T, actual: string, expected: string, key: string): T {
  if (actual !== expected)
    throw new ContractViolation({ audience: "platform", key, status: 200, phase: "response" });
  return value;
}
export function companyQueries(userPublicId: string, publicId: string) {
  const params = { publicId };
  return {
    company: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.company, publicId),
      queryFn: async ({ signal }) => {
        const value = await requestPlatformOperation(operations.company, { params }, signal);
        return scoped(value, value.publicId, publicId, operations.company.key);
      },
    }),
    policy: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.policy, publicId),
      queryFn: async ({ signal }) => {
        const value = await requestPlatformOperation(operations.policy, { params }, signal);
        return scoped(value, value.policy.companyPublicId, publicId, operations.policy.key);
      },
      select: projectPolicy,
    }),
    activation: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.activation, publicId),
      queryFn: async ({ signal }) => {
        const value = await requestPlatformOperation(operations.activation, { params }, signal);
        return scoped(value, value.companyPublicId, publicId, operations.activation.key);
      },
      select: projectActivation,
    }),
    subscription: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.subscription, publicId),
      queryFn: async ({ signal }) => {
        const value = await requestPlatformOperation(operations.subscription, { params }, signal);
        return scoped(
          value,
          value.subscription.companyPublicId,
          publicId,
          operations.subscription.key,
        );
      },
      select: projectSubscription,
    }),
    commercial: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.commercial, publicId),
      queryFn: async ({ signal }) => {
        const value = await requestPlatformOperation(operations.commercial, { params }, signal);
        return scoped(value, value.companyPublicId, publicId, operations.commercial.key);
      },
      select: projectCommercial,
    }),
  };
}
export function companyRoots(userPublicId: string) {
  return [
    operations.company,
    operations.companies,
    operations.cursor,
    operations.policy,
    operations.activation,
    operations.subscription,
    operations.commercial,
  ].map((operation) => platformQueryKey(userPublicId, operation));
}
export async function runCompanyCommand(command: Command, publicId: string, body?: unknown) {
  const params = { publicId };
  switch (command) {
    case "remove":
      return sendPlatformCommand(operations.remove, { params });
    case "evaluate": {
      const value = await requestPlatformOperation(operations.evaluate, { params });
      return scoped(value, value.companyPublicId, publicId, operations.evaluate.key);
    }
    case "updatePolicy": {
      const value = await requestPlatformOperation(operations.updatePolicy, { params, body });
      return scoped(value, value.companyPublicId, publicId, operations.updatePolicy.key);
    }
    case "extendTrial": {
      const value = await requestPlatformOperation(operations.extendTrial, { params, body });
      return scoped(
        value,
        value.subscription.companyPublicId,
        publicId,
        operations.extendTrial.key,
      );
    }
    default:
      return sendPlatformCommand(operations[command], { params, body: {} });
  }
}
