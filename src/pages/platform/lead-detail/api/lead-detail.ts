import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { leadComponents as components, leadPaths as paths } from "@/shared/api";
import {
  apiClient,
  parseLeadActivityListResponse,
  parseLeadConversionEligibility,
  parseLeadCreateResult,
  parseLeadDetails,
  parseLeadListResponse,
} from "@/shared/api";

// Types generated from the backend OpenAPI contract.

export type LeadStatus = components["schemas"]["LeadStatus"];
export type LeadSource = components["schemas"]["LeadSource"];
export type LostReason = components["schemas"]["LostReason"];
export type CompanySizeRange = components["schemas"]["CompanySizeRange"];
export type LeadActivityType = components["schemas"]["LeadActivityType"];

export type Lead = components["schemas"]["Lead"];
export type LeadContact = components["schemas"]["LeadContact"];
export type LeadWithContacts = components["schemas"]["LeadWithContacts"];
export type LeadDetails = components["schemas"]["LeadDetails"];
export type LeadActivity = components["schemas"]["LeadActivity"];
export type LeadCreateResult = components["schemas"]["LeadCreateResult"];
export type LeadListMeta = components["schemas"]["PageMeta"];
export type LeadListResponse = components["schemas"]["LeadListResponse"];
export type LeadActivityListResponse = components["schemas"]["LeadActivityListResponse"];
export type LeadConversionEligibility = components["schemas"]["LeadConversionEligibility"];

type LeadsPaths = paths["/api/v1/leads"];
type LeadPaths = paths["/api/v1/leads/{publicId}"];
type LeadContactsPaths = paths["/api/v1/leads/{publicId}/contacts"];
type LeadContactPaths = paths["/api/v1/leads/{publicId}/contacts/{contactPublicId}"];
type LeadActivitiesPaths = paths["/api/v1/leads/{publicId}/activities"];

export type LeadListParams = NonNullable<LeadsPaths["get"]["parameters"]["query"]>;
export type CreateLeadInput = LeadsPaths["post"]["requestBody"]["content"]["application/json"];
export type UpdateLeadInput = LeadPaths["patch"]["requestBody"]["content"]["application/json"];
export type AddContactInput =
  LeadContactsPaths["post"]["requestBody"]["content"]["application/json"];
export type UpdateContactInput =
  LeadContactPaths["patch"]["requestBody"]["content"]["application/json"];
export type AddActivityInput =
  LeadActivitiesPaths["post"]["requestBody"]["content"]["application/json"];

// Query keys

const leadsKeys = {
  all: ["leads"] as const,
  list: (params: LeadListParams) => ["leads", "list", params] as const,
  detail: (id: string) => ["leads", id] as const,
  activities: (id: string, page: number) => ["leads", id, "activities", page] as const,
  activitiesAll: (id: string) => ["leads", id, "activities"] as const,
  eligibility: (id: string) => ["leads", id, "conversion-eligibility"] as const,
};

// API functions

async function fetchLeads(params: LeadListParams): Promise<LeadListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.source) searchParams.set("source", params.source);
  if (params.country) searchParams.set("country", params.country);
  if (params.createdFrom) searchParams.set("createdFrom", params.createdFrom);
  if (params.createdTo) searchParams.set("createdTo", params.createdTo);
  if (params.isArchived !== undefined) {
    searchParams.set("isArchived", String(params.isArchived));
  }
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.sort) searchParams.set("sort", params.sort);
  const response: unknown = await apiClient.get("leads", { searchParams }).json();
  return parseLeadListResponse(response);
}

async function fetchLead(publicId: string): Promise<LeadDetails> {
  const response: unknown = await apiClient.get(`leads/${publicId}`).json();
  return parseLeadDetails(response);
}

async function createLead(input: CreateLeadInput): Promise<LeadCreateResult> {
  const response: unknown = await apiClient.post("leads", { json: input }).json();
  return parseLeadCreateResult(response);
}

async function updateLead(publicId: string, input: UpdateLeadInput): Promise<LeadWithContacts> {
  return apiClient.patch(`leads/${publicId}`, { json: input }).json();
}

