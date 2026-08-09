import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";

export interface Company {
  publicId: string;
  logo: string | null;
  name: string;
  website: string | null;
  phoneNumber: string;
  country: string;
  companyCode: string;
  isActive: boolean;
  addressLine: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCompanyInput {
  name: string;
  phoneNumber: string;
  country: string;
  website?: string | null;
  logo?: string | null;
  isActive?: boolean;
  addressLine?: string | null;
  companyCode?: string;
}

export interface UpdateCompanyInput extends Partial<Omit<CreateCompanyInput, "companyCode">> {}

const companyDetailKeys = {
  all: ["companies"] as const,
  detail: (id: string) => ["companies", id] as const,
};

async function fetchCompany(publicId: string): Promise<Company> {
  return apiClient.get(`companies/${publicId}`).json();
}

async function updateCompany(
  publicId: string,
  input: UpdateCompanyInput,
): Promise<{ message: string }> {
  return apiClient.patch(`companies/${publicId}`, { json: input }).json();
}

export function useCompany(publicId: string) {
  return useQuery({
    queryKey: companyDetailKeys.detail(publicId),
    queryFn: () => fetchCompany(publicId),
    enabled: Boolean(publicId),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: UpdateCompanyInput }) =>
      updateCompany(publicId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: companyDetailKeys.all }),
  });
}
