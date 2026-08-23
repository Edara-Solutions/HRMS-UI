// @vitest-environment node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const contractsDir = join(here, "..", "..", "..", "contracts");

const readContract = (name: string): string => readFileSync(join(contractsDir, name), "utf-8");

describe("vendored OpenAPI contract", () => {
  it("records a valid producing backend commit", () => {
    const commit = readContract("PRODUCING_COMMIT").trim();
    expect(commit).toMatch(/^[0-9a-f]{40}$/);
  });

  // `openapi:check` owns the well-formedness rule; this only pins that a branch was recorded.
  it("records the backend branch the snapshot tracks, not a detached HEAD", () => {
    const ref = readContract("PRODUCING_REF").trim();
    expect(ref).not.toBe("");
    expect(ref).not.toBe("HEAD");
  });

  it("exposes both Audit Trail canonical routes the Admin Portal depends on", () => {
    const doc = JSON.parse(readContract("openapi.json")) as {
      paths: Record<string, unknown>;
    };
    expect(doc.paths).toHaveProperty("/api/v1/platform/audit-trail");
    expect(doc.paths).toHaveProperty("/api/v1/company/audit-trail");
  });

  it("locks the ErrorEnvelope wire form without the legacy `error` field", () => {
    const doc = JSON.parse(readContract("openapi.json")) as {
      components: {
        schemas: Record<string, { required?: string[]; properties?: Record<string, unknown> }>;
      };
    };
    const envelope = doc.components.schemas.ErrorEnvelope;
    expect(envelope).toBeDefined();
    expect(envelope.required).not.toContain("error");
    expect(envelope.properties).not.toHaveProperty("error");
    expect(envelope.required).toContain("detail");
  });
});
