import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

export interface DeliveryFilterOption {
  value: string;
  code: string;
  label: string;
  searchText: string;
}

const COMPANY_OPTIONS_SCHEMA = z.object({
  data: z.array(
    z.object({
      publicId: z.string().min(1),
      companyCode: z.string().min(1),
      name: z.string().min(1),
    }),
  ),
});

const EMAIL_TYPE_OPTIONS_SCHEMA = z.object({
  items: z.array(
    z.object({
      key: z.string().min(1),
      description: z.string(),
      context: z.enum(["EDARA", "COMPANY"]),
    }),
  ),
});

const deliveryFilterOptionKeys = {
  companies: () => ["email-deliveries", "filter-options", "companies"] as const,
  emailTypes: () => ["email-deliveries", "filter-options", "email-types"] as const,
};

async function fetchCompanyOptions(): Promise<DeliveryFilterOption[]> {
  const response = await apiClient
    .get("companies", { searchParams: { page: "1", limit: "100" } })
    .json<unknown>();
  return COMPANY_OPTIONS_SCHEMA.parse(response).data.map((company) => ({
    value: company.publicId,
    code: company.companyCode,
    label: company.name,
    searchText: `${company.companyCode} ${company.name}`,
  }));
}

async function fetchEmailTypeOptions(): Promise<DeliveryFilterOption[]> {
  const response = await apiClient.get("email-types").json<unknown>();
  return EMAIL_TYPE_OPTIONS_SCHEMA.parse(response).items.map((emailType) => ({
    value: emailType.key,
    code: emailType.key,
    label: emailType.description,
    searchText: `${emailType.key} ${emailType.description} ${emailType.context}`,
  }));
}

/** Loads Company codes and names for the delivery-history company selector. */
export function useDeliveryCompanyOptions() {
  return useQuery({
    queryKey: deliveryFilterOptionKeys.companies(),
    queryFn: fetchCompanyOptions,
  });
}

/** Loads registered Email Types for the delivery-history type selector. */
export function useDeliveryEmailTypeOptions() {
  return useQuery({
    queryKey: deliveryFilterOptionKeys.emailTypes(),
    queryFn: fetchEmailTypeOptions,
  });
}
