import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Historical backend event keys remain wire constants, never UI identities.
const historicalEvents = new Set([
  "platform_admin.session.started",
  "platform_admin.session.ended",
  "platform_admin.session.revoked",
  "platform_admin.session.refreshed",
  "platform_admin.credential.password_changed",
  "platform_admin.credential.reset_forced",
  "platform_admin.credential.reset_requested",
  "platform_admin.credential.reset_completed",
  "platform_admin.invitation.issued",
  "platform_admin.invitation.accepted",
]);
const wirePaths = new Set([
  "src/shared/api/generated/platform/get-api-v1-platform-audit-trail.ts",
  "src/shared/api/generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-audit-trail.ts",
  "src/shared/audit-catalog/audit-event-catalog.ts",
  "public/locales/en/audit.json",
  "public/locales/ar/audit.json",
]);
const negativeRouteLines = new Map([
  [
    "src/shared/auth/access-projections.test.ts",
    new Set([
      'expect(routeDeclarations.every((route) => !route.path.includes("/admin"))).toBe(true);',
      '"/admin",',
    ]),
  ],
  ["src/shared/auth/return-destination.test.ts", new Set(['"/admin/dashboard",'])],
  ["tests/e2e/platform-refusals.spec.ts", new Set(['"/admin/dashboard",'])],
]);
const retiredFiles = [
  "src/pages/platform/dashboard",
  "src/pages/platform/home",
  "src/pages/platform/company-email-settings",
  "src/shared/api/client.ts",
  "src/shared/api/schema.d.ts",
  "src/shared/api/lead-contract.d.ts",
  "src/shared/api/lead-runtime-contract.ts",
  "src/shared/ui/sparkline.tsx",
  "src/shared/charts",
  "scripts/generate-audit-validators.mjs",
  "tests/e2e/platform-company-activation-repairs.spec.ts",
];

export function retiredSurfaceViolations(path, source) {
  const violations = [];
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const report = (reason) => violations.push(`${path}:${index + 1}: ${reason}`);
    if (
      /\b(?:isPlatformAdmin|platformAdminOnly|VITE_ENABLE_ADMIN\w*|apiClient|companyApi|platformApi)\b|hrms-auth|hrms-prefs/.test(
        line,
      )
    )
      report("retired identity, storage or client alias");
    if (
      /\/api\/v1\/(?:auth|admin|companies|users|roles|plans|leads|emails|email-types|email-template-variants|email-template-assignments)(?:[/"'`?]|$)/.test(
        line,
      )
    )
      report("unscoped API namespace");
    if (
      /(?:get|post|put|patch|delete)\(\s*["'`]\/?(?:auth|companies|users|roles|plans|leads|emails)(?:[/"'`?]|$)/.test(
        line,
      )
    )
      report("unscoped client call");
    if (
      /\/admin(?:[/"'`]|$)|@\/pages\/admin/.test(line) &&
      !negativeRouteLines.get(path)?.has(line.trim())
    )
      report("retired route namespace");
    if (path.startsWith("src/") && !/\.test\./.test(path) && /["'`]\/auth(?:[/"'`]|$)/.test(line))
      report("mixed authentication route");
    if (
      /\bPLATFORM_ADMIN\b/.test(line) &&
      !(
        path === "src/pages/company/audit/ui/company-audit-page.test.tsx" &&
        line.trim() === 'renderPage({ items: [event({ kind: "PLATFORM_ADMIN" })] });'
      )
    )
      report("retired actor identity");
    for (const match of line.matchAll(/platform_admin(?:\.[a-z_]+)*/g)) {
      if (
        path === "src/shared/ui/refusal-surface.test.tsx" &&
        line.trim() === "/traceId|publicId|platform_admin|stack|internal-secret/,"
      )
        continue;
      if (!wirePaths.has(path) || !historicalEvents.has(match[0]))
        report(`unreviewed historical identity: ${match[0]}`);
    }
  }
  return violations;
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name).replaceAll("\\", "/")],
  );
}

export function assertRetiredSurfaceRemoved() {
  const restored = retiredFiles.filter(
    (path) => existsSync(path) && (!statSync(path).isDirectory() || files(path).length),
  );
  const violations = [
    ...files("src"),
    ...files("tests/e2e"),
    ...files("public/locales"),
    ".env.example",
    "package.json",
  ].flatMap((path) => retiredSurfaceViolations(path, readFileSync(path, "utf8")));
  if (restored.length || violations.length)
    throw new Error(`Retired surface gate failed:\n${[...restored, ...violations].join("\n")}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertRetiredSurfaceRemoved();
  console.log("Retired route, API, identity, storage and artifact scan passed.");
}
