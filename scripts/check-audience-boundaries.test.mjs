import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertNoRetiredBundleMarkers } from "./check-audience-boundaries.mjs";

const directories = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function assets(source) {
  const directory = mkdtempSync(join(tmpdir(), "hrms-bundle-gate-"));
  directories.push(directory);
  writeFileSync(join(directory, "platform-lazy.js"), source);
  return directory;
}
describe("production retired surface gate", () => {
  it("checks a lazy authenticated chunk, not only the public entry", () => {
    expect(() => assertNoRetiredBundleMarkers(assets('fetch("/api/v1/users")'))).toThrow(
      "platform-lazy.js",
    );
  });
  it.each([
    "hrms-auth",
    "hrms-prefs",
    "isPlatformAdmin",
    "generated/internal",
  ])("rejects emitted %s", (marker) => {
    expect(() => assertNoRetiredBundleMarkers(assets(`const value = "${marker}"`))).toThrow(
      "retired runtime",
    );
  });
  it("preserves supported audience operations and historical wire event constants", () => {
    expect(() =>
      assertNoRetiredBundleMarkers(
        assets(
          '"GET /api/v1/platform/users"; "GET /api/v1/company/users"; "platform_admin.session.started";',
        ),
      ),
    ).not.toThrow();
  });
});
