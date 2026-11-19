import type {
  AudienceTokens,
  CompanySession,
  CompanyUser,
  PlatformSession,
  PlatformUser,
} from "@/shared/auth";

const tokens: AudienceTokens = {
  accessToken: "access-canary",
  refreshToken: "refresh-canary",
  sessionId: "a51718df-af1c-443a-939f-b0e63433c5b2",
  expiresIn: 900,
  mustChangePassword: false,
};

export function companySessionFixture(
  user: Partial<CompanyUser> = {},
  tokenOverrides: Partial<AudienceTokens> = {},
): CompanySession {
  return {
    ...tokens,
    ...tokenOverrides,
    user: {
      publicId: "e4827627-311b-4fe2-a73d-387967af596f",
      firstName: "Sara",
      lastName: "Ahmed",
      email: "sara@example.test",
      companyPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
      companyCode: "EDARA",
      employeeCode: "EMP-1",
      status: "ACTIVE",
      isOwner: false,
      permissions: [],
      mustChangePassword: false,
      locale: "en",
      timezone: "UTC",
      photoUrl: null,
      ...user,
    },
  };
}

export function platformSessionFixture(
  user: Partial<PlatformUser> = {},
  tokenOverrides: Partial<AudienceTokens> = {},
): PlatformSession {
  return {
    ...tokens,
    ...tokenOverrides,
    user: {
      publicId: "dbd240db-1b2f-40b3-a081-75d27d4d912c",
      firstName: "Nadia",
      lastName: "Hassan",
      email: "nadia@example.test",
      status: "ACTIVE",
      roleNames: [],
      permissions: [],
      mustChangePassword: false,
      locale: "en",
      timezone: "UTC",
      photoUrl: null,
      ...user,
    },
  };
}
