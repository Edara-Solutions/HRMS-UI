// Every artifact generated from contracts/openapi.json, paired with the package
// script that regenerates it. `openapi:check` walks this list, so a new generator
// is covered by the drift gate the moment it is registered here.

import { join } from "node:path";
import { contractsDir, frontendRoot } from "./contract-provenance.mjs";

/** The two artifacts derived from the Audit Trail label key set. */
export const auditLabelArtifacts = {
  manifestPath: join(contractsDir, "audit-label-keys.json"),
  enumFieldsPath: join(
    frontendRoot,
    "src",
    "widgets",
    "audit-detail",
    "model",
    "audit-enum-fields.ts",
  ),
};

/** The Audit Event metadata table scripts/generate-audit-catalog.mjs renders. */
export const auditCatalogArtifact = {
  metadataPath: join(frontendRoot, "src", "shared", "audit-catalog", "audit-event-catalog.ts"),
};

/** Each generated artifact, paired with the package script that reproduces it. */
export const derivedArtifacts = [
  {
    generator: "openapi:audiences",
    outputs: [join(contractsDir, "provenance.json")],
  },
  {
    generator: "audit:labels",
    outputs: [auditLabelArtifacts.manifestPath, auditLabelArtifacts.enumFieldsPath],
  },
  {
    generator: "audit:catalog",
    outputs: [auditCatalogArtifact.metadataPath],
  },
];
