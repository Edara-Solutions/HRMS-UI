import type { AudienceName } from "@/shared/auth";

export async function loadCredentialService(audience: AudienceName) {
  if (audience === "company") {
    const company = await import("@/shared/company-auth");
    return {
      schemas: company.companyCredentialSchemas,
      signIn: company.signInCompany,
      acceptInvitation: company.acceptCompanyInvitation,
      requestRecovery: company.requestCompanyRecovery,
      confirmRecovery: company.confirmCompanyRecovery,
      signOut: company.signOutCompany,
      revalidate: company.revalidateCompanySession,
    };
  }
  const platform = await import("@/shared/platform-auth");
  return {
    schemas: platform.platformCredentialSchemas,
    signIn: platform.signInPlatform,
    acceptInvitation: platform.acceptPlatformInvitation,
    requestRecovery: platform.requestPlatformRecovery,
    confirmRecovery: platform.confirmPlatformRecovery,
    signOut: platform.signOutPlatform,
    revalidate: platform.revalidatePlatformSession,
  };
}

export type CredentialMode = "login" | "invitation" | "recovery" | "reset";
