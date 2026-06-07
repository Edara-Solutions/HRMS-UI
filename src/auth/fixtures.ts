import type { AuthSession } from "./types";

export const dummyAdminLoginCredentials = {
  email: "admin@edara.com",
  password: "AdminP@ss1",
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
