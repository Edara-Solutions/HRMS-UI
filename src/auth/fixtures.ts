import type { AuthSession, LoginCredentials } from "./types";

export const dummyLoginCredentials: LoginCredentials = {
  companyCode: "EDARA",
  employeeCode: "EDA-001",
  password: "MySecureP@ss1",
  clientType: "web",
};

export const dummyAuthenticatedSession: AuthSession = {
  accessToken: "dev-access-token",
  refreshToken: "dev-refresh-token",
  sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  expiresIn: 3600,
  user: {
    publicId: "550e8400-e29b-41d4-a716-446655440000",
    employeeCode: "EDA-001",
    firstName: "Ahmed",
    lastName: "Al-Rashid",
    email: "ahmed@edara.com",
    status: "ACTIVE",
    companyCode: "EDARA",
    mustChangePassword: false,
    permissions: [
      "users:read",
      "users:create",
      "roles:read",
      "sessions:read",
      "companies:read",
      "audit:read",
    ],
  },
};
