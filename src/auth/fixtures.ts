import type { AuthSession } from "./types";

export const dummyAdminLoginCredentials = {
  email: "admin@edara.com",
  password: "AdminP@ss1",
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
    isOwner: true,
    isPlatformAdmin: false,
  },
};

export const dummyAdminAuthenticatedSession: AuthSession = {
  accessToken: "dev-admin-access-token",
  refreshToken: "dev-admin-refresh-token",
  sessionId: "f4b5d4c2-1b68-4b33-a7d9-6d6e67e7a901",
  expiresIn: 3600,
  user: {
    publicId: "f3c93d46-7f8b-4c22-b1e0-9d8d67a0f901",
    employeeCode: "ADM-001",
    firstName: "Mona",
    lastName: "Nasser",
    email: dummyAdminLoginCredentials.email,
    status: "ACTIVE",
    companyCode: "EDARA",
    mustChangePassword: false,
    permissions: ["companies:read", "companies:update", "audit:read"],
    isOwner: false,
    isPlatformAdmin: true,
  },
};
