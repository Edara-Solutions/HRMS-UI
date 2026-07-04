import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditOutcome = "success" | "failure";

export interface AuditEntry {
  action: string;
  module: string;
  targetType: string | null;
  targetPublicId: string | null;
  outcome: AuditOutcome;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditListMeta {
  mode: "page";
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AuditListResponse {
  items: AuditEntry[];
  meta: AuditListMeta;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const auditKeys = {
  all: ["audit"] as const,
  list: (params: AuditListParams) => ["audit", "list", params] as const,
};

// ─── Params ───────────────────────────────────────────────────────────────────

export interface AuditListParams {
  action?: string;
  outcome?: AuditOutcome;
  targetPublicId?: string;
  page?: number;
  pageSize?: number;
}

// ─── API Fns ──────────────────────────────────────────────────────────────────

async function fetchAuditLog(params: AuditListParams): Promise<AuditListResponse> {
  const searchParams = new URLSearchParams();
  if (params.action) searchParams.set("action", params.action);
  if (params.outcome) searchParams.set("outcome", params.outcome);
  if (params.targetPublicId) searchParams.set("targetPublicId", params.targetPublicId);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  return apiClient.get("audit", { searchParams }).json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuditLog(params: AuditListParams = {}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => fetchAuditLog(params),
  });
}