async function deleteLead(publicId: string): Promise<void> {
  await apiClient.delete(`leads/${publicId}`);
}

async function fetchLeadConversionEligibility(
  publicId: string,
): Promise<LeadConversionEligibility> {
  const response: unknown = await apiClient.get(`leads/${publicId}/conversion-eligibility`).json();
  return parseLeadConversionEligibility(response);
}

async function setLeadArchived(publicId: string, isArchived: boolean): Promise<LeadWithContacts> {
  const command = isArchived ? "archive" : "unarchive";
  return apiClient.post(`leads/${publicId}/${command}`).json();
}

async function fetchLeadActivities(publicId: string, page = 1): Promise<LeadActivityListResponse> {
  const response: unknown = await apiClient
    .get(`leads/${publicId}/activities`, { searchParams: { page } })
    .json();
  return parseLeadActivityListResponse(response);
}

async function addLeadActivity(publicId: string, input: AddActivityInput): Promise<LeadActivity> {
  return apiClient.post(`leads/${publicId}/activities`, { json: input }).json();
}

async function addLeadContact(publicId: string, input: AddContactInput): Promise<LeadContact> {
  return apiClient.post(`leads/${publicId}/contacts`, { json: input }).json();
}

async function updateLeadContact(
  publicId: string,
  contactPublicId: string,
  input: UpdateContactInput,
): Promise<LeadContact> {
  return apiClient.patch(`leads/${publicId}/contacts/${contactPublicId}`, { json: input }).json();
}

async function deleteLeadContact(publicId: string, contactPublicId: string): Promise<void> {
  await apiClient.delete(`leads/${publicId}/contacts/${contactPublicId}`);
}

// Hooks

export function useLeads(params: LeadListParams = {}) {
  return useQuery({
    queryKey: leadsKeys.list(params),
    queryFn: () => fetchLeads(params),
  });
}

export function useLead(publicId: string) {
  return useQuery({
    queryKey: leadsKeys.detail(publicId),
    queryFn: () => fetchLead(publicId),
    enabled: Boolean(publicId),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLead,
    onSuccess: () => qc.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: UpdateLeadInput }) =>
      updateLead(publicId, input),
    onSettled: () => qc.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => qc.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}

export function useLeadConversionEligibility(publicId: string) {
  return useQuery({
    queryKey: leadsKeys.eligibility(publicId),
    queryFn: () => fetchLeadConversionEligibility(publicId),
    enabled: Boolean(publicId),
  });
}

export function useSetLeadArchived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, isArchived }: { publicId: string; isArchived: boolean }) =>
      setLeadArchived(publicId, isArchived),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      queryClient.invalidateQueries({ queryKey: leadsKeys.detail(variables.publicId) });
      queryClient.invalidateQueries({ queryKey: leadsKeys.eligibility(variables.publicId) });
    },
  });
}

export function useLeadActivities(publicId: string, page = 1) {
  return useQuery({
    queryKey: leadsKeys.activities(publicId, page),
    queryFn: () => fetchLeadActivities(publicId, page),
    enabled: Boolean(publicId),
  });
}

export function useAddLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: AddActivityInput }) =>
      addLeadActivity(publicId, input),
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: leadsKeys.activitiesAll(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.detail(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.eligibility(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.all });
    },
  });
}

export function useAddLeadContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: AddContactInput }) =>
      addLeadContact(publicId, input),
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: leadsKeys.detail(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.eligibility(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.activitiesAll(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.all });
    },
  });
}

export function useUpdateLeadContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      publicId,
      contactPublicId,
      input,
    }: {
      publicId: string;
      contactPublicId: string;
      input: UpdateContactInput;
    }) => updateLeadContact(publicId, contactPublicId, input),
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: leadsKeys.detail(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.eligibility(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.activitiesAll(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.all });
    },
  });
}

export function useDeleteLeadContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, contactPublicId }: { publicId: string; contactPublicId: string }) =>
      deleteLeadContact(publicId, contactPublicId),
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: leadsKeys.detail(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.eligibility(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.activitiesAll(vars.publicId) });
      qc.invalidateQueries({ queryKey: leadsKeys.all });
    },
  });
}
