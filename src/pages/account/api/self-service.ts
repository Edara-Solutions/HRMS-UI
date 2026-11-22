import type { AudienceName } from "@/shared/auth";

export async function loadSelfService(audience: AudienceName) {
  if (audience === "company") {
    const company = await import("@/shared/company-self");
    const auth = await import("@/shared/company-auth");
    return {
      schemas: company.companySelfSchemas,
      readProfile: company.readCompanyProfile,
      updateProfile: company.updateCompanyProfile,
      changeEmail: company.changeCompanyEmail,
      readSessions: company.readCompanySessions,
      revokeSession: company.revokeCompanySession,
      canRevokeCurrent: true,
      signOut: auth.signOutCompany,
    };
  }
  const platform = await import("@/shared/platform-self");
  const auth = await import("@/shared/platform-auth");
  return {
    schemas: platform.platformSelfSchemas,
    readProfile: platform.readPlatformProfile,
    updateProfile: platform.updatePlatformProfile,
    changeEmail: platform.changePlatformEmail,
    readSessions: platform.readPlatformSessions,
    revokeSession: platform.revokePlatformSession,
    canRevokeCurrent: false,
    signOut: auth.signOutPlatform,
  };
}

export type SelfService = Awaited<ReturnType<typeof loadSelfService>>;
export interface SelfIdentity {
  audience: AudienceName;
  publicId: string;
}
