import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { apiClient, type components, type paths } from "@/shared/api";

export type DnsRecordKind = components["schemas"]["DnsRecordKind"];
export type ReadinessReason = components["schemas"]["ReadinessReason"];
export type DnsRecordInstruction = components["schemas"]["DnsRecordInstruction"];
export type DnsCheckResult = components["schemas"]["DnsCheckResult"];
export type SendingDomain = components["schemas"]["SendingDomain"];
export type SendingDomainReadiness = components["schemas"]["SendingDomainReadiness"];

type SendingDomainPaths = paths["/api/v1/leads/{leadPublicId}/sending-domain"];

export type ProvisionSendingDomainInput =
  SendingDomainPaths["post"]["requestBody"]["content"]["application/json"];

const sendingDomainKeys = {
  detail: (leadPublicId: string) => ["lead-sending-domain", leadPublicId] as const,
  readiness: (leadPublicId: string) => ["lead-sending-domain", leadPublicId, "readiness"] as const,
};

function hasHttpStatus(error: unknown, status: number): boolean {
  return error instanceof HTTPError && error.response.status === status;
}

async function fetchSendingDomain(leadPublicId: string): Promise<SendingDomain> {
  return apiClient.get(`leads/${leadPublicId}/sending-domain`).json();
}

async function fetchSendingDomainReadiness(leadPublicId: string): Promise<SendingDomainReadiness> {
  return apiClient.get(`leads/${leadPublicId}/sending-domain/readiness`).json();
}

async function provisionSendingDomain(
  leadPublicId: string,
  input: ProvisionSendingDomainInput,
): Promise<SendingDomain> {
  return apiClient.post(`leads/${leadPublicId}/sending-domain`, { json: input }).json();
}

async function verifySendingDomain(leadPublicId: string): Promise<SendingDomain> {
  return apiClient.post(`leads/${leadPublicId}/sending-domain/verify`).json();
}

export function useLeadSendingDomain(leadPublicId: string) {
  const query = useQuery({
    queryKey: sendingDomainKeys.detail(leadPublicId),
    queryFn: () => fetchSendingDomain(leadPublicId),
    enabled: Boolean(leadPublicId),
    retry: (failureCount, error) => !hasHttpStatus(error, 404) && failureCount < 2,
  });

  return {
    ...query,
    isNotProvisioned: hasHttpStatus(query.error, 404),
  };
}

export function useLeadSendingDomainReadiness(leadPublicId: string) {
  const query = useQuery({
    queryKey: sendingDomainKeys.readiness(leadPublicId),
    queryFn: () => fetchSendingDomainReadiness(leadPublicId),
    enabled: Boolean(leadPublicId),
    retry: (failureCount, error) => !hasHttpStatus(error, 404) && failureCount < 2,
  });

  return {
    ...query,
    isNotProvisioned: hasHttpStatus(query.error, 404),
  };
}

export function useProvisionLeadSendingDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadPublicId,
      input,
    }: {
      leadPublicId: string;
      input: ProvisionSendingDomainInput;
    }) => provisionSendingDomain(leadPublicId, input),
    onSuccess: (response, variables) => {
      if (!response) return;
      void queryClient.invalidateQueries({
        queryKey: sendingDomainKeys.detail(variables.leadPublicId),
      });
      void queryClient.invalidateQueries({
        queryKey: sendingDomainKeys.readiness(variables.leadPublicId),
      });
    },
  });
}

export function useVerifyLeadSendingDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadPublicId: string) => verifySendingDomain(leadPublicId),
    onSuccess: (response, leadPublicId) => {
      if (!response) return;
      void queryClient.invalidateQueries({ queryKey: sendingDomainKeys.detail(leadPublicId) });
      void queryClient.invalidateQueries({ queryKey: sendingDomainKeys.readiness(leadPublicId) });
    },
  });
}

export function isSendingDomainPermissionError(error: unknown): boolean {
  return hasHttpStatus(error, 403);
}
