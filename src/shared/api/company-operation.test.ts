// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

import { useCompanySession } from "@/shared/auth";
import { companySessionFixture } from "../../test/audience-fixtures";
import { json, stubNetwork } from "../../test/network-fixtures";
import {
  CompanySessionChanged,
  companyQueryKey,
  companyReadQuery,
  requestCompanyOperation,
} from "./company-operation";
import { companyOrganizationOperations as operations } from "./company-operations";
import { ContractViolation } from "./generated/runtime";

const registry = {
  publicId: "8a9c1c8e-6a51-4c5f-9f0d-8b6b5d1b2c3d",
  companyCode: "EDARA",
  name: "Edara Labs",
  logo: null,
  website: null,
  country: "EG",
  lifecycleStatus: "ONBOARDING",
  activatedAt: null,
};

beforeEach(() => useCompanySession.getState().setSession(companySessionFixture()));
afterEach(() => {
  useCompanySession.getState().clearSession();
});

describe("session-scoped Company operations", () => {
  it("reads through the Company client with the session token and no Company identifier", async () => {
    const requests = stubNetwork({ "GET /api/v1/company/registry": () => json(registry) });
    await expect(requestCompanyOperation(operations.registry, {})).resolves.toEqual(registry);
    expect(requests).toEqual([
      {
        key: "GET /api/v1/company/registry",
        authorization: "Bearer access-canary",
        body: undefined,
      },
    ]);
  });

  it("roots cache keys at audience and identity, never at a token or Company ID", () => {
    const user = companySessionFixture().user;
    const key = companyReadQuery(user.publicId, operations.registry).queryKey;
    expect(key).toEqual(["company", user.publicId, "GET /api/v1/company/registry"]);
    expect(JSON.stringify(key)).not.toMatch(/access-canary|refresh-canary/);
    expect(JSON.stringify(key)).not.toContain(user.companyPublicId);
    expect(companyQueryKey("other-user", operations.registry)).not.toEqual(key);
  });

  it("drops a response that settles after the identity was replaced", async () => {
    stubNetwork({
      "GET /api/v1/company/registry": () => {
        useCompanySession
          .getState()
          .setSession(companySessionFixture({ publicId: "5c7f0f4e-2b5d-4d51-9a55-0d3b1f6a7c21" }));
        return json(registry);
      },
    });
    await expect(requestCompanyOperation(operations.registry, {})).rejects.toBeInstanceOf(
      CompanySessionChanged,
    );
  });

  it("refuses to send without a live session", async () => {
    useCompanySession.getState().clearSession();
    const requests = stubNetwork({});
    await expect(requestCompanyOperation(operations.registry, {})).rejects.toBeInstanceOf(
      CompanySessionChanged,
    );
    expect(requests).toEqual([]);
  });

  it("rejects an undeclared field as a contract violation instead of rendering it", async () => {
    stubNetwork({
      "GET /api/v1/company/registry": () => json({ ...registry, internalId: 7 }),
    });
    await expect(requestCompanyOperation(operations.registry, {})).rejects.toBeInstanceOf(
      ContractViolation,
    );
  });
});
