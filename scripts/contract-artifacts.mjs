// Every artifact generated from contracts/openapi.json, paired with the package
// script that regenerates it. `openapi:check` walks this list, so a new generator
// is covered by the drift gate the moment it is registered here.

import { join } from "node:path";
import { frontendRoot } from "./contract-provenance.mjs";

function auditApiPath(portal) {
  return join(frontendRoot, "src", "pages", portal, "audit", "api", "audit-runtime-contract.ts");
}

/** The two Audit Trail runtime contracts scripts/generate-audit-validators.mjs renders. */
export const auditRuntimeContracts = [
  {
    schemaName: "PlatformAuditTrailPage",
    eventName: "PlatformAuditTrailEvent",
    itemName: "PlatformAuditTrailItem",
    unrecognizedName: "UnrecognizedPlatformAuditTrailEvent",
    envelopeName: "platformAuditTrailPageEnvelopeSchema",
    parserName: "parsePlatformAuditTrailPage",
    itemParserName: "parsePlatformAuditTrailItem",
    outputPath: auditApiPath("admin"),
  },
  {
    schemaName: "CompanyAuditTrailPage",
    eventName: "CompanyAuditTrailEvent",
    itemName: "CompanyAuditTrailItem",
    unrecognizedName: "UnrecognizedCompanyAuditTrailEvent",
    envelopeName: "companyAuditTrailPageEnvelopeSchema",
    parserName: "parseCompanyAuditTrailPage",
    itemParserName: "parseCompanyAuditTrailItem",
    rationale:
      "Company projections intentionally omit Platform Admin identifiers so company readers only learn that Edara acted.",
    outputPath: auditApiPath("company"),
  },
];

/** Each generated artifact, paired with the package script that reproduces it. */
export const derivedArtifacts = [
  {
    generator: "openapi:types",
    outputs: [join(frontendRoot, "src", "shared", "api", "schema.d.ts")],
  },
  {
    generator: "audit:validators",
    outputs: auditRuntimeContracts.map(({ outputPath }) => outputPath),
  },
];
