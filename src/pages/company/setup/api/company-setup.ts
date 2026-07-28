import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

const timestampSchema = z.string().datetime({ offset: true });

export const setupStepTypeValues = [
  "SET_COMPANY_PROFILE",
  "SET_ROLES",
  "SET_JOBS",
  "SET_BRANCHES",
  "SET_SHIFTS",
  "SET_DEPARTMENTS",
] as const;

export const setupStepStatusValues = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const;

export const activationRequirementCodes = [
  "OWNER_ONBOARDING_INCOMPLETE",
  "COMPANY_PROFILE_INCOMPLETE",
  "REQUIRED_SETUP_INCOMPLETE",
  "ACCESS_POLICY_RESTRICTS_ACTIVATION",
  "SUBSCRIPTION_NOT_ACTIVATABLE",
] as const;

export const companyProfileSchema = z.object({
  publicId: z.string(),
  companyPublicId: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  addressLine: z.string().nullable(),
  taxNumber: z.string().nullable(),
  commercialNumber: z.string().nullable(),
  status: z.enum(["INCOMPLETE", "COMPLETE"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const setupStepSchema = z.object({
  publicId: z.string().uuid(),
  stepType: z.enum(setupStepTypeValues),
  status: z.enum(setupStepStatusValues),
  isRequired: z.boolean(),
  sequence: z.number().int().positive(),
  templateVersion: z.number().int().positive(),
  dependencies: z.array(z.enum(setupStepTypeValues)),
  startedAt: timestampSchema.nullable(),
  completedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const companySetupChecklistSchema = z.object({
  companyPublicId: z.string(),
  templateVersion: z.number().int().positive(),
  steps: z.array(setupStepSchema),
});

export const companyActivationSchema = z.object({
  companyPublicId: z.string(),
  lifecycleStatus: z.enum(["ONBOARDING", "ACTIVE", "SUSPENDED", "CLOSED"]),
  activatedAt: timestampSchema.nullable(),
  canActivate: z.boolean(),
  unmetRequirements: z.array(
    z.object({
      code: z.enum(activationRequirementCodes),
      message: z.string(),
      details: z.record(z.string(), z.unknown()),
    }),
  ),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type SetupStepType = (typeof setupStepTypeValues)[number];
export type SetupStepStatus = (typeof setupStepStatusValues)[number];
export type CompanySetupStep = z.infer<typeof setupStepSchema>;
export type CompanySetupChecklist = z.infer<typeof companySetupChecklistSchema>;
export type ActivationRequirementCode = (typeof activationRequirementCodes)[number];
export type CompanyActivation = z.infer<typeof companyActivationSchema>;

type SetupStepCommand = "start" | "complete" | "skip";

export const companySetupKeys = {
  all: ["company-setup"] as const,
  detail: (companyPublicId: string) => ["company-setup", "detail", companyPublicId] as const,
  activation: (companyPublicId: string) =>
    ["company-setup", "activation", companyPublicId] as const,
  profile: (companyPublicId: string) => ["company-profile", companyPublicId] as const,
};

async function fetchCompanyProfile(companyPublicId: string): Promise<CompanyProfile> {
  const response: unknown = await apiClient.get(`companies/${companyPublicId}/profile`).json();
  return companyProfileSchema.parse(response);
}

async function fetchCompanySetupChecklist(companyPublicId: string): Promise<CompanySetupChecklist> {
  const response: unknown = await apiClient.get(`companies/${companyPublicId}/setup`).json();
  return companySetupChecklistSchema.parse(response);
}

async function fetchCompanyActivation(companyPublicId: string): Promise<CompanyActivation> {
  const response: unknown = await apiClient.get(`companies/${companyPublicId}/activation`).json();
  return companyActivationSchema.parse(response);
}

async function updateSetupStep({
  companyPublicId,
  stepPublicId,
  command,
}: {
  companyPublicId: string;
  stepPublicId: string;
  command: SetupStepCommand;
}): Promise<CompanySetupStep> {
  const response: unknown = await apiClient
    .post(`companies/${companyPublicId}/setup/${stepPublicId}/${command}`)
    .json();
  return setupStepSchema.parse(response);
}

function replaceSetupStep(
  current: CompanySetupChecklist | undefined,
  updatedStep: CompanySetupStep,
  companyPublicId: string,
): CompanySetupChecklist {
  if (!current) {
    return {
      companyPublicId,
      templateVersion: updatedStep.templateVersion,
      steps: [updatedStep],
    };
  }

  return {
    ...current,
    steps: current.steps.map((step) =>
      step.publicId === updatedStep.publicId ? updatedStep : step,
    ),
  };
}

function useInvalidateCompanyState() {
  const queryClient = useQueryClient();

  return async (companyPublicId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: companySetupKeys.detail(companyPublicId) }),
      queryClient.invalidateQueries({ queryKey: companySetupKeys.activation(companyPublicId) }),
      queryClient.invalidateQueries({ queryKey: companySetupKeys.profile(companyPublicId) }),
    ]);
  };
}

function useSetupStepCommand(command: SetupStepCommand) {
  const queryClient = useQueryClient();
  const invalidateCompanyState = useInvalidateCompanyState();

  return useMutation({
    mutationFn: ({
      companyPublicId,
      stepPublicId,
    }: {
      companyPublicId: string;
      stepPublicId: string;
    }) => updateSetupStep({ companyPublicId, stepPublicId, command }),
    retry: false,
    onSuccess: async (updatedStep, variables) => {
      queryClient.setQueryData(companySetupKeys.detail(variables.companyPublicId), (current) =>
        replaceSetupStep(
          current as CompanySetupChecklist | undefined,
          updatedStep,
          variables.companyPublicId,
        ),
      );
      await invalidateCompanyState(variables.companyPublicId);
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateCompanyState(variables.companyPublicId);
    },
  });
}

export function useCompanyProfile(companyPublicId: string | null) {
  return useQuery({
    queryKey: companySetupKeys.profile(companyPublicId ?? ""),
    queryFn: () => fetchCompanyProfile(companyPublicId ?? ""),
    enabled: companyPublicId !== null,
  });
}

export function useCompanySetupChecklist(companyPublicId: string | null) {
  return useQuery({
    queryKey: companySetupKeys.detail(companyPublicId ?? ""),
    queryFn: () => fetchCompanySetupChecklist(companyPublicId ?? ""),
    enabled: companyPublicId !== null,
  });
}

export function useCompanyActivation(companyPublicId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: companySetupKeys.activation(companyPublicId ?? ""),
    queryFn: () => fetchCompanyActivation(companyPublicId ?? ""),
    enabled: companyPublicId !== null && enabled,
    retry: false,
  });
}

export function useStartSetupStep() {
  return useSetupStepCommand("start");
}

export function useCompleteSetupStep() {
  return useSetupStepCommand("complete");
}

export function useSkipSetupStep() {
  return useSetupStepCommand("skip");
}
