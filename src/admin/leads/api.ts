import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "NEW"
  | "NO_ANSWER"
  | "WRONG_NUMBER"
  | "CONTACTED"
  | "FOLLOWING_UP"
  | "QUALIFIED"
  | "NOT_QUALIFIED"
  | "NOT_INTERESTED"
  | "DEMO_SCHEDULED"
  | "WAITING_QUOTATION"
  | "QUOTATION_SENT"
  | "TRIAL_STARTED"
  | "NEGOTIATION"
  | "WON_CONVERTED"
  | "LOST"
  | "REJOINED";

export type LeadSource =
  | "CRM"
  | "LANDING_PAGE"
  | "FACEBOOK"
  | "GOOGLE"
  | "LINKEDIN"
  | "REFERRAL"
  | "PARTNER"
  | "OTHER";

export type LostReason =
  | "TOO_EXPENSIVE"
  | "MISSING_FEATURES"
  | "NOT_FIT"
  | "COMPETITOR_CHOSEN"
  | "NO_BUDGET"
  | "NO_DECISION"
  | "NO_RESPONSE";

export type CompanySizeRange = "5_TO_20" | "21_TO_50" | "51_TO_100" | "MORE_THAN_100";

export type LeadActivityType =
  | "CALLING_ON_WHATSAPP"
  | "CALLING_ON_PHONE"
  | "SENDING_EMAIL"
  | "RECEIVING_EMAIL"
  | "SENDING_SMS"
  | "RECEIVING_SMS"
  | "CHAT"
  | "SENDING_QUOTATION"
  | "REQUEST_QUOTATION"
  | "MEETING"
  | "NOTE"
  | "FORM_SUBMISSION"
  | "SYSTEM_EVENT"
  | "OTHER";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Lead {
  id?: number;
  publicId: string;
  companyName: string | null;
  website: string | null;
  industry: string | null;
  companySizeRange: CompanySizeRange;
  country: string | null;
  city: string | null;
  source: LeadSource;
  status: LeadStatus;
  lostReason: LostReason | null;
  ownerUserId: number | null;
  numberOfAttempts: number;
  companyId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LeadContact {
  publicId: string;
  leadId?: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface LeadWithContacts {
  lead: Lead;
  contacts: LeadContact[];
}

export interface LeadActivity {
  publicId: string;
  leadId: number;
  type: LeadActivityType;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LeadListMeta {
  mode: "page";
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface LeadListResponse {
  items: LeadWithContacts[];
  meta: LeadListMeta;
}

export interface LeadActivityListResponse {
  items: LeadActivity[];
  meta: LeadListMeta;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const leadsKeys = {
  all: ["leads"] as const,
  list: (params: LeadListParams) => ["leads", "list", params] as const,
  detail: (id: string) => ["leads", id] as const,
  activities: (id: string) => ["leads", id, "activities"] as const,
};

// ─── Params ───────────────────────────────────────────────────────────────────

export interface LeadListParams {
  status?: LeadStatus;
  source?: LeadSource;
  country?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: "createdAtAsc" | "createdAtDesc";
}

// ─── API Fns ──────────────────────────────────────────────────────────────────

async function fetchLeads(params: LeadListParams): Promise<LeadListResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.source) searchParams.set("source", params.source);
  if (params.country) searchParams.set("country", params.country);
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.sort) searchParams.set("sort", params.sort);
  return apiClient.get("leads", { searchParams }).json();
}

async function fetchLead(publicId: string): Promise<LeadWithContacts> {
  return apiClient.get(`leads/${publicId}`).json();
}

async function createLead(
  input: Partial<Lead> & { primaryContact?: Partial<LeadContact> },
): Promise<LeadWithContacts> {
  return apiClient.post("leads", { json: input }).json();
}

async function updateLead(
  publicId: string,
  input: Partial<Lead> & { allowStatusOverride?: boolean },
): Promise<LeadWithContacts> {
  return apiClient.patch(`leads/${publicId}`, { json: input }).json();
}

async function deleteLead(publicId: string): Promise<void> {
  await apiClient.delete(`leads/${publicId}`);
}

export interface ConvertLeadInput {
  phoneNumber: string;
  name?: string;
  country?: string;
  website?: string;
  logo?: string;
  addressLine?: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
}

export interface ConvertLeadResult {
  publicId: string;
  name: string;
  companyCode: string;
}

async function convertLead(publicId: string, input: ConvertLeadInput): Promise<ConvertLeadResult> {
  return apiClient.post(`leads/${publicId}/convert`, { json: input }).json();
}

async function fetchLeadActivities(publicId: string, page = 1): Promise<LeadActivityListResponse> {
  return apiClient.get(`leads/${publicId}/activities`, { searchParams: { page } }).json();
}

async function addLeadActivity(
  publicId: string,
  input: { type: LeadActivityType; note: string },
): Promise<LeadActivity> {
  return apiClient.post(`leads/${publicId}/activities`, { json: input }).json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

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
    mutationFn: ({
      publicId,
      input,
    }: {
      publicId: string;
      input: Partial<Lead> & { allowStatusOverride?: boolean };
    }) => updateLead(publicId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => qc.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: ConvertLeadInput }) =>
      convertLead(publicId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadsKeys.all });
    },
  });
}

export function useLeadActivities(publicId: string, page = 1) {
  return useQuery({
    queryKey: leadsKeys.activities(publicId),
    queryFn: () => fetchLeadActivities(publicId, page),
    enabled: Boolean(publicId),
  });
}

export function useAddLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      publicId,
      input,
    }: {
      publicId: string;
      input: { type: LeadActivityType; note: string };
    }) => addLeadActivity(publicId, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: leadsKeys.activities(vars.publicId) });
    },
  });
}
