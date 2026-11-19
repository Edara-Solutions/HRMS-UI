import { describe, expect, it } from "vitest";
import { assertOperationLedger } from "./check-operation-reachability.mjs";

const key = "GET /api/v1/company/users";
const consumer = "src/pages/company/users/api/users.ts";
const entry = { key, audience: "company", consumers: [consumer] };
const mounted = new Set([consumer]);

describe("exact operation ownership gate", () => {
  it("accepts a mounted request consumer and the single operational health exception", () => {
    const health = { key: "GET /health", audience: "public", consumers: [] };
    expect(() =>
      assertOperationLedger(
        [entry, health],
        [entry, { ...health, headless: true, reason: "Health probe" }],
        mounted,
      ),
    ).not.toThrow();
  });
  it("rejects an import with no request consumer", () => {
    expect(() => assertOperationLedger([{ ...entry, consumers: [] }], [entry], mounted)).toThrow(
      "no request consumer",
    );
  });
  it("rejects an unmounted request file", () => {
    expect(() => assertOperationLedger([entry], [entry], new Set())).toThrow("not mounted");
  });
  it("rejects silent inventory, audience and ownership drift", () => {
    expect(() => assertOperationLedger([entry], [], mounted)).toThrow("inventory changed");
    expect(() =>
      assertOperationLedger([entry], [{ ...entry, audience: "platform" }], mounted),
    ).toThrow("audience assignment");
    expect(() =>
      assertOperationLedger([entry], [{ ...entry, consumers: ["src/shared/unused.ts"] }], mounted),
    ).toThrow("ownership changed");
    expect(() => assertOperationLedger([entry], [entry, entry], mounted)).toThrow("Duplicate");
  });
  it("refuses to hide an unimplemented operation as headless", () => {
    expect(() =>
      assertOperationLedger(
        [{ ...entry, consumers: [] }],
        [{ ...entry, headless: true, reason: "Not implemented" }],
        mounted,
      ),
    ).toThrow("Unapproved headless");
  });
  it("rejects a Company consumer in the Platform portal", () => {
    const foreign = { ...entry, consumers: ["src/pages/platform/users/api/users.ts"] };
    expect(() => assertOperationLedger([foreign], [foreign], new Set(foreign.consumers))).toThrow(
      "Company operation in Platform",
    );
  });
  it.each(["platform", "delegated"])("rejects a %s operation in the Company portal", (audience) => {
    const foreign = { ...entry, audience };
    expect(() => assertOperationLedger([foreign], [foreign], mounted)).toThrow(
      "Platform operation in Company",
    );
  });
});
