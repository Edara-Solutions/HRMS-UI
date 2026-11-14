import { beforeEach, describe, expect, it, vi } from "vitest";
import { groupPersonas, type Persona, personaForCompanyUser, personas } from "./personas";

const auth = vi.hoisted(() => {
  class FakeRefusal extends Error {
    constructor(readonly status: number) {
      super("refused");
    }
  }
  return {
    FakeRefusal,
    signInPlatform: vi.fn(),
    signOutPlatform: vi.fn(),
    signInCompany: vi.fn(),
    signOutCompany: vi.fn(),
    loginPlatform: vi.fn(),
    loginCompany: vi.fn(),
  };
});

vi.mock("@/shared/api", () => ({
  OperationRefusal: auth.FakeRefusal,
  loginPlatform: auth.loginPlatform,
  loginCompany: auth.loginCompany,
}));
vi.mock("@/shared/platform-auth", () => ({
  signInPlatform: auth.signInPlatform,
  signOutPlatform: auth.signOutPlatform,
}));
vi.mock("@/shared/company-auth", () => ({
  signInCompany: auth.signInCompany,
  signOutCompany: auth.signOutCompany,
}));

const { lastPersonaKeys, switchPersona } = await import("./switch-persona");

function persona(key: string): Persona {
  const found = personas.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`Unknown persona ${key}`);
  return found;
}

describe("switchPersona", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    auth.signOutPlatform.mockResolvedValue({ remoteConfirmed: true });
    auth.signOutCompany.mockResolvedValue({ remoteConfirmed: true });
  });

  it("signs a Company persona in through the Company login and remembers it", async () => {
    auth.signInCompany.mockResolvedValue(undefined);

    await expect(switchPersona(persona("company-admin"))).resolves.toEqual({ kind: "signed-in" });
    expect(auth.signOutCompany).toHaveBeenCalledOnce();
    expect(auth.signInCompany).toHaveBeenCalledWith(
      expect.objectContaining({ companyCode: "SDCO001", employeeCode: "SDCO001EMP02" }),
    );
    expect(auth.signInPlatform).not.toHaveBeenCalled();
    expect(lastPersonaKeys().has("company-admin")).toBe(true);
  });

  it("reports drift with the reseed hint when an allowed persona's credentials are refused", async () => {
    auth.signInPlatform.mockRejectedValue(new auth.FakeRefusal(401));

    const outcome = await switchPersona(persona("platform-support-agent"));

    expect(outcome.kind).toBe("drift");
    expect(outcome.kind === "drift" && outcome.detail).toContain("db:seed:reset");
    expect(lastPersonaKeys().size).toBe(0);
  });

  it("does not blame the seed when the backend is unreachable", async () => {
    auth.signInPlatform.mockRejectedValue(new TypeError("Failed to fetch"));

    const outcome = await switchPersona(persona("platform-auditor"));

    expect(outcome.kind).toBe("unavailable");
    expect(outcome.kind === "unavailable" && outcome.detail).not.toContain("db:seed:reset");
  });

  it("probes a refused persona without touching the signed-in sessions", async () => {
    auth.loginCompany.mockRejectedValue(new auth.FakeRefusal(401));

    await expect(switchPersona(persona("company-suspended-user"))).resolves.toEqual({
      kind: "refused-as-expected",
    });
    expect(auth.signOutCompany).not.toHaveBeenCalled();
    expect(auth.signInCompany).not.toHaveBeenCalled();
  });

  it("reports drift when a refused persona signs in", async () => {
    auth.loginPlatform.mockResolvedValue({});

    const outcome = await switchPersona(persona("platform-pending-invitee"));

    expect(outcome.kind).toBe("drift");
  });
});

describe("personas", () => {
  it("have unique keys and keep each group together", () => {
    expect(new Set(personas.map(({ key }) => key)).size).toBe(personas.length);
    expect(groupPersonas(personas).flatMap(([, members]) => members)).toHaveLength(personas.length);
  });

  it("resolve a Company session to its persona by company and employee code", () => {
    expect(personaForCompanyUser("SDCO010", "SDCO010EMP01")?.key).toBe("company-owner-closed");
    expect(personaForCompanyUser("SDCO001", "SDCO001EMP99")).toBeUndefined();
  });
});
