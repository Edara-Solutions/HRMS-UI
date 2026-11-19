import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  ContractViolation,
  platformLeadOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  sendPlatformCommand,
} from "@/shared/api";
export type LeadDetail = z.output<(typeof operations.lead.responses)["200"]>;
export type LeadCommand =
  | "remove"
  | "archive"
  | "unarchive"
  | "addContact"
  | "updateContact"
  | "removeContact"
  | "addActivity"
  | "removeActivity"
  | "provision"
  | "verify";
export interface LeadCommandInput {
  kind: LeadCommand;
  body?: unknown;
  targetPublicId?: string;
  name: string;
}
function leadScoped<T extends { lead: { publicId: string } }>(
  value: T,
  publicId: string,
  key: string,
) {
  if (value.lead.publicId !== publicId)
    throw new ContractViolation({ audience: "platform", key, phase: "response", status: 200 });
  return value;
}
function domainScoped<T extends { owner: string; ownerPublicId: string }>(
  value: T,
  publicId: string,
  key: string,
) {
  if (value.owner !== "LEAD" || value.ownerPublicId !== publicId)
    throw new ContractViolation({ audience: "platform", key, phase: "response", status: 200 });
  return value;
}
export function crmQueries(userPublicId: string, publicId: string, page: number) {
  const params = { publicId };
  return {
    lead: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.lead, publicId),
      queryFn: async ({ signal }) =>
        leadScoped(
          await requestPlatformOperation(operations.lead, { params }, signal),
          publicId,
          operations.lead.key,
        ),
    }),
    eligibility: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.eligibility, publicId),
      queryFn: ({ signal }) => requestPlatformOperation(operations.eligibility, { params }, signal),
      select: (value) => ({
        isEligible: value.isEligible,
        reasons: value.reasons.map(({ code }) => code),
      }),
    }),
    activities: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.activities, publicId, page),
      queryFn: ({ signal }) =>
        requestPlatformOperation(
          operations.activities,
          { params, query: { page, pageSize: 20 } },
          signal,
        ),
    }),
    domain: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.domain, publicId),
      queryFn: async ({ signal }) =>
        domainScoped(
          await requestPlatformOperation(
            operations.domain,
            { params: { leadPublicId: publicId } },
            signal,
          ),
          publicId,
          operations.domain.key,
        ),
      select: (value) => ({
        domain: value.domain,
        status: value.status,
        health: value.health,
        records: value.dnsRecords.map(({ kind, host, recordType, value }) => ({
          kind,
          host,
          recordType,
          value,
        })),
        checks: value.checkResults.map(({ kind, status }) => ({ kind, status })),
      }),
    }),
    readiness: queryOptions({
      queryKey: platformQueryKey(userPublicId, operations.readiness, publicId),
      queryFn: ({ signal }) =>
        requestPlatformOperation(
          operations.readiness,
          { params: { leadPublicId: publicId } },
          signal,
        ),
    }),
  };
}
export async function runLeadCommand(publicId: string, item: LeadCommandInput) {
  const params = { publicId };
  switch (item.kind) {
    case "remove":
      return sendPlatformCommand(operations.remove, { params });
    case "removeContact":
      return sendPlatformCommand(operations.removeContact, {
        params: { ...params, contactPublicId: item.targetPublicId },
      });
    case "removeActivity":
      return sendPlatformCommand(operations.removeActivity, {
        params: { ...params, activityPublicId: item.targetPublicId },
      });
    case "archive":
      return leadScoped(
        await requestPlatformOperation(operations.archive, { params }),
        publicId,
        operations.archive.key,
      );
    case "unarchive":
      return leadScoped(
        await requestPlatformOperation(operations.unarchive, { params }),
        publicId,
        operations.unarchive.key,
      );
    case "addContact":
      return requestPlatformOperation(operations.addContact, { params, body: item.body });
    case "updateContact": {
      const value = await requestPlatformOperation(operations.updateContact, {
        params: { ...params, contactPublicId: item.targetPublicId },
        body: item.body,
      });
      if (value.publicId !== item.targetPublicId)
        throw new ContractViolation({
          audience: "platform",
          key: operations.updateContact.key,
          phase: "response",
          status: 200,
        });
      return value;
    }
    case "addActivity":
      return requestPlatformOperation(operations.addActivity, { params, body: item.body });
    case "provision":
      return domainScoped(
        await requestPlatformOperation(operations.provision, {
          params: { leadPublicId: publicId },
          body: item.body,
        }),
        publicId,
        operations.provision.key,
      );
    case "verify":
      return domainScoped(
        await requestPlatformOperation(operations.verify, { params: { leadPublicId: publicId } }),
        publicId,
        operations.verify.key,
      );
  }
}
