// Emits the Audit Event metadata table the Admin Portal reads, from the vendored contract.
// Generated rather than authored: the catalog semantics live in the backend definitions and
// reach the frontend through the annotations on each response arm, so nothing here can rot.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  collectAuditCatalogMetadata,
  renderAuditCatalogMetadata,
} from "./audit-catalog-metadata.mjs";
import { auditCatalogArtifact } from "./contract-artifacts.mjs";
import { frontendRoot } from "./contract-provenance.mjs";

const { metadataPath } = auditCatalogArtifact;

writeFileSync(metadataPath, renderAuditCatalogMetadata(collectAuditCatalogMetadata()), "utf-8");

execFileSync(process.execPath, ["x", "biome", "format", "--write", metadataPath], {
  cwd: frontendRoot,
  stdio: "inherit",
});
