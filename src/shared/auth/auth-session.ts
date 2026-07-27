import { z } from "zod";

export type AuthStatus =
  | "anonymous"
  | "authenticating"
  | "authenticated"
  | "must_change_password"
  | "refreshing"
  | "expired"
  | "forbidden";

export const sessionUserSchema = z.object({
  publicId: z.string(),
  employeeCode: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  status: z.enum(["ACTIVE", "ONBOARDING", "PROBATION", "SUSPENDED", "TERMINATED", "RESIGNED"]),
  companyCode: z.string(),
  companyPublicId: z.string().nullable().optional(),
  mustChangePassword: z.boolean(),
  permissions: z.array(z.string()),
  isOwner: z.boolean(),
  isPlatformAdmin: z.boolean(),
});

export const loginTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  sessionId: z.string(),
  expiresIn: z.number().int().positive(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type LoginTokens = z.infer<typeof loginTokensSchema>;

export interface AuthSession extends LoginTokens {
  user: SessionUser;
}

export interface LoginCredentials {
  companyCode: string;
  employeeCode: string;
  password: string;
  clientType: "web";
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
  clientType: "web";
}

export interface AcceptInvitationInput {
  token: string;
  newPassword: string;
  clientType: "web";
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
