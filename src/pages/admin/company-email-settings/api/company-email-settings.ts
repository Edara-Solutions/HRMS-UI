import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient, type components } from "@/shared/api";

export type EmailLocale = components["schemas"]["EmailLocale"];
export type EmailTemplateAssignment = components["schemas"]["EmailTemplateAssignment"];

const emailLocaleSchema = z.enum(["en", "ar"]);
const emailContextSchema = z.enum(["EDARA", "COMPANY"]);
const emailTypeSchema = z.object({
  key: z.string(),
  description: z.string(),
  context: emailContextSchema,
  payloadVersion: z.number(),
  supportedLocales: z.array(emailLocaleSchema),
  criticality: z.enum(["CRITICAL", "OPERATIONAL"]),
  defaultTemplateKey: z.string(),
}) satisfies z.ZodType<components["schemas"]["EmailType"]>;
const emailTypeListResponseSchema = z.object({
  items: z.array(emailTypeSchema),
}) satisfies z.ZodType<components["schemas"]["EmailTypeListResponse"]>;
const emailTemplateAssignmentSchema = z.object({
  companyId: z.number(),
  emailTypeKey: z.string(),
  templateRevisionKey: z.string(),
  assignedBy: z.number().nullable(),
}) satisfies z.ZodType<components["schemas"]["EmailTemplateAssignment"]>;
const emailTemplateAssignmentListResponseSchema = z.object({
  items: z.array(emailTemplateAssignmentSchema),
}) satisfies z.ZodType<components["schemas"]["EmailTemplateAssignmentListResponse"]>;
const emailTemplateVariantSchema = z.object({
  key: z.string(),
  emailTypeKey: z.string(),
  context: emailContextSchema,
  payloadVersion: z.number(),
  supportedLocales: z.array(emailLocaleSchema),
}) satisfies z.ZodType<components["schemas"]["EmailTemplateVariant"]>;
const emailTemplateVariantListResponseSchema = z.object({
  items: z.array(emailTemplateVariantSchema),
}) satisfies z.ZodType<components["schemas"]["EmailTemplateVariantListResponse"]>;
const effectiveTemplateSchema = z.object({
  emailTypeKey: z.string(),
  templateKey: z.string(),
  context: emailContextSchema,
  payloadVersion: z.number(),
  supportedLocales: z.array(emailLocaleSchema),
}) satisfies z.ZodType<components["schemas"]["EffectiveTemplate"]>;
const emailPreviewSchema = z.object({
  emailTypeKey: z.string(),
  templateKey: z.string(),
  context: emailContextSchema,
  locale: emailLocaleSchema,
  subject: z.string(),
  preheader: z.string(),
  html: z.string(),
  text: z.string(),
  senderIdentity: z
    .object({ name: z.string(), address: z.string(), replyTo: z.string() })
    .optional(),
}) satisfies z.ZodType<components["schemas"]["EmailPreview"]>;
const companyBrandSchema = z.object({
  publicId: z.string(),
  logo: z.string().nullable(),
  name: z.string(),
  website: z.string().nullable(),
  phoneNumber: z.string(),
  country: z.string(),
  companyCode: z.string(),
  isActive: z.boolean(),
  addressLine: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
}) satisfies z.ZodType<components["schemas"]["ConvertedCompany"]>;

interface TestSendInput {
  companyPublicId: string;
  emailTypeKey: string;
  locale: EmailLocale;
  recipientEmail: string;
}

interface AssignTemplateInput {
  companyPublicId: string;
  emailTypeKey: string;
  templateRevisionKey: string;
}

interface RemoveTemplateInput {
  companyPublicId: string;
  emailTypeKey: string;
}

const companyEmailSettingsKeys = {
  all: ["company-email-settings"] as const,
  assignments: (companyPublicId: string) =>
    [...companyEmailSettingsKeys.all, companyPublicId, "assignments"] as const,
  effective: (companyPublicId: string, emailTypeKey: string) =>
    [...companyEmailSettingsKeys.all, companyPublicId, "effective", emailTypeKey] as const,
  preview: (companyPublicId: string, emailTypeKey: string, locale: EmailLocale) =>
    [...companyEmailSettingsKeys.all, companyPublicId, "preview", emailTypeKey, locale] as const,
  brand: (companyPublicId: string) =>
    [...companyEmailSettingsKeys.all, companyPublicId, "brand"] as const,
  types: () => [...companyEmailSettingsKeys.all, "types"] as const,
  variants: (emailTypeKey: string) =>
    [...companyEmailSettingsKeys.all, "variants", emailTypeKey] as const,
};

async function fetchEmailTypes(): Promise<components["schemas"]["EmailType"][]> {
  const response: unknown = await apiClient.get("email-types").json();
  return emailTypeListResponseSchema.parse(response).items;
}

async function fetchCompanyBrand(
  companyPublicId: string,
): Promise<components["schemas"]["ConvertedCompany"]> {
  const response: unknown = await apiClient.get(`companies/${companyPublicId}`).json();
  return companyBrandSchema.parse(response);
}

