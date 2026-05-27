export type AuthStatus =
  | "anonymous"
  | "authenticating"
  | "authenticated"
  | "must_change_password"
  | "refreshing"
  | "expired"
  | "forbidden";

export interface SessionUser {
  publicId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "ACTIVE" | "ONBOARDING" | "PROBATION" | "SUSPENDED" | "TERMINATED" | "RESIGNED";
  companyCode: string;
  mustChangePassword: boolean;
  permissions: string[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
  user: SessionUser;
}

export interface LoginCredentials {
  companyCode: string;
  employeeCode: string;
  password: string;
  clientType: "web";
}
