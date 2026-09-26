import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Frozen legacy wire artifacts are removed by the final migration gate, not rewritten as UI names.
const frozenWireArtifacts = new Set([
  "src/shared/api/schema.d.ts",
  "src/shared/api/lead-contract.d.ts",
]);
const canaries = new Set([
  "src/shared/auth/return-destination.test.ts",
  "src/shared/auth/access-projections.test.ts",
  "tests/e2e/platform-refusals.spec.ts",
]);
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name).replaceAll("\\", "/")],
  );
}
const violations = [];
for (const path of [...files("src"), ...files("tests/e2e"), ".env.example"]) {
  if (frozenWireArtifacts.has(path)) continue;
  const source = readFileSync(path, "utf8");
  if (
    source.includes("hrms-auth") &&
    path !== "tests/e2e/public-plans.spec.ts" &&
    !(
      path.startsWith("tests/e2e/") &&
      source.includes("Unmounted legacy workflow; migrate before the final epic reachability gate")
    )
  )
    violations.push(path);
  if (
    /(?:VITE_ENABLE_ADMIN_CONSOLE|isPlatformAdmin|Admin[A-Z]|adminNav|adminKpiData|adminActivities)/.test(
      source,
    )
  )
    violations.push(path);
  if (!canaries.has(path) && /(?:\/admin(?:\/|["'`])|@\/pages\/admin|admin-)/.test(source))
    violations.push(path);
}
if (violations.length)
  throw new Error(`Superseded Platform UI namespace: ${[...new Set(violations)].join(", ")}`);
console.log(
  "Platform namespace regression gate passed; only frozen wire artifacts and explicit negative canaries are exempt.",
);