async function fetchAssignments(companyPublicId: string): Promise<EmailTemplateAssignment[]> {
  const response: unknown = await apiClient
    .get(`companies/${companyPublicId}/email-template-assignments`)
    .json();
  return emailTemplateAssignmentListResponseSchema.parse(response).items;
}

async function fetchVariants(
  emailTypeKey: string,
): Promise<components["schemas"]["EmailTemplateVariant"][]> {
  const response: unknown = await apiClient.get(`email-types/${emailTypeKey}/variants`).json();
  return emailTemplateVariantListResponseSchema.parse(response).items;
}

async function fetchEffectiveTemplate(
  companyPublicId: string,
  emailTypeKey: string,
): Promise<components["schemas"]["EffectiveTemplate"]> {
  const response: unknown = await apiClient
    .get(`companies/${companyPublicId}/email-template-assignments/${emailTypeKey}/effective`)
    .json();
  return effectiveTemplateSchema.parse(response);
}

async function fetchPreview(
  companyPublicId: string,
  emailTypeKey: string,
  locale: EmailLocale,
): Promise<components["schemas"]["EmailPreview"]> {
  const response: unknown = await apiClient
    .get(`email-types/${emailTypeKey}/preview`, { searchParams: { companyPublicId, locale } })
    .json();
  return emailPreviewSchema.parse(response);
}

async function assignTemplate({
  companyPublicId,
  emailTypeKey,
  templateRevisionKey,
}: AssignTemplateInput): Promise<void> {
  await apiClient.post(`companies/${companyPublicId}/email-template-assignments`, {
    json: { emailTypeKey, templateRevisionKey },
  });
}

async function removeTemplate({
  companyPublicId,
  emailTypeKey,
}: RemoveTemplateInput): Promise<void> {
  await apiClient.delete(`companies/${companyPublicId}/email-template-assignments/${emailTypeKey}`);
}

async function queueTestSend({
  companyPublicId,
  emailTypeKey,
  locale,
  recipientEmail,
}: TestSendInput): Promise<void> {
  await apiClient.post("emails/test-send", {
    json: { companyPublicId, emailTypeKey, locale, recipientEmail },
  });
}

export function useCompanyEmailTypes() {
  return useQuery({ queryKey: companyEmailSettingsKeys.types(), queryFn: fetchEmailTypes });
}

export function useCompanyEmailBrand(companyPublicId: string) {
  return useQuery({
    queryKey: companyEmailSettingsKeys.brand(companyPublicId),
    queryFn: () => fetchCompanyBrand(companyPublicId),
    enabled: companyPublicId.length > 0,
  });
}

export function useCompanyEmailAssignments(companyPublicId: string, enabled: boolean) {
  return useQuery({
    queryKey: companyEmailSettingsKeys.assignments(companyPublicId),
    queryFn: () => fetchAssignments(companyPublicId),
    enabled: enabled && companyPublicId.length > 0,
  });
}

export function useCompanyEmailVariants(emailTypeKey: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: companyEmailSettingsKeys.variants(emailTypeKey ?? ""),
    queryFn: () => fetchVariants(emailTypeKey ?? ""),
    enabled: enabled && emailTypeKey !== undefined,
  });
}

export function useCompanyEffectiveTemplate(
  companyPublicId: string,
  emailTypeKey: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: companyEmailSettingsKeys.effective(companyPublicId, emailTypeKey ?? ""),
    queryFn: () => fetchEffectiveTemplate(companyPublicId, emailTypeKey ?? ""),
    enabled: enabled && companyPublicId.length > 0 && emailTypeKey !== undefined,
  });
}

export function useCompanyEmailPreview(
  companyPublicId: string,
  emailTypeKey: string | undefined,
  locale: EmailLocale | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: companyEmailSettingsKeys.preview(companyPublicId, emailTypeKey ?? "", locale ?? "en"),
    queryFn: () => fetchPreview(companyPublicId, emailTypeKey ?? "", locale ?? "en"),
    enabled:
      enabled && companyPublicId.length > 0 && emailTypeKey !== undefined && locale !== undefined,
  });
}

export function useAssignCompanyEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignTemplate,
    onSuccess: async (_, input) => invalidateCompanyEmailTemplateQueries(queryClient, input),
  });
}

export function useRemoveCompanyEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeTemplate,
    onSuccess: async (_, input) => invalidateCompanyEmailTemplateQueries(queryClient, input),
  });
}

export function useQueueCompanyEmailTestSend() {
  return useMutation({ mutationFn: queueTestSend });
}

async function invalidateCompanyEmailTemplateQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  input: AssignTemplateInput | RemoveTemplateInput,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: companyEmailSettingsKeys.assignments(input.companyPublicId),
    }),
    queryClient.invalidateQueries({
      queryKey: companyEmailSettingsKeys.effective(input.companyPublicId, input.emailTypeKey),
    }),
    queryClient.invalidateQueries({
      queryKey: companyEmailSettingsKeys.preview(input.companyPublicId, input.emailTypeKey, "en"),
    }),
    queryClient.invalidateQueries({
      queryKey: companyEmailSettingsKeys.preview(input.companyPublicId, input.emailTypeKey, "ar"),
    }),
  ]);
}
