import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  accessSessionOperations,
  ContractViolation,
  delegatedQueryKey,
  OperationRefusal,
  delegatedCompanyOperations as operations,
  platformCompanyOperations,
  platformQueryKey,
  requestDelegatedOperation,
  requestPlatformOperation,
  sendDelegatedCommand,
} from "@/shared/api";
import type { DelegatedEmailSettingsBody, TemplateAssignment } from "../model/email";
import type { EmployeeCorrection } from "../model/employee-correction";
import type { DelegatedProfileUpdate } from "../model/profile";
import type { SetupCommand } from "../model/setup";

type Delegated = typeof operations;
export type UsersQuery = NonNullable<z.input<Delegated["users"]["requestSchema"]>["query"]>;
export type AuditQuery = NonNullable<z.input<Delegated["auditTrail"]["requestSchema"]>["query"]>;
export type DelegatedAuditPage = z.output<Delegated["auditTrail"]["responses"]["200"]>;
export type DelegatedAuditItem = DelegatedAuditPage["items"][number];

export const rolesPageSize = 20;
export const usersPageSize = 20;
export const auditPageSize = 25;

export function accessSessionQueries(userPublicId: string, sessionPublicId: string) {
  return {
    session: queryOptions({
      queryKey: platformQueryKey(userPublicId, accessSessionOperations.session, sessionPublicId),
      queryFn: ({ signal }) =>
        requestPlatformOperation(
          accessSessionOperations.session,
          { params: { sessionPublicId } },
          signal,
        ),
    }),
    company: (publicId: string) =>
      queryOptions({
        queryKey: platformQueryKey(userPublicId, platformCompanyOperations.company, publicId),
        queryFn: ({ signal }) =>
          requestPlatformOperation(
            platformCompanyOperations.company,
            { params: { publicId } },
            signal,
          ),
      }),
  };
}

export function closeAccessSession(sessionPublicId: string) {
  return requestPlatformOperation(accessSessionOperations.close, { params: { sessionPublicId } });
}

function retryDelegatedRead(failureCount: number, error: unknown) {
  if (error instanceof ContractViolation) return false;
  if (error instanceof OperationRefusal && [401, 403, 404].includes(error.status)) return false;
  return failureCount < 1;
}

export function delegatedQueries(userPublicId: string, sessionPublicId: string) {
  const params = { sessionPublicId };
  const key = (operation: { key: string }, ...inputs: readonly (string | number)[]) =>
    delegatedQueryKey(userPublicId, sessionPublicId, operation, ...inputs);
  return {
    root: delegatedQueryKey(userPublicId, sessionPublicId),
    users: (query: UsersQuery) =>
      queryOptions({
        retry: retryDelegatedRead,
        queryKey: key(operations.users, JSON.stringify(query)),
        queryFn: ({ signal }) =>
          requestDelegatedOperation(operations.users, { params, query }, signal),
      }),
    user: (userPublicId: string) =>
      queryOptions({
        retry: retryDelegatedRead,
        queryKey: key(operations.user, userPublicId),
        queryFn: ({ signal }) =>
          requestDelegatedOperation(
            operations.user,
            { params: { ...params, userPublicId } },
            signal,
          ),
      }),
    roles: (page: number) =>
      queryOptions({
        retry: retryDelegatedRead,
        queryKey: key(operations.roles, page),
        queryFn: ({ signal }) =>
          requestDelegatedOperation(
            operations.roles,
            { params, query: { page, pageSize: rolesPageSize } },
            signal,
          ),
      }),
    role: (rolePublicId: string) =>
      queryOptions({
        retry: retryDelegatedRead,
        queryKey: key(operations.role, rolePublicId),
        queryFn: ({ signal }) =>
          requestDelegatedOperation(
            operations.role,
            { params: { ...params, rolePublicId } },
            signal,
          ),
      }),
    profile: queryOptions({
      retry: retryDelegatedRead,
      queryKey: key(operations.profile),
      queryFn: ({ signal }) => requestDelegatedOperation(operations.profile, { params }, signal),
    }),
    setup: queryOptions({
      retry: retryDelegatedRead,
      queryKey: key(operations.setup),
      queryFn: ({ signal }) => requestDelegatedOperation(operations.setup, { params }, signal),
    }),
    emailSettings: queryOptions({
      retry: retryDelegatedRead,
      queryKey: key(operations.emailSettings),
      queryFn: ({ signal }) =>
        requestDelegatedOperation(operations.emailSettings, { params }, signal),
    }),
    emailReadiness: queryOptions({
      retry: retryDelegatedRead,
      queryKey: key(operations.emailReadiness),
      queryFn: ({ signal }) =>
        requestDelegatedOperation(operations.emailReadiness, { params }, signal),
    }),
    templateAssignments: queryOptions({
      retry: retryDelegatedRead,
      queryKey: key(operations.templateAssignments),
      queryFn: ({ signal }) =>
        requestDelegatedOperation(operations.templateAssignments, { params }, signal),
    }),
    sendingDomain: queryOptions({
      retry: retryDelegatedRead,
      queryKey: key(operations.sendingDomain),
      queryFn: ({ signal }) =>
        requestDelegatedOperation(operations.sendingDomain, { params }, signal),
    }),
    auditTrail: (query: AuditQuery) =>
      queryOptions({
        retry: retryDelegatedRead,
        queryKey: key(operations.auditTrail, JSON.stringify(query)),
        queryFn: ({ signal }) =>
          requestDelegatedOperation(operations.auditTrail, { params, query }, signal),
      }),
  };
}

export type DelegatedQueries = ReturnType<typeof delegatedQueries>;

export const stepOperations = {
  start: operations.startStep,
  complete: operations.completeStep,
  skip: operations.skipStep,
} satisfies Record<SetupCommand, unknown>;

export function delegatedCommands(sessionPublicId: string) {
  const params = { sessionPublicId };
  return {
    correctEmployee: (userPublicId: string, body: EmployeeCorrection) =>
      requestDelegatedOperation(operations.updateUser, {
        params: { ...params, userPublicId },
        body,
      }),
    updateProfile: (body: DelegatedProfileUpdate) =>
      requestDelegatedOperation(operations.updateProfile, { params, body }),
    transitionStep: (command: SetupCommand, stepPublicId: string) =>
      requestDelegatedOperation(stepOperations[command], {
        params: { ...params, stepPublicId },
      }),
    updateEmailSettings: (body: DelegatedEmailSettingsBody) =>
      requestDelegatedOperation(operations.updateEmailSettings, { params, body }),
    assignTemplate: (body: TemplateAssignment) =>
      requestDelegatedOperation(operations.assignTemplate, { params, body }),
    unassignTemplate: (emailTypeKey: string) =>
      sendDelegatedCommand(operations.unassignTemplate, { params: { ...params, emailTypeKey } }),
  };
}

export type DelegatedCommands = ReturnType<typeof delegatedCommands>;
