import { loginCompany, loginPlatform, OperationRefusal } from "@/shared/api";
import { signInCompany, signOutCompany } from "@/shared/company-auth";
import { signInPlatform, signOutPlatform } from "@/shared/platform-auth";
import {
  type Audience,
  COMPANY_PERSONA_PASSWORD,
  type Persona,
  PLATFORM_PERSONA_PASSWORD,
} from "./personas";

export type SwitchOutcome =
  | { readonly kind: "signed-in" }
  | { readonly kind: "refused-as-expected" }
  | { readonly kind: "drift"; readonly detail: string }
  | { readonly kind: "unavailable"; readonly detail: string };

const LAST_PERSONA_BY_AUDIENCE_KEY = "hrms-dev-persona:v1";
const RESEED_HINT = "Run pnpm run db:seed:reset in backend/.";

type PlatformCredentials = Parameters<typeof loginPlatform>[0];
type CompanyCredentials = Parameters<typeof loginCompany>[0];

function credentialsOf(
  persona: Persona,
):
  | { readonly audience: "platform"; readonly body: PlatformCredentials }
  | { readonly audience: "company"; readonly body: CompanyCredentials } {
  return persona.audience === "platform"
    ? {
        audience: "platform",
        body: { email: persona.email, password: PLATFORM_PERSONA_PASSWORD, clientType: "web" },
      }
    : {
        audience: "company",
        body: {
          companyCode: persona.companyCode,
          employeeCode: persona.employeeCode,
          password: COMPANY_PERSONA_PASSWORD,
          clientType: "web",
        },
      };
}

function isCredentialRefusal(error: unknown): boolean {
  return error instanceof OperationRefusal && (error.status === 401 || error.status === 403);
}

function unavailable(error: unknown): SwitchOutcome {
  const status = error instanceof OperationRefusal ? ` (HTTP ${error.status})` : "";
  return {
    kind: "unavailable",
    detail: `Sign-in could not be attempted${status}. Check that the backend is running at VITE_API_BASE_URL.`,
  };
}

async function probeRefusedPersona(persona: Persona): Promise<SwitchOutcome> {
  try {
    const credentials = credentialsOf(persona);
    if (credentials.audience === "platform") await loginPlatform(credentials.body);
    else await loginCompany(credentials.body);
  } catch (error) {
    return isCredentialRefusal(error) ? { kind: "refused-as-expected" } : unavailable(error);
  }
  return {
    kind: "drift",
    detail: `Persona ${persona.key} was expected to be refused but signed in. ${RESEED_HINT}`,
  };
}

async function signInAs(persona: Persona): Promise<void> {
  const credentials = credentialsOf(persona);
  if (credentials.audience === "platform") {
    await signOutPlatform();
    await signInPlatform(credentials.body);
    return;
  }
  await signOutCompany();
  await signInCompany(credentials.body);
}

export async function switchPersona(persona: Persona): Promise<SwitchOutcome> {
  if (persona.signIn === "refused") return probeRefusedPersona(persona);
  try {
    await signInAs(persona);
  } catch (error) {
    if (!isCredentialRefusal(error)) return unavailable(error);
    return {
      kind: "drift",
      detail: `Persona ${persona.key} is not in the database or its password differs. ${RESEED_HINT}`,
    };
  }
  rememberPersona(persona);
  return { kind: "signed-in" };
}

export async function signOutAllTiers(): Promise<void> {
  await Promise.all([signOutPlatform(), signOutCompany()]);
}

type RememberedPersonas = Partial<Record<Audience, string>>;

function readRemembered(): RememberedPersonas {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LAST_PERSONA_BY_AUDIENCE_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return {};
    const platform: unknown = Reflect.get(parsed, "platform");
    const company: unknown = Reflect.get(parsed, "company");
    return {
      ...(typeof platform === "string" ? { platform } : {}),
      ...(typeof company === "string" ? { company } : {}),
    };
  } catch {
    return {};
  }
}

function rememberPersona(persona: Persona): void {
  try {
    localStorage.setItem(
      LAST_PERSONA_BY_AUDIENCE_KEY,
      JSON.stringify({ ...readRemembered(), [persona.audience]: persona.key }),
    );
  } catch {
    return;
  }
}

export function lastPersonaKeys(): ReadonlySet<string> {
  return new Set(Object.values(readRemembered()));
}
