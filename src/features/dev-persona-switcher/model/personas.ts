export type Audience = "platform" | "company";

type SignInExpectation = "allowed" | "refused";

interface PlatformPersona {
  readonly audience: "platform";
  readonly key: string;
  readonly label: string;
  readonly group: string;
  readonly email: string;
  readonly signIn: SignInExpectation;
}

interface CompanyPersona {
  readonly audience: "company";
  readonly key: string;
  readonly label: string;
  readonly group: string;
  readonly companyCode: string;
  readonly employeeCode: string;
  readonly signIn: SignInExpectation;
}

export type Persona = PlatformPersona | CompanyPersona;

export const PLATFORM_PERSONA_PASSWORD = "PlatformAdmin@2026";
export const COMPANY_PERSONA_PASSWORD = "SeedP@ssw0rd123";

function platformPersona(
  key: string,
  label: string,
  email: string,
  signIn: SignInExpectation = "allowed",
): PlatformPersona {
  return { audience: "platform", key, label, group: "Platform", email, signIn };
}

function companyPersonas(
  group: string,
  companyCode: string,
  members: ReadonlyArray<{
    key: string;
    label: string;
    employee: number;
    signIn?: SignInExpectation;
  }>,
): CompanyPersona[] {
  return members.map(({ key, label, employee, signIn = "allowed" }) => ({
    audience: "company",
    key,
    label,
    group,
    companyCode,
    employeeCode: `${companyCode}EMP${String(employee).padStart(2, "0")}`,
    signIn,
  }));
}

export const personas: readonly Persona[] = [
  platformPersona("platform-super-admin", "Super Administrator", "platform.admin@seed.edara.local"),
  platformPersona("platform-support-agent", "Support Agent", "support.agent@seed.edara.local"),
  platformPersona("platform-billing-sales", "Billing & Sales", "billing.sales@seed.edara.local"),
  platformPersona("platform-auditor", "Read-only Auditor", "auditor@seed.edara.local"),
  platformPersona(
    "platform-pending-invitee",
    "Pending invitee",
    "pending.invitee@seed.edara.local",
    "refused",
  ),
  ...companyPersonas("Acme Industries · Active", "SDCO001", [
    { key: "company-owner", label: "Owner", employee: 1 },
    { key: "company-admin", label: "Admin", employee: 2 },
    { key: "company-manager", label: "Manager", employee: 3 },
    { key: "company-employee", label: "Employee", employee: 4 },
    { key: "company-suspended-user", label: "Suspended User", employee: 10, signIn: "refused" },
  ]),
  ...companyPersonas("Abu Dhabi Ventures · Onboarding, trial", "SDCO007", [
    { key: "company-owner-onboarding", label: "Owner", employee: 1 },
  ]),
  ...companyPersonas("Alexandria Trading · Suspended, frozen", "SDCO008", [
    { key: "company-owner-suspended", label: "Owner", employee: 1 },
  ]),
  ...companyPersonas("Doha Capital · Blocked access", "SDCO009", [
    { key: "company-owner-blocked", label: "Owner", employee: 1 },
  ]),
  ...companyPersonas("Kuwait Bay · Closed, expired", "SDCO010", [
    { key: "company-owner-closed", label: "Owner", employee: 1 },
  ]),
];

export function groupPersonas(list: readonly Persona[]): Array<[string, Persona[]]> {
  const groups = new Map<string, Persona[]>();
  for (const persona of list) {
    groups.set(persona.group, [...(groups.get(persona.group) ?? []), persona]);
  }
  return [...groups.entries()];
}

export function personaForPlatformUser(email: string): Persona | undefined {
  return personas.find(
    (persona) =>
      persona.audience === "platform" && persona.email.toLowerCase() === email.toLowerCase(),
  );
}

export function personaForCompanyUser(
  companyCode: string,
  employeeCode: string,
): Persona | undefined {
  return personas.find(
    (persona) =>
      persona.audience === "company" &&
      persona.companyCode === companyCode &&
      persona.employeeCode === employeeCode,
  );
}
